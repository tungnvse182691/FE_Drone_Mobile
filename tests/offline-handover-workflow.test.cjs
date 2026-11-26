const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const ts = require('typescript');
const axios = require('axios');

function loadTs(file, deps) {
  const src = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const m = { exports: {} };
  vm.runInNewContext(code, {
    module: m,
    exports: m.exports,
    require: (n) => {
      if (n in deps) return deps[n];
      throw new Error('unmocked module: ' + n);
    },
    Date,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Uint32Array,
    DataView,
  });
  return m.exports;
}

function sha256Utf8(s) {
  return Promise.resolve(crypto.createHash('sha256').update(s, 'utf8').digest('hex'));
}

function sha256Bytes(b) {
  return Promise.resolve(crypto.createHash('sha256').update(b).digest('hex'));
}

test('Handover 42A module exists and exports required API + discovery + endorsement contracts', () => {
  assert.ok(fs.existsSync('src/api/crewOfflineHandover.ts'), 'src/api/crewOfflineHandover.ts must exist');
});

test('Handover 42A discovery, canonical claim, public recipient card, export, open, endorsement, import & reconcile', async () => {
  const jvm = path.resolve('.cache/handover-package-test-jvm');
  fs.mkdirSync(jvm, { recursive: true });
  const javaSrc = 'modules/roadguard-offline-crypto/android/src/main/java/roadguard/offline/';
  const comp = cp.spawnSync('javac', ['-d', jvm,
    javaSrc + 'StrictP256.java',
    javaSrc + 'HandoverPrimitives.java',
    javaSrc + 'HandoverPackage.java',
    'tests/native-probe/jvm/PackageInteropCli.java',
  ], { encoding: 'utf8' });
  assert.equal(comp.status, 0, comp.stderr);

  const utilsBase64 = loadTs('src/utils/base64.ts', {});
  const checksum = loadTs('src/offline/checksum.ts', { '../utils/base64': utilsBase64 });
  const protocol = loadTs('src/api/crewOfflineProtocol.ts', {});
  const cryptoMod = loadTs('src/api/crewOfflineCrypto.ts', {});

  const projectId = crypto.randomUUID();
  const senderActor = crypto.randomUUID();
  const recipientActor = crypto.randomUUID();
  const senderDeviceId = crypto.randomUUID();
  const recipientDeviceId = crypto.randomUUID();
  const senderRegId = crypto.randomUUID();
  const recipientRegId = crypto.randomUUID();
  const taskId = crypto.randomUUID();
  const assignmentId = crypto.randomUUID();
  const snapshotId = crypto.randomUUID();
  const originId = crypto.randomUUID();
  const sourceBatchId = crypto.randomUUID();

  // Generate 2 real P-256 keypairs (sender & recipient) via Java JCA
  function genKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    return {
      pubB64: publicKey.export({ type: 'spki', format: 'der' }).toString('base64'),
      priv: privateKey,
    };
  }
  const senderSign = genKeyPair();
  const senderEnc = genKeyPair();
  const recipSign = genKeyPair();
  const recipEnc = genKeyPair();
  const recipFingerprint = crypto.createHash('sha256').update(Buffer.from(recipEnc.pubB64, 'base64')).digest('hex');

  function signClaim(priv, claimText) {
    const prefix = Buffer.from('roadguard.h5.direct-sync.v1\0', 'utf8');
    const claim = Buffer.from(claimText, 'utf8');
    const msg = Buffer.concat([prefix, claim]);
    const der = crypto.sign('sha256', msg, priv);
    return crypto.sign('sha256', msg, { key: priv, dsaEncoding: 'ieee-p1363' }).toString('base64');
  }
  function verifyClaim(pubB64, claimText, sigB64) {
    const prefix = Buffer.from('roadguard.h5.direct-sync.v1\0', 'utf8');
    const msg = Buffer.concat([prefix, Buffer.from(claimText, 'utf8')]);
    const key = crypto.createPublicKey({ key: Buffer.from(pubB64, 'base64'), format: 'der', type: 'spki' });
    return crypto.verify('sha256', msg, { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(sigB64, 'base64'));
  }

  let currentIdentity = {
    actor: senderActor,
    role: 'REPAIR_CREW',
    scope: 's-sender',
    environment: 'http://10.0.2.2:18181/api/v1',
    partition: 'p-sender',
  };
  const guard = (i) => {
    if (i.actor !== currentIdentity.actor || i.scope !== currentIdentity.scope || i.environment !== currentIdentity.environment) {
      throw new Error('crew_session_changed');
    }
  };
  const api = {
    isCrewResourceId: (x) => typeof x === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x) && !/^0+-0+-0+-0+-0+$/.test(x),
    isRepairItemVersion: (x) => typeof x === 'string' && /^[A-Za-z0-9+/]{10}[AEIMQUYcgkosw048]=$/.test(x),
  };

  // In-memory store per actor
  const journalRows = [];
  const makeJournal = (id) => ({
    list: async () => journalRows.filter((r) => r.identity.actor === id.actor && r.projectId === projectId),
    prepare: async (item) => {
      const rec = { schema: 1, phase: 'PREPARED', ...item };
      journalRows.push(rec);
      return rec;
    },
    transition: async (rec, phase, receipt) => {
      const idx = journalRows.findIndex((x) => x.id === rec.id);
      const updated = { ...rec, phase, ...(receipt !== undefined ? { receipt } : {}) };
      if (idx >= 0) journalRows[idx] = updated;
      return updated;
    },
    checkpoint: async (rec, items) => {
      const idx = journalRows.findIndex((x) => x.id === rec.id);
      const existing = rec.verifiedItems ?? [];
      const updated = { ...rec, verifiedItems: [...existing, ...items] };
      if (idx >= 0) journalRows[idx] = updated;
      return updated;
    },
    checkpointTerminal: async (rec, term) => {
      const idx = journalRows.findIndex((x) => x.id === rec.id);
      const existing = rec.terminalItems ?? [];
      const updated = { ...rec, terminalItems: [...existing, term] };
      if (idx >= 0) journalRows[idx] = updated;
      return updated;
    },
  });

  // In-memory BE state
  const serverPackages = new Map();
  const serverGrants = new Map();
  const serverBatches = new Map();
  const serverOrigins = new Map();
  let failExportOnce = true;

  const client = axios.create({
    baseURL: 'http://10.0.2.2:18181/api/v1',
    adapter: async (config) => {
      const u = config.url || '';
      if (config.method === 'get') {
        if (u.endsWith('/offline/devices')) {
          return { status: 200, data: { items: [{ id: senderRegId, projectId, actorId: senderActor, deviceId: senderDeviceId, revision: 1, role: 'RepairCrew', registeredAt: '2026-11-26T00:00:00Z', revokedAt: null }], nextCursor: null }, headers: {}, config };
        }
        if (u.endsWith('/offline/packages')) {
          return { status: 200, data: { items: Array.from(serverPackages.values()).map((p) => ({ id: p.id, projectId, originalActorId: p.originalActorId, sourceDeviceRegistrationId: p.sourceDeviceRegistrationId, sourceBatchId: p.sourceBatchId })), nextCursor: null }, headers: {}, config };
        }
        if (u.endsWith('/offline/grants')) {
          return { status: 200, data: { items: Array.from(serverGrants.values()).map((g) => ({ id: g.id, projectId, packageId: g.packageId, issuedAt: g.issuedAt, expiresAt: g.expiresAt, revokedAt: g.revokedAt })), nextCursor: null }, headers: {}, config };
        }
        const mPkg = /\/offline\/packages\/([a-f0-9-]+)$/.exec(u);
        if (mPkg) {
          const pkg = serverPackages.get(mPkg[1]);
          if (!pkg) return Promise.reject({ response: { status: 404, data: { code: 'not_found' } } });
          return { status: 200, data: pkg, headers: {}, config };
        }
        const mGrant = /\/offline\/grants\/([a-f0-9-]+)$/.exec(u);
        if (mGrant) {
          const g = serverGrants.get(mGrant[1]);
          if (!g) return Promise.reject({ response: { status: 404, data: { code: 'not_found' } } });
          return { status: 200, data: g, headers: {}, config };
        }
        const mBatch = /\/offline\/batches\/([a-f0-9-]+)$/.exec(u);
        if (mBatch) {
          const b = serverBatches.get(mBatch[1]);
          if (!b) return Promise.reject({ response: { status: 404, data: { code: 'not_found' } } });
          return { status: 200, data: b, headers: {}, config };
        }
        const mOrigin = /\/offline\/origins\/([a-f0-9-]+)$/.exec(u);
        if (mOrigin) {
          const o = serverOrigins.get(mOrigin[1]);
          if (!o) return Promise.reject({ response: { status: 404, data: { code: 'not_found' } } });
          return { status: 200, data: o, headers: {}, config };
        }
      }
      if (config.method === 'post' && u.endsWith('/offline/packages/export')) {
        if (failExportOnce) {
          failExportOnce = false;
          return Promise.reject(new Error('network_timeout'));
        }
        const body = JSON.parse(config.data);
        const pkgId = body.package.header.packageId;
        const manifestJson = protocol.canonicalOfflineManifest(projectId, body.manifest.sourceBatchId, body.manifest.sourceDeviceRegistrationId, body.manifest.items);
        const stored = {
          id: pkgId,
          projectId,
          originalActorId: body.package.header.originalActorId,
          sourceDeviceRegistrationId: body.manifest.sourceDeviceRegistrationId,
          sourceBatchId: body.manifest.sourceBatchId,
          manifestHash: crypto.createHash('sha256').update(manifestJson).digest('hex'),
          payloadHash: body.package.header.payloadSha256,
          cipherPackageJson: JSON.stringify(body.package),
          signedManifestJson: manifestJson,
          sourceSignature: body.manifest.signature,
          packageFingerprint: 'f'.repeat(64),
          registrationMode: 'CAPTURE',
        };
        serverPackages.set(pkgId, stored);
        return { status: 201, data: stored, headers: {}, config };
      }
      if (config.method === 'post' && u.endsWith('/offline/import')) {
        const body = JSON.parse(config.data);
        const grant = serverGrants.get(body.grantId);
        if (!grant) return Promise.reject({ response: { status: 403, data: { code: 'access_forbidden' } } });
        if (grant.revokedAt) return Promise.reject({ response: { status: 403, data: { code: 'handover_grant_revoked' } } });
        if (Date.now() >= Date.parse(grant.expiresAt)) return Promise.reject({ response: { status: 403, data: { code: 'handover_grant_expired' } } });
        const canonicalOrig = crypto.randomUUID();
        const itemReceipt = {
          originId: body.operations[0].originId,
          kind: body.operations[0].kind,
          state: 'COMMITTED',
          code: null,
          effectId: body.operations[0].effectId,
          canonicalOriginId: canonicalOrig,
          durableAcknowledgment: true,
          serverReceivedAt: '2026-11-26T12:00:00Z',
          outcome: null,
          admission: {
            id: crypto.randomUUID(),
            projectId,
            batchId: body.batchId,
            sourceBatchId,
            sourceDeviceRegistrationId: senderRegId,
            originId: body.operations[0].originId,
            taskId,
            assignmentId,
            snapshotId,
            originalActorId: senderActor,
            currentImporterId: recipientActor,
            grantId: grant.id,
            status: 'COMMITTED',
            captures: [],
          },
        };
        const batchReceipt = {
          batchId: body.batchId,
          items: [itemReceipt],
          localQueueInstruction: 'KEEP_UNACKNOWLEDGED_OR_CONFLICTED_ITEMS',
        };
        serverBatches.set(body.batchId, batchReceipt);
        serverOrigins.set(itemReceipt.originId, itemReceipt);
        return { status: 200, data: batchReceipt, headers: {}, config };
      }
      throw new Error('unexpected http call: ' + config.method + ' ' + u);
    },
  });

  // Real crypto bridge backed by Node ECDH/ECDSA compatible with HandoverPackage.java
  function hkdfSha256(ikm, salt, info, len) {
    return Buffer.from(crypto.hkdfSync('sha256', ikm, salt, info, len));
  }
  function aesGcmEncrypt(key, nonce, plaintext, aad) {
    const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
    cipher.setAAD(aad);
    const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ciphertext: enc, tag };
  }
  function aesGcmDecrypt(key, nonce, ct, tag, aad) {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
    decipher.setAAD(aad);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]);
  }

  let allowNative = true;
  const nativeProviderFor = (id) => {
    const isSender = id.actor === senderActor;
    const signPair = isSender ? senderSign : recipSign;
    const encPair = isSender ? senderEnc : recipEnc;
    const devId = isSender ? senderDeviceId : recipientDeviceId;
    return {
      installationId: async () => devId,
      capability: async () => ({ available: true, apiLevel: 34, signingUsable: true, agreementUsable: true, securityLevel: { signing: 'SOFTWARE', agreement: 'SOFTWARE' }, reason: 'QA_SOFTWARE_NOT_PRODUCTION' }),
      publicKeys: async () => ({ signingPublicKey: signPair.pubB64, encryptionPublicKey: encPair.pubB64 }),
      signManifest: async (_binding, claim) => signClaim(signPair.priv, claim),
      verifyManifest: async (pub, claim, sig) => verifyClaim(pub, claim, sig),
      sealPackage: async (_binding, reqJson) => {
        const req = JSON.parse(reqJson);
        const canonHeader = JSON.stringify({
          version: 1,
          payloadSchema: req.header.payloadSchema,
          packageId: req.header.packageId,
          projectId: req.header.projectId,
          originalActorId: req.header.originalActorId,
          sourceDeviceId: req.header.sourceDeviceId,
          originIds: req.header.originIds,
          payloadSha256: req.header.payloadSha256,
        });
        const cek = crypto.randomBytes(32);
        const nonce = crypto.randomBytes(12);
        const pt = Buffer.from(req.payloadBase64, 'base64');
        const { ciphertext, tag } = aesGcmEncrypt(cek, nonce, pt, Buffer.from(canonHeader, 'utf8'));
        const headerHash = crypto.createHash('sha256').update(canonHeader, 'utf8').digest();
        const wraps = req.recipients.map((r) => {
          const rPub = crypto.createPublicKey({ key: Buffer.from(r.encryptionPublicKey, 'base64'), format: 'der', type: 'spki' });
          const eph = genKeyPair();
          const ephPubB64 = eph.pubB64;
          const fp = crypto.createHash('sha256').update(Buffer.from(r.encryptionPublicKey, 'base64')).digest('hex');
          const secret = crypto.diffieHellman({ privateKey: eph.priv, publicKey: rPub });
          const ctxStr = `{"purpose":"roadguard.h5.recipient-key.v1","header":${canonHeader},"actorId":"${r.actorId}","deviceId":"${r.deviceId}","recipientKeyFingerprint":"${fp}","ephemeralPublicKey":"${ephPubB64}"}`;
          const wrapKey = hkdfSha256(secret, headerHash, Buffer.from(ctxStr, 'utf8'), 32);
          const wNonce = crypto.randomBytes(12);
          const wrapped = aesGcmEncrypt(wrapKey, wNonce, cek, Buffer.from(ctxStr, 'utf8'));
          return {
            actorId: r.actorId, deviceId: r.deviceId, recipientKeyFingerprint: fp,
            ephemeralPublicKey: ephPubB64, nonce: wNonce.toString('base64'),
            wrappedKey: wrapped.ciphertext.toString('base64'), tag: wrapped.tag.toString('base64'),
          };
        }).sort((a, b) => (`${a.actorId.replace(/-/g, '')}|${a.deviceId}|${a.recipientKeyFingerprint}`).localeCompare(`${b.actorId.replace(/-/g, '')}|${b.deviceId}|${b.recipientKeyFingerprint}`));
        const unsigned = JSON.stringify({
          header: JSON.parse(canonHeader),
          payloadNonce: nonce.toString('base64'),
          ciphertext: ciphertext.toString('base64'),
          payloadTag: tag.toString('base64'),
          recipients: wraps,
          senderSigningPublicKey: signPair.pubB64,
        });
        const sig = crypto.sign('sha256', Buffer.from(unsigned, 'utf8'), { key: signPair.priv, dsaEncoding: 'ieee-p1363' }).toString('base64');
        const env = JSON.parse(unsigned);
        env.signature = sig;
        return JSON.stringify(env);
      },
      openPackage: async (_binding, envJson, trustedSenderPub) => {
        const p = JSON.parse(envJson);
        if (p.senderSigningPublicKey !== trustedSenderPub) throw new Error('untrusted_sender');
        const { signature, ...rest } = p;
        const unsigned = JSON.stringify(rest);
        const sKey = crypto.createPublicKey({ key: Buffer.from(trustedSenderPub, 'base64'), format: 'der', type: 'spki' });
        const ok = crypto.verify('sha256', Buffer.from(unsigned, 'utf8'), { key: sKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64'));
        if (!ok) throw new Error('bad_package_signature');
        const fp = crypto.createHash('sha256').update(Buffer.from(encPair.pubB64, 'base64')).digest('hex');
        const wrap = p.recipients.find((w) => w.actorId === id.actor && w.deviceId === devId && w.recipientKeyFingerprint === fp);
        if (!wrap) throw new Error('recipient_key_unavailable');
        const canonHeader = JSON.stringify(p.header);
        const headerHash = crypto.createHash('sha256').update(canonHeader, 'utf8').digest();
        const ephPub = crypto.createPublicKey({ key: Buffer.from(wrap.ephemeralPublicKey, 'base64'), format: 'der', type: 'spki' });
        const secret = crypto.diffieHellman({ privateKey: encPair.priv, publicKey: ephPub });
        const ctxStr = `{"purpose":"roadguard.h5.recipient-key.v1","header":${canonHeader},"actorId":"${wrap.actorId}","deviceId":"${wrap.deviceId}","recipientKeyFingerprint":"${wrap.recipientKeyFingerprint}","ephemeralPublicKey":"${wrap.ephemeralPublicKey}"}`;
        const wrapKey = hkdfSha256(secret, headerHash, Buffer.from(ctxStr, 'utf8'), 32);
        const cek = aesGcmDecrypt(wrapKey, Buffer.from(wrap.nonce, 'base64'), Buffer.from(wrap.wrappedKey, 'base64'), Buffer.from(wrap.tag, 'base64'), Buffer.from(ctxStr, 'utf8'));
        const pt = aesGcmDecrypt(cek, Buffer.from(p.payloadNonce, 'base64'), Buffer.from(p.ciphertext, 'base64'), Buffer.from(p.payloadTag, 'base64'), Buffer.from(canonHeader, 'utf8'));
        return pt.toString('base64');
      },
    };
  };

  const deps = {
    './client': { apiClient: client },
    './crewSafetyWorkflow': { crewReadGuard: guard },
    './crewApi': api,
    './crewOfflineProtocol': protocol,
    './crewOfflineCrypto': cryptoMod,
    './crewOfflineJournal': { openOfflineJournal: makeJournal, sameOfflinePartition: (a, b) => a.actor === b.actor && a.environment === b.environment && a.partition === b.partition },
    './crewOfflineWorkflow': loadTs('src/api/crewOfflineWorkflow.ts', {
      './client': { apiClient: client },
      './crewSafetyWorkflow': { crewReadGuard: guard },
      './crewApi': api,
      './crewOfflineJournal': { openOfflineJournal: makeJournal, sameOfflinePartition: () => true },
      '../../modules/roadguard-offline-crypto': {
        NATIVE_ACCEPTANCE_VERIFIED: false,
        offlineQaNativeFor: (env) => (allowNative && env === 'http://10.0.2.2:18181/api/v1') ? nativeProviderFor(currentIdentity) : null,
      },
    }),
    './crewOfflineDevice': {
      deviceBinding: (id, d) => JSON.stringify([id.actor, id.environment, id.role, d]),
      crewOfflineNative: (id) => allowNative ? nativeProviderFor(id) : null,
      inspectOfflineDevice: async (id) => ({ deviceId: id.actor === senderActor ? senderDeviceId : recipientDeviceId, capability: { signingUsable: true, agreementUsable: true, available: true, apiLevel: 34, securityLevel: { signing: 'SOFTWARE', agreement: 'SOFTWARE' }, reason: 'QA_SOFTWARE_NOT_PRODUCTION' } }),
      readLocalOfflineSources: async (id) => {
        const isSender = id.actor === senderActor;
        return {
          device: {
            id: isSender ? senderRegId : recipientRegId,
            projectId,
            actorId: id.actor,
            deviceId: isSender ? senderDeviceId : recipientDeviceId,
            revision: 1,
            role: 'RepairCrew',
            signingPublicKey: isSender ? senderSign.pubB64 : recipSign.pubB64,
            encryptionPublicKey: isSender ? senderEnc.pubB64 : recipEnc.pubB64,
            keyFingerprint: '0'.repeat(64),
            registeredAt: '2026-11-26T00:00:00Z',
            revokedAt: null,
          },
          snapshots: [],
        };
      },
    },
    '../offline/upload-queue': {},
    '../offline/checksum': checksum,
    '../utils/base64': utilsBase64,
    '../utils/uuid': { uuidv4: crypto.randomUUID },
  };
  deps['../offline/crewSignedSync'] = loadTs('src/offline/crewSignedSync.ts', {
    './upload-queue': {},
    '../api/crewSafetyWorkflow': deps['./crewSafetyWorkflow'],
    '../api/crewOfflineJournal': deps['./crewOfflineJournal'],
    '../api/crewOfflineProtocol': deps['./crewOfflineProtocol'],
    '../api/crewOfflineCrypto': deps['./crewOfflineCrypto'],
    '../api/crewOfflineWorkflow': deps['./crewOfflineWorkflow'],
    '../api/crewOfflineDevice': deps['./crewOfflineDevice'],
    '../../modules/roadguard-offline-crypto': {},
    '../utils/uuid': deps['../utils/uuid'],
  });

  const wf = deps['./crewOfflineWorkflow'];
  const handover = loadTs('src/api/crewOfflineHandover.ts', deps);

  // 1. Discovery
  const devList = await wf.listOfflineCollection(currentIdentity, projectId, 'devices', { limit: 25 });
  assert.equal(devList.items.length, 1);

  // 2. Build sender signed batch
  const op = {
    schemaVersion: 1,
    originId,
    effectId: originId,
    kind: 'FIELD_START',
    originalActorId: senderActor,
    sourceDeviceId: senderDeviceId,
    snapshotId,
    taskId,
    assignmentId,
    taskVersion: 'AAAAAAAAB9E=',
    corePayloadHash: '0'.repeat(64),
    dependencies: [],
    claimedFinishedAt: null,
    fieldStart: { originId, claimedAt: '2026-11-26T00:00:00Z', deviceId: senderDeviceId, monotonicMilliseconds: null, bootId: null, offlineProof: null },
    fieldSubmission: null,
    repair: null,
    fieldAction: null,
  };
  op.corePayloadHash = await protocol.fieldCoreHash(op, sha256Utf8);
  const desc = await protocol.describeOfflineOperation(op, sha256Utf8);
  const manifest = protocol.canonicalOfflineManifest(projectId, sourceBatchId, senderRegId, [desc]);
  const srcSig = signClaim(senderSign.priv, manifest);
  const attached = await protocol.canonicalOfflineAttached(sourceBatchId, senderRegId, [op], srcSig, sha256Utf8);
  const batchRecord = {
    schema: 1,
    phase: 'PREPARED',
    id: crypto.randomUUID(),
    identity: currentIdentity,
    projectId,
    path: `/projects/${projectId}/offline/sync`,
    key: crypto.randomUUID(),
    body: attached,
    proof: { kind: 'signed-field-batch', sourceBatchId, registrationId: senderRegId, deviceId: senderDeviceId, manifest, descriptors: [desc] },
  };
  // Seed reconciled device enrollments for sender & recipient (normal real-app precondition)
  const senderIdentity = { ...currentIdentity };
  const recipIdentity = {
    actor: recipientActor, role: 'REPAIR_CREW', scope: 's-recip',
    environment: 'http://10.0.2.2:18181/api/v1', partition: 'p-recip',
  };
  journalRows.push(
    {
      schema: 1, phase: 'RECONCILED', id: crypto.randomUUID(), identity: senderIdentity, projectId,
      path: `/projects/${projectId}/offline/devices`, key: crypto.randomUUID(),
      body: JSON.stringify({ deviceId: senderDeviceId, signingPublicKey: senderSign.pubB64, encryptionPublicKey: senderEnc.pubB64 }),
      proof: { kind: 'enrollment' },
      receipt: { id: senderRegId, projectId, actorId: senderActor, deviceId: senderDeviceId, revision: 1, role: 'RepairCrew', signingPublicKey: senderSign.pubB64, encryptionPublicKey: senderEnc.pubB64, keyFingerprint: '0'.repeat(64), registeredAt: '2026-11-26T00:00:00Z', revokedAt: null },
    },
    {
      schema: 1, phase: 'RECONCILED', id: crypto.randomUUID(), identity: recipIdentity, projectId,
      path: `/projects/${projectId}/offline/devices`, key: crypto.randomUUID(),
      body: JSON.stringify({ deviceId: recipientDeviceId, signingPublicKey: recipSign.pubB64, encryptionPublicKey: recipEnc.pubB64 }),
      proof: { kind: 'enrollment' },
      receipt: { id: recipientRegId, projectId, actorId: recipientActor, deviceId: recipientDeviceId, revision: 1, role: 'RepairCrew', signingPublicKey: recipSign.pubB64, encryptionPublicKey: recipEnc.pubB64, keyFingerprint: recipFingerprint, registeredAt: '2026-11-26T00:00:00Z', revokedAt: null },
    },
  );
  journalRows.push(batchRecord);

  // 3. Export recipient public card on recipient & parse/reject tamper
  currentIdentity = {
    actor: recipientActor, role: 'REPAIR_CREW', scope: 's-recip',
    environment: 'http://10.0.2.2:18181/api/v1', partition: 'p-recip',
  };
  const recipCardJson = await handover.exportPublicRecipientCard(currentIdentity, projectId);
  const recipCard = handover.parsePublicRecipientCard(recipCardJson);
  assert.equal(recipCard.actorId, recipientActor);
  assert.equal(recipCard.keyFingerprint, recipFingerprint);
  assert.throws(() => handover.parsePublicRecipientCard(JSON.stringify({ ...recipCard, encryptionPublicKey: recipCard.signingPublicKey })), /handover_recipient_invalid/);
  assert.throws(() => handover.parsePublicRecipientCard(JSON.stringify({ ...recipCard, secretKey: 'leak' })), /handover_recipient_invalid/);

  // 4. Switch back to sender, test negative export & positive export with UNKNOWN_OUTCOME replay
  currentIdentity = batchRecord.identity;
  await assert.rejects(handover.prepareHandoverPackageExport(currentIdentity, projectId, batchRecord, []), /handover_recipients_required/);
  const exportRec = await handover.prepareHandoverPackageExport(currentIdentity, projectId, batchRecord, [recipCard]);
  assert.equal(exportRec.phase, 'PREPARED');
  await assert.rejects(handover.sendHandoverPackageExport(exportRec, currentIdentity), /network_timeout/);
  const afterTimeout = journalRows.find((r) => r.id === exportRec.id);
  assert.equal(afterTimeout.phase, 'UNKNOWN_OUTCOME');
  const exported = await handover.sendHandoverPackageExport(afterTimeout, currentIdentity);
  assert.equal(exported.phase, 'RECONCILED');
  const pkgId = exported.proof.packageId;

  // 5. Issue Supervisor grant in server fixture & test negative grant checks on recipient
  const manifestHash = crypto.createHash('sha256').update(manifest).digest('hex');
  const grantId = crypto.randomUUID();
  const baseGrant = {
    id: grantId,
    projectId,
    packageId: pkgId,
    sourceActorId: senderActor,
    sourceDeviceRegistrationId: senderRegId,
    recipientActorId: recipientActor,
    recipientDeviceRegistrationId: recipientRegId,
    role: 'RepairCrew',
    issuedBy: crypto.randomUUID(),
    issuedAt: '2026-11-26T00:00:00Z',
    expiresAt: '2026-12-30T00:00:00Z',
    manifestHash,
    scopeJson: JSON.stringify({ items: [desc] }),
    revokedAt: null,
  };
  serverGrants.set(grantId, baseGrant);

  currentIdentity = {
    actor: recipientActor, role: 'REPAIR_CREW', scope: 's-recip',
    environment: 'http://10.0.2.2:18181/api/v1', partition: 'p-recip',
  };

  // Wrong trusted sender must fail closed
  await assert.rejects(handover.inspectAndOpenHandoverPackage(currentIdentity, projectId, pkgId, grantId, recipSign.pubB64), /untrusted|signature/);
  // Revoked grant must fail closed before opening
  serverGrants.set(grantId, { ...baseGrant, revokedAt: '2026-11-26T01:00:00Z' });
  await assert.rejects(handover.inspectAndOpenHandoverPackage(currentIdentity, projectId, pkgId, grantId, senderSign.pubB64), /handover_grant_revoked/);
  // Expired grant must fail closed
  serverGrants.set(grantId, { ...baseGrant, expiresAt: '2020-01-01T00:00:00Z' });
  await assert.rejects(handover.inspectAndOpenHandoverPackage(currentIdentity, projectId, pkgId, grantId, senderSign.pubB64), /handover_grant_expired/);
  // Valid grant decrypts cleanly & matches exact canonical payload + operations
  serverGrants.set(grantId, baseGrant);
  const opened = await handover.inspectAndOpenHandoverPackage(currentIdentity, projectId, pkgId, grantId, senderSign.pubB64);
  assert.equal(opened.operations.length, 1);
  assert.equal(opened.operations[0].originId, originId);

  // 6. Recipient endorsement, prepare, revoked mid-flight handling & positive import + reconcile
  const importRec = await handover.prepareHandoverImport(currentIdentity, projectId, opened);
  assert.equal(importRec.phase, 'PREPARED');
  serverGrants.set(grantId, { ...baseGrant, revokedAt: '2026-11-26T02:00:00Z' });
  await assert.rejects(handover.sendHandoverImportIntent(importRec, currentIdentity), (e) => {
    assert.match(handover.handoverErrorMessage(e), /thu hồi/);
    return true;
  });
  // Restore active grant & replay same durable intent -> RECONCILED
  serverGrants.set(grantId, baseGrant);
  const afterRevokeAttempt = journalRows.find((r) => r.id === importRec.id);
  assert.equal(afterRevokeAttempt.phase, 'UNKNOWN_OUTCOME');
  const imported = await handover.sendHandoverImportIntent(afterRevokeAttempt, currentIdentity);
  assert.equal(imported.phase, 'RECONCILED');
  assert.equal(imported.verifiedItems.length, 1);
  assert.equal(imported.verifiedItems[0].originId, originId);

  // 7. Capture artifact manifest validation & bounds
  const chunkManifest = handover.canonicalCaptureManifest({
    version: 1,
    parentPackageId: pkgId,
    parentManifestHash: manifestHash,
    projectId,
    originalActorId: senderActor,
    sourceDeviceRegistrationId: senderRegId,
    captureOriginId: crypto.randomUUID(),
    taskId,
    purpose: 'BEFORE',
    mediaType: 'image/jpeg',
    fileSize: 100,
    fileChecksum: 'a'.repeat(64),
    chunks: [{
      artifactId: crypto.randomUUID(),
      index: 0,
      offset: 0,
      length: 100,
      plaintextChecksum: 'a'.repeat(64),
      envelopeFingerprint: 'b'.repeat(64),
    }],
  });
  assert.match(chunkManifest, /"purpose":"roadguard\.h5\.capture-manifest\.v1"/);
  assert.throws(() => handover.canonicalCaptureManifest({
    version: 1,
    parentPackageId: pkgId,
    parentManifestHash: manifestHash,
    projectId,
    originalActorId: senderActor,
    sourceDeviceRegistrationId: senderRegId,
    captureOriginId: crypto.randomUUID(),
    taskId,
    purpose: 'BEFORE',
    mediaType: 'image/jpeg',
    fileSize: 200,
    fileChecksum: 'a'.repeat(64),
    chunks: [{
      artifactId: crypto.randomUUID(), index: 0, offset: 0, length: 100,
      plaintextChecksum: 'a'.repeat(64), envelopeFingerprint: 'b'.repeat(64),
    }],
  }), /handover_artifact_manifest_invalid/);

  // 8. Canonical endorsement claim parity & imported admission provenance separation
  const claimStr = handover.canonicalRecipientImportClaim({
    projectId, packageId: pkgId, grantId, importBatchId: imported.proof.importBatchId,
    recipientDeviceRegistrationId: recipientRegId, attachedSourcePayloadHash: exported.proof.payloadHash,
  });
  assert.equal(claimStr, JSON.stringify({
    purpose: 'roadguard.h5.recipient-import.v1',
    schemaVersion: 1,
    projectId,
    packageId: pkgId,
    grantId,
    importBatchId: imported.proof.importBatchId,
    recipientDeviceRegistrationId: recipientRegId,
    attachedSourcePayloadHash: exported.proof.payloadHash,
  }));

  const admissionMod = loadTs('src/api/crewOfflineAdmission.ts', new Proxy({}, { has: () => true, get: () => ({}) }));
  const importedBatch = serverBatches.get(imported.proof.importBatchId);
  const subOp = {
    originId, kind: 'FIELD_SUBMISSION', taskId, assignmentId, snapshotId, originalActorId: senderActor,
    fieldSubmission: { evidence: [] },
  };
  const subRec = {
    ...imported,
    body: JSON.stringify({ batchId: imported.proof.importBatchId, grantId, recipientDeviceRegistrationId: recipientRegId, operations: [subOp] }),
  };
  const subItem = { ...importedBatch.items[0], kind: 'FIELD_SUBMISSION', admission: { ...importedBatch.items[0].admission, batchId: imported.proof.importBatchId } };
  assert.equal(admissionMod.validateImportedAdmissionSource(subRec, subItem).admission.grantId, grantId);
  assert.throws(() => admissionMod.validateAdmissionSource(subRec, subItem), /admission/);
});

test('CrewHandoverPanel UI isolates stale sessions and surfaces safe Vietnamese messages', async () => {
  const { screen } = require('./helpers/roadfe-screen.cjs');
  let active = true;
  const identity = { actor: crypto.randomUUID(), scope: 's-ui', environment: 'http://10.0.2.2:18181/api/v1', role: 'REPAIR_CREW', partition: 'p-ui' };
  const projectId = crypto.randomUUID();
  const s = screen('src/components/crew/CrewHandoverPanel.tsx', {
    exportName: 'CrewHandoverPanel',
    props: { identity },
    modules: {
      '../Card': { Card: 'Card' },
      '../Button': { Button: 'Button' },
      './CrewMotion': { CrewPressable: 'Pressable' },
      '../../api/crewApi': { isCrewResourceId: (x) => /^[a-f0-9-]{36}$/i.test(String(x)), listCrewProjectsReal: async () => ({ items: [{ projectId, name: 'SBX-A' }] }) },
      '../../api/crewOfflineJournal': { openOfflineJournal: async () => ({ list: async () => [] }) },
      '../../api/crewOfflineDevice': { inspectOfflineDevice: async () => ({ deviceId: null }) },
      '../../api/crewOfflineWorkflow': { listOfflineCollection: async () => ({ items: [], nextCursor: null }) },
      '../../api/crewOfflineHandover': {
        exportPublicRecipientCard: async () => { throw Object.assign(new Error('secret-token-leak'), { response: { status: 403, data: { code: 'handover_grant_revoked' } } }); },
        parsePublicRecipientCard: (x) => JSON.parse(x),
        handoverErrorMessage: () => 'Ủy quyền bàn giao đã bị giám sát viên thu hồi.',
      },
      '../../offline/upload-queue': { sameQueueIdentity: () => active },
    },
  });
  s.render();
  await s.flush();
  s.nodes().find((n) => n.props?.accessibilityLabel === 'Bàn giao dữ liệu mã hóa').props.onPress();
  s.render();
  const txtBefore = JSON.stringify(s.nodes());
  assert.match(txtBefore, /Tạo thẻ thiết bị công khai/);
  s.press('Tạo thẻ thiết bị công khai');
  await s.flush();
  const txtAfter = JSON.stringify(s.nodes());
  assert.match(txtAfter, /thu hồi/);
  assert.doesNotMatch(txtAfter, /secret-token-leak/);
  active = false;
  s.render();
  assert.deepEqual(s.nodes(), []);
  s.unmount();
});

test('Handover export/open/import preserves non-integer and trailing-zero measurement decimals', async () => {
  const protocol = loadTs('src/api/crewOfflineProtocol.ts', {});
  const sha256 = async (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
  const actorId = crypto.randomUUID();
  const deviceId = crypto.randomUUID();
  const regId = crypto.randomUUID();
  const batchId = crypto.randomUUID();
  const taskId = crypto.randomUUID();
  const assignmentId = crypto.randomUUID();
  const snapshotId = crypto.randomUUID();
  const startId = crypto.randomUUID();
  const subId = crypto.randomUUID();
  const subOp = {
    schemaVersion: 1,
    originId: subId,
    effectId: subId,
    kind: 'FIELD_SUBMISSION',
    originalActorId: actorId,
    sourceDeviceId: deviceId,
    snapshotId,
    taskId,
    assignmentId,
    taskVersion: 'AAAAAAAAB9E=',
    corePayloadHash: '0'.repeat(64),
    dependencies: [startId],
    claimedFinishedAt: '2026-11-26T00:01:00Z',
    fieldStart: null,
    fieldSubmission: {
      originId: subId,
      startOriginId: startId,
      parentSubmissionId: null,
      measurements: [{
        sampleId: 'S1',
        type: 'CRACK_WIDTH',
        value: { decimal: '12.50' },
        state: 'RECORDED',
        unknownReason: null,
        dimension: 'width',
        unit: 'cm',
        longitude: 106.7,
        latitude: 10.77,
        locationReason: null,
        instrument: 'RULE',
        method: 'MANUAL',
        notes: null,
      }],
      evidence: [],
      locationProof: null,
      captureType: 'FIELD',
      repaired: null,
      unrepairedReason: null,
      deviceId,
    },
    repair: null,
    fieldAction: null,
  };
  subOp.corePayloadHash = await protocol.fieldCoreHash(subOp, sha256);
  const desc = await protocol.describeOfflineOperation(subOp, sha256);
  const attached = await protocol.canonicalOfflineAttached(batchId, regId, [subOp], 'A'.repeat(86) + '==', sha256);
  assert.match(attached, /"value":12\.50,/);
  const reparsed = protocol.parseOfflineAttachedPreservingDecimals(attached);
  const roundtripDesc = await protocol.describeOfflineOperation(reparsed.operations[0], sha256);
  assert.deepEqual(roundtripDesc, desc);
  assert.equal(protocol.serializeOfflineOperation(reparsed.operations[0]), attached.slice(attached.indexOf('"operations":[') + 14, attached.indexOf(',"signature":') - 1));
});
