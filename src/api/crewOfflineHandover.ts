import { apiClient } from './client';
import { crewReadGuard } from './crewSafetyWorkflow';
import { isCrewResourceId } from './crewApi';
import { offlineBase64, offlineP1363, offlineSigningPublicKey } from './crewOfflineCrypto';
import {
  canonicalOfflineManifest,
  describeOfflineOperation,
  offlineGuid,
  offlineWebString,
  parseOfflineAttachedPreservingDecimals,
  serializeOfflineOperation,
  type OfflineRecord,
} from './crewOfflineProtocol';
import {
  crewOfflineNative,
  deviceBinding,
  inspectOfflineDevice,
  readLocalOfflineSources,
} from './crewOfflineDevice';
import {
  openOfflineJournal,
  sameOfflinePartition,
  type OfflineIntent,
  type OfflineJournalRecord,
} from './crewOfflineJournal';
import {
  offlineProjectPath,
  readOfflineResource,
  requireOfflineNativeAcceptance,
  validateBatch,
  validateDevice,
  type OfflineBatchReceipt,
  type OfflineGrantDetail,
  type OfflineGrantItemScope,
  type OfflineItemReceipt,
  type OfflinePackageDetail,
} from './crewOfflineWorkflow';
import {
  isDurableOfflineItem,
  isTerminalOfflineItem,
  toVerifiedOfflineObservation,
} from '../offline/crewSignedSync';
import { generateChecksum, sha256HexBytesSync } from '../offline/checksum';
import { bytesToBase64, bytesToUtf8, utf8ToBytes } from '../utils/base64';
import { sameQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import { uuidv4 } from '../utils/uuid';

const HASH64 = /^[a-f0-9]{64}$/;
const PACKAGE_SCHEMA = 'huy-final.offline.bundle.v1';
const MAX_CAPTURE_BYTES = 20 * 1024 * 1024;
const MAX_CHUNK_BYTES = 16 * 1024 * 1024;
const MAX_CAPTURE_CHUNKS = 32;
const ARTIFACT_CHUNK_BYTES = 1024 * 1024;

type HandoverEnvelope = {
  header: { version: number; payloadSchema: string; packageId: string; projectId: string; originalActorId: string;
    sourceDeviceId: string; originIds: string[]; payloadSha256: string };
  payloadNonce: string; ciphertext: string; payloadTag: string; senderSigningPublicKey: string; signature: string;
  recipients: { actorId: string; deviceId: string; recipientKeyFingerprint: string; ephemeralPublicKey: string;
    nonce: string; wrappedKey: string; tag: string }[];
};

type CaptureArtifact = {
  id: string; projectId: string; parentPackageId: string; captureOriginId: string; taskId: string; originalActorId: string;
  sourceDeviceRegistrationId: string; chunkIndex: number; chunkOffset: number; chunkLength: number; plaintextChecksum: string;
  envelopeFingerprint: string; manifestHash: string; signedManifestJson: string; manifestSignature: string; cipherEnvelopeJson: string;
};

export interface OfflinePublicRecipientCard {
  version: 1;
  actorId: string;
  deviceId: string;
  registrationId: string;
  encryptionPublicKey: string;
  signingPublicKey: string;
  keyFingerprint: string;
}

export interface HandoverOpenedPackage {
  projectId: string;
  packageDetail: OfflinePackageDetail;
  grantDetail: OfflineGrantDetail;
  attachedPayloadJson: string;
  operations: OfflineRecord[];
  descriptors: OfflineRecord[];
  localRegistrationId: string;
  deviceId: string;
}

export interface OfflineCaptureChunk {
  artifactId: string;
  index: number;
  offset: number;
  length: number;
  plaintextChecksum: string;
  envelopeFingerprint: string;
}

export interface OfflineCaptureManifest {
  version: 1;
  parentPackageId: string;
  parentManifestHash: string;
  projectId: string;
  originalActorId: string;
  sourceDeviceRegistrationId: string;
  captureOriginId: string;
  taskId: string;
  purpose: 'BEFORE' | 'AFTER' | 'MEASUREMENT';
  mediaType: 'image/jpeg' | 'image/png';
  fileSize: number;
  fileChecksum: string;
  chunks: OfflineCaptureChunk[];
}

function assertHash64(v: unknown, code: string): string {
  if (typeof v !== 'string' || !HASH64.test(v)) throw Error(code);
  return v;
}

function requireGuid(v: unknown, code: string): string {
  try {
    return offlineGuid(v);
  } catch {
    throw Error(code);
  }
}

export function recipientKeyFingerprint(encryptionPublicKey: string): string {
  const spki = offlineSigningPublicKey(encryptionPublicKey);
  return sha256HexBytesSync(spki);
}

/** Public-only device card for sharing encryption/signing identity without secrets. */
export async function exportPublicRecipientCard(
  identity: QueueIdentity,
  projectId: string,
): Promise<string> {
  requireOfflineNativeAcceptance(identity);
  crewReadGuard(identity);
  if (!isCrewResourceId(projectId)) throw Error('offline_project_source_required');
  const native = crewOfflineNative(identity);
  const probe = await inspectOfflineDevice(identity);
  crewReadGuard(identity);
  if (!native || !probe.deviceId || !probe.capability.signingUsable || !probe.capability.agreementUsable) {
    throw Error('BLOCKED_NATIVE');
  }
  const local = await readLocalOfflineSources(identity, projectId, (await findRegisteredId(identity, projectId)), probe.deviceId);
  crewReadGuard(identity);
  const keys = await native.publicKeys(deviceBinding(identity, probe.deviceId));
  crewReadGuard(identity);
  if (
    keys.signingPublicKey !== local.device.signingPublicKey ||
    keys.encryptionPublicKey !== local.device.encryptionPublicKey ||
    keys.signingPublicKey === keys.encryptionPublicKey
  ) {
    throw Error('offline_device_key_mismatch');
  }
  const card: OfflinePublicRecipientCard = {
    version: 1,
    actorId: local.device.actorId,
    deviceId: local.device.deviceId,
    registrationId: local.device.id,
    encryptionPublicKey: keys.encryptionPublicKey,
    signingPublicKey: keys.signingPublicKey,
    keyFingerprint: recipientKeyFingerprint(keys.encryptionPublicKey),
  };
  return JSON.stringify(card);
}

async function findRegisteredId(identity: QueueIdentity, projectId: string): Promise<string> {
  const rows = await (await openOfflineJournal(identity)).list();
  crewReadGuard(identity);
  const reg = rows.find((r) => r.projectId === projectId && r.proof.kind === 'enrollment' && r.phase === 'RECONCILED');
  const regId = (reg?.receipt as { id?: string } | undefined)?.id;
  if (!regId || !isCrewResourceId(regId)) throw Error('offline_verified_device_not_downloaded');
  return regId;
}

export function parsePublicRecipientCard(raw: string): OfflinePublicRecipientCard {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw Error('handover_recipient_invalid');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw Error('handover_recipient_invalid');
  }
  const rec = parsed as Record<string, unknown>;
  const allowed = ['version', 'actorId', 'deviceId', 'registrationId', 'encryptionPublicKey', 'signingPublicKey', 'keyFingerprint'];
  if (Object.keys(rec).some((k) => !allowed.includes(k)) || rec.version !== 1) {
    throw Error('handover_recipient_invalid');
  }
  const actorId = requireGuid(rec.actorId, 'handover_recipient_invalid');
  const deviceId = requireGuid(rec.deviceId, 'handover_recipient_invalid');
  const registrationId = requireGuid(rec.registrationId, 'handover_recipient_invalid');
  if (typeof rec.encryptionPublicKey !== 'string' || typeof rec.signingPublicKey !== 'string') {
    throw Error('handover_recipient_invalid');
  }
  let fp: string;
  try {
    offlineSigningPublicKey(rec.signingPublicKey);
    fp = recipientKeyFingerprint(rec.encryptionPublicKey);
  } catch {
    throw Error('handover_recipient_invalid');
  }
  if (rec.encryptionPublicKey === rec.signingPublicKey || rec.keyFingerprint !== fp) {
    throw Error('handover_recipient_invalid');
  }
  return {
    version: 1,
    actorId,
    deviceId,
    registrationId,
    encryptionPublicKey: rec.encryptionPublicKey,
    signingPublicKey: rec.signingPublicKey,
    keyFingerprint: fp,
  };
}

/** Exact canonical JSON matching BE OfflineRecipientEndorsement.CanonicalClaim. */
export function canonicalRecipientImportClaim(params: {
  projectId: string;
  packageId: string;
  grantId: string;
  importBatchId: string;
  recipientDeviceRegistrationId: string;
  attachedSourcePayloadHash: string;
}): string {
  const projectId = requireGuid(params.projectId, 'handover_claim_invalid');
  const packageId = requireGuid(params.packageId, 'handover_claim_invalid');
  const grantId = requireGuid(params.grantId, 'handover_claim_invalid');
  const importBatchId = requireGuid(params.importBatchId, 'handover_claim_invalid');
  const regId = requireGuid(params.recipientDeviceRegistrationId, 'handover_claim_invalid');
  const hash = assertHash64(params.attachedSourcePayloadHash.toLowerCase(), 'handover_claim_invalid');
  return (
    '{"purpose":"roadguard.h5.recipient-import.v1","schemaVersion":1' +
    `,"projectId":${offlineWebString(projectId)}` +
    `,"packageId":${offlineWebString(packageId)}` +
    `,"grantId":${offlineWebString(grantId)}` +
    `,"importBatchId":${offlineWebString(importBatchId)}` +
    `,"recipientDeviceRegistrationId":${offlineWebString(regId)}` +
    `,"attachedSourcePayloadHash":${offlineWebString(hash)}}`
  );
}

/** Exact canonical JSON matching BE OfflineCaptureArtifacts.CanonicalManifest. */
export function canonicalCaptureManifest(manifest: OfflineCaptureManifest): string {
  if (
    !manifest ||
    manifest.version !== 1 ||
    !['BEFORE', 'AFTER', 'MEASUREMENT'].includes(manifest.purpose) ||
    !['image/jpeg', 'image/png'].includes(manifest.mediaType) ||
    !Number.isSafeInteger(manifest.fileSize) ||
    manifest.fileSize < 1 ||
    manifest.fileSize > MAX_CAPTURE_BYTES ||
    !Array.isArray(manifest.chunks) ||
    manifest.chunks.length < 1 ||
    manifest.chunks.length > MAX_CAPTURE_CHUNKS
  ) {
    throw Error('handover_artifact_manifest_invalid');
  }
  const parentPackageId = requireGuid(manifest.parentPackageId, 'handover_artifact_manifest_invalid');
  const projectId = requireGuid(manifest.projectId, 'handover_artifact_manifest_invalid');
  const originalActorId = requireGuid(manifest.originalActorId, 'handover_artifact_manifest_invalid');
  const sourceRegId = requireGuid(manifest.sourceDeviceRegistrationId, 'handover_artifact_manifest_invalid');
  const captureOriginId = requireGuid(manifest.captureOriginId, 'handover_artifact_manifest_invalid');
  const taskId = requireGuid(manifest.taskId, 'handover_artifact_manifest_invalid');
  const parentManifestHash = assertHash64(manifest.parentManifestHash, 'handover_artifact_manifest_invalid');
  const fileChecksum = assertHash64(manifest.fileChecksum, 'handover_artifact_manifest_invalid');

  const seenArtifacts = new Set<string>();
  let offset = 0;
  const serializedChunks: string[] = [];
  for (let i = 0; i < manifest.chunks.length; i++) {
    const c = manifest.chunks[i];
    if (!c) throw Error('handover_artifact_manifest_invalid');
    const artifactId = requireGuid(c.artifactId, 'handover_artifact_manifest_invalid');
    const plaintextChecksum = assertHash64(c.plaintextChecksum, 'handover_artifact_manifest_invalid');
    const envelopeFingerprint = assertHash64(c.envelopeFingerprint, 'handover_artifact_manifest_invalid');
    if (
      seenArtifacts.has(artifactId) ||
      c.index !== i ||
      c.offset !== offset ||
      !Number.isSafeInteger(c.length) ||
      c.length < 1 ||
      c.length > MAX_CHUNK_BYTES
    ) {
      throw Error('handover_artifact_manifest_invalid');
    }
    seenArtifacts.add(artifactId);
    offset += c.length;
    if (offset > manifest.fileSize) throw Error('handover_artifact_manifest_invalid');
    serializedChunks.push(
      `{"artifactId":${offlineWebString(artifactId)},"index":${c.index},"offset":${c.offset},"length":${c.length},"plaintextChecksum":${offlineWebString(plaintextChecksum)},"envelopeFingerprint":${offlineWebString(envelopeFingerprint)}}`,
    );
  }
  if (offset !== manifest.fileSize) throw Error('handover_artifact_manifest_invalid');
  return (
    '{"purpose":"roadguard.h5.capture-manifest.v1","manifest":{' +
    `"version":1,"parentPackageId":${offlineWebString(parentPackageId)},"parentManifestHash":${offlineWebString(parentManifestHash)},` +
    `"projectId":${offlineWebString(projectId)},"originalActorId":${offlineWebString(originalActorId)},"sourceDeviceRegistrationId":${offlineWebString(sourceRegId)},` +
    `"captureOriginId":${offlineWebString(captureOriginId)},"taskId":${offlineWebString(taskId)},"purpose":${offlineWebString(manifest.purpose)},` +
    `"mediaType":${offlineWebString(manifest.mediaType)},"fileSize":${manifest.fileSize},"fileChecksum":${offlineWebString(fileChecksum)},` +
    `"chunks":[${serializedChunks.join(',')}]}}`
  );
}

// API-114 has ID lookup only. The signed manifest returned by chunk zero supplies the remaining IDs.
export async function handoverArtifactId(packageId:string,captureId:string,index:number):Promise<string> {
  const digest=await generateChecksum(JSON.stringify(['roadguard.h5.capture-artifact.id.v1',packageId,captureId,index]));
  return `${digest.slice(0,8)}-${digest.slice(8,12)}-8${digest.slice(13,16)}-${((parseInt(digest[16],16)&3)|8).toString(16)}${digest.slice(17,20)}-${digest.slice(20,32)}`;
}

// OfflineCryptoFormat.CanonicalUnsignedPackage property order. Valid fields are ASCII IDs and base64.
function unsignedEnvelope(e:HandoverEnvelope):string {
  const {version,payloadSchema,packageId,projectId,originalActorId,sourceDeviceId,originIds,payloadSha256}=e.header;
  return JSON.stringify({header:{version,payloadSchema,packageId,projectId,originalActorId,sourceDeviceId,originIds,payloadSha256},
    payloadNonce:e.payloadNonce,ciphertext:e.ciphertext,payloadTag:e.payloadTag,
    recipients:e.recipients.map(({actorId,deviceId,recipientKeyFingerprint,ephemeralPublicKey,nonce,wrappedKey,tag})=>
      ({actorId,deviceId,recipientKeyFingerprint,ephemeralPublicKey,nonce,wrappedKey,tag})),senderSigningPublicKey:e.senderSigningPublicKey});
}

function attachedCaptures(op:OfflineRecord):OfflineRecord[] {
  const input=(op.fieldSubmission??(op.repair as OfflineRecord|undefined)?.assessment) as OfflineRecord|undefined;
  return ((input?.evidence??[]) as OfflineRecord[]).filter(e=>e.fileId==null);
}

function authenticatedPackageEnvelope(pkg:OfflinePackageDetail):HandoverEnvelope {
  // API-115 returns the envelope accepted by RegisterPackageAsync under the registered source key.
  const envelope=JSON.parse(pkg.cipherPackageJson) as HandoverEnvelope;
  if(envelope?.header?.packageId!==pkg.id||envelope.header.projectId!==pkg.projectId||
    envelope.header.originalActorId!==pkg.originalActorId||envelope.header.payloadSha256!==pkg.payloadHash)throw Error('handover_package_mismatch');
  offlineSigningPublicKey(envelope.senderSigningPublicKey);
  return envelope;
}

async function readActiveHandoverGrant(identity:QueueIdentity,projectId:string,packageId:string,grantId:string,registrationId:string) {
  const grant=await readOfflineResource<OfflineGrantDetail>(identity,projectId,'grants',grantId);crewReadGuard(identity);
  if(!grant||grant.id!==grantId||grant.projectId!==projectId||grant.packageId!==packageId||
    grant.recipientActorId!==identity.actor||grant.recipientDeviceRegistrationId!==registrationId||grant.role!=='RepairCrew')throw Error('handover_grant_mismatch');
  if(grant.revokedAt)throw Error('handover_grant_revoked');
  if(!Number.isFinite(Date.parse(grant.expiresAt))||Date.now()>=Date.parse(grant.expiresAt))throw Error('handover_grant_expired');
  return grant;
}

/** Display candidates only. Export independently verifies the signed source and its custody. */
export async function listHandoverSourceBatches(identity: QueueIdentity, rows: OfflineJournalRecord[]) {
  crewReadGuard(identity);
  const candidates = rows.filter(record => {
    const { registrationId } = record.proof;
    if (record.proof.kind !== 'signed-field-batch' || !sameOfflinePartition(record.identity, identity) ||
        !isCrewResourceId(record.projectId) || !isCrewResourceId(registrationId) ||
        record.path !== `${offlineProjectPath(record.projectId)}/sync`) return false;
    const registrationRows = rows.filter(row => row.projectId === record.projectId &&
      row.proof.registrationId === registrationId && sameOfflinePartition(row.identity, identity));
    return !registrationRows.some(row => row.proof.kind === 'revocation') &&
      (sameQueueIdentity(record.identity, identity) || registrationRows.some(row =>
        row.phase === 'RECONCILED' && row.proof.kind === 'session-confirm' && sameQueueIdentity(row.identity, identity)));
  });
  if (!candidates.length) return [];

  const native = crewOfflineNative(identity);
  const probe = await inspectOfflineDevice(identity);
  crewReadGuard(identity);
  if (!native || !probe.deviceId || !probe.capability.signingUsable || !probe.capability.agreementUsable) return [];

  const deviceId = probe.deviceId;
  const keys = await native.publicKeys(deviceBinding(identity, deviceId));
  crewReadGuard(identity);
  const checked = new Map<string, boolean>();
  const visible: OfflineJournalRecord[] = [];
  for (const record of candidates) {
    if (record.proof.deviceId !== deviceId) continue;
    const registrationId = String(record.proof.registrationId);
    const key = `${record.projectId}/${registrationId}`;
    if (!checked.has(key)) {
      try {
        const { device } = await readLocalOfflineSources(identity, record.projectId, registrationId, deviceId);
        crewReadGuard(identity);
        checked.set(key, device.id === registrationId && device.projectId === record.projectId &&
          device.deviceId === deviceId && keys.signingPublicKey === device.signingPublicKey &&
          keys.encryptionPublicKey === device.encryptionPublicKey);
      } catch {
        crewReadGuard(identity);
        checked.set(key, false);
      }
    }
    if (checked.get(key)) visible.push(record);
  }
  return visible;
}

/** Seals an existing signed batch into an encrypted handover package for 1..32 recipients and journals export intent. */
export async function prepareHandoverPackageExport(
  identity: QueueIdentity,
  projectId: string,
  sourceBatchRecord: OfflineJournalRecord,
  recipients: OfflinePublicRecipientCard[],
): Promise<OfflineJournalRecord> {
  requireOfflineNativeAcceptance(identity);
  crewReadGuard(identity);
  const base = offlineProjectPath(projectId);
  if (
    !sourceBatchRecord ||
    sourceBatchRecord.projectId !== projectId ||
    sourceBatchRecord.proof.kind !== 'signed-field-batch' ||
    sourceBatchRecord.path !== `${base}/sync`
  ) {
    throw Error('handover_source_batch_invalid');
  }
  if (!Array.isArray(recipients) || recipients.length < 1 || recipients.length > 32) {
    throw Error('handover_recipients_required');
  }
  if(!sameOfflinePartition(identity,sourceBatchRecord.identity))throw Error('handover_source_batch_invalid');
  const normalizedRecipients = recipients.map((r) => parsePublicRecipientCard(JSON.stringify(r)))
    .sort((a,b)=>a.keyFingerprint.localeCompare(b.keyFingerprint));
  const idSet = new Set<string>();
  const fpSet = new Set<string>();
  for (const r of normalizedRecipients) {
    const idKey = `${r.actorId}|${r.deviceId}`;
    if (idSet.has(idKey) || fpSet.has(r.keyFingerprint)) {
      throw Error('handover_recipient_duplicate');
    }
    idSet.add(idKey);
    fpSet.add(r.keyFingerprint);
  }

  let parsedBody: {
    batchId?: string;
    sourceDeviceRegistrationId?: string;
    operations?: OfflineRecord[];
    signature?: string;
  };
  try {
    parsedBody = parseOfflineAttachedPreservingDecimals(sourceBatchRecord.body) as typeof parsedBody;
  } catch {
    throw Error('handover_source_batch_invalid');
  }
  if (
    !parsedBody.batchId ||
    parsedBody.batchId !== sourceBatchRecord.proof.sourceBatchId ||
    !parsedBody.sourceDeviceRegistrationId ||
    parsedBody.sourceDeviceRegistrationId !== sourceBatchRecord.proof.registrationId ||
    !Array.isArray(parsedBody.operations) ||
    parsedBody.operations.length < 1 ||
    parsedBody.operations.length > 1000 ||
    typeof parsedBody.signature !== 'string'
  ) {
    throw Error('handover_source_batch_invalid');
  }
  offlineP1363(parsedBody.signature);

  const registrationId = parsedBody.sourceDeviceRegistrationId;
  const native = crewOfflineNative(identity);
  const probe = await inspectOfflineDevice(identity);
  crewReadGuard(identity);
  if (!native || !probe.deviceId || !probe.capability.signingUsable || !probe.capability.agreementUsable) {
    throw Error('BLOCKED_NATIVE');
  }
  const local = await readLocalOfflineSources(identity, projectId, registrationId, probe.deviceId);
  crewReadGuard(identity);
  validateDevice(local.device, identity, registrationId, probe.deviceId);
  const binding = deviceBinding(identity, probe.deviceId);
  const keys = await native.publicKeys(binding);
  crewReadGuard(identity);
  if (keys.signingPublicKey !== local.device.signingPublicKey || keys.encryptionPublicKey !== local.device.encryptionPublicKey) {
    throw Error('offline_device_key_mismatch');
  }

  const descriptors: OfflineRecord[] = [];
  for (const op of parsedBody.operations) {
    descriptors.push(await describeOfflineOperation(op, generateChecksum));
    crewReadGuard(identity);
  }
  const manifestJson = canonicalOfflineManifest(projectId, parsedBody.batchId, registrationId, descriptors);
  if (typeof sourceBatchRecord.proof.manifest === 'string' && sourceBatchRecord.proof.manifest !== manifestJson) {
    throw Error('handover_source_batch_invalid');
  }
  const sigValid = await native.verifyManifest(local.device.signingPublicKey, manifestJson, parsedBody.signature);
  crewReadGuard(identity);
  if (!sigValid) throw Error('offline_signature_self_verify_failed');

  const manifestHash = await generateChecksum(manifestJson);
  const payloadSha256 = await generateChecksum(sourceBatchRecord.body);
  const originIds = Array.from(new Set(descriptors.map((d) => String(d.originId)))).sort((a, b) =>
    a.replace(/-/g, '') < b.replace(/-/g, '') ? -1 : a.replace(/-/g, '') > b.replace(/-/g, '') ? 1 : 0,
  );
  const packageId = uuidv4();
  const sealRequest = {
    header: {
      version: 1,
      payloadSchema: PACKAGE_SCHEMA,
      packageId,
      projectId,
      originalActorId: local.device.actorId,
      sourceDeviceId: local.device.deviceId,
      originIds,
      payloadSha256,
    },
    payloadBase64: bytesToBase64(utf8ToBytes(sourceBatchRecord.body)),
    recipients: normalizedRecipients.map((r) => ({
      actorId: r.actorId,
      deviceId: r.deviceId,
      encryptionPublicKey: r.encryptionPublicKey,
      signingPublicKey: r.signingPublicKey,
    })),
  };

  const cipherJson = await native.sealPackage(binding, JSON.stringify(sealRequest));
  crewReadGuard(identity);
  const cipher = JSON.parse(cipherJson) as {
    header?: { packageId?: string; payloadSha256?: string; payloadSchema?: string };
    signature?: string;
    senderSigningPublicKey?: string;
    recipients?: { recipientKeyFingerprint?: string }[];
  };
  if (
    cipher?.header?.packageId !== packageId ||
    cipher?.header?.payloadSha256 !== payloadSha256 ||
    cipher?.header?.payloadSchema !== PACKAGE_SCHEMA ||
    cipher?.senderSigningPublicKey !== local.device.signingPublicKey ||
    typeof cipher?.signature !== 'string' ||
    !Array.isArray(cipher?.recipients) ||
    !normalizedRecipients.every((r) => cipher.recipients!.some((w) => w.recipientKeyFingerprint === r.keyFingerprint))
  ) {
    throw Error('handover_seal_validation_failed');
  }
  offlineP1363(cipher.signature);

  const exportBody = JSON.stringify({
    package: cipher,
    manifest: {
      sourceBatchId: parsedBody.batchId,
      sourceDeviceRegistrationId: registrationId,
      items: descriptors,
      signature: parsedBody.signature,
    },
    sourceFileId: null,
  });

  const journal = await openOfflineJournal(identity);
  return journal.prepare({
    id: uuidv4(),
    identity,
    projectId,
    path: `${base}/packages/export`,
    key: uuidv4(),
    body: exportBody,
    proof: {
      kind: 'handover-export',
      packageId,
      registrationId,
      sourceBatchId: parsedBody.batchId,
      sourceBatchIntentId: sourceBatchRecord.id,
      manifestHash,
      payloadHash: payloadSha256,
      descriptors,
      recipientFingerprints: normalizedRecipients.map((r) => r.keyFingerprint),
      recipients: sealRequest.recipients,
    },
  });
}

async function dispatchHandoverPost(record: OfflineJournalRecord, authority: QueueIdentity): Promise<OfflineJournalRecord> {
  const journal = await openOfflineJournal(authority);
  const pending = await journal.transition(record, 'IN_FLIGHT');
  try {
    crewReadGuard(authority);
    const res = await apiClient.post(record.path, record.body, {
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': record.key },
      transformRequest: [(data) => data],
    });
    crewReadGuard(authority);
    return await journal.transition(pending, 'RECEIVED', res.data);
  } catch (error) {
    try {
      crewReadGuard(authority);
      await journal.transition(pending, 'UNKNOWN_OUTCOME');
    } catch {
      /* Preserve IN_FLIGHT on authority change. */
    }
    throw error;
  }
}

const handoversInProgress=new Set<string>();
async function withHandoverLock(record:OfflineJournalRecord,send:()=>Promise<OfflineJournalRecord>) {
  const lock=JSON.stringify([record.identity.environment,record.identity.actor,record.id]);
  if(handoversInProgress.has(lock))throw Error('field_busy');
  handoversInProgress.add(lock);
  try{return await send();}
  finally{handoversInProgress.delete(lock);}
}

export async function sendHandoverPackageExport(
  record: OfflineJournalRecord,
  authority: QueueIdentity = record.identity,
  recipientCards: OfflinePublicRecipientCard[] = [],
): Promise<OfflineJournalRecord> {
  return withHandoverLock(record,()=>sendRetainedHandoverExport(record,authority,recipientCards));
}

async function sendRetainedHandoverExport(
  record: OfflineJournalRecord, authority: QueueIdentity, recipientCards: OfflinePublicRecipientCard[],
): Promise<OfflineJournalRecord> {
  if (authority !== record.identity && !sameOfflinePartition(record.identity, authority)) {
    throw Error('offline_session_changed');
  }
  requireOfflineNativeAcceptance(authority);
  crewReadGuard(authority);
  const base = offlineProjectPath(record.projectId);
  if (record.proof.kind !== 'handover-export' || record.path !== `${base}/packages/export`) {
    throw Error('handover_export_source_required');
  }
  const journal=await openOfflineJournal(authority);
  const rows=await journal.list();
  const current = rows.find((r) => r.id === record.id);
  if (!current || current.body !== record.body || current.key !== record.key || JSON.stringify(current.proof) !== JSON.stringify(record.proof)) {
    throw Error('handover_export_source_changed');
  }
  let exported=current;
  if(current.phase!=='RECONCILED'){
    const start=current.phase==='IN_FLIGHT'?await journal.transition(current,'UNKNOWN_OUTCOME'):current;
    if(!['PREPARED','UNKNOWN_OUTCOME','RECEIVED'].includes(start.phase))throw Error('handover_export_phase_invalid');
    const received=start.phase==='RECEIVED'?start:await dispatchHandoverPost(start,authority);
    exported=await reconcileHandoverPackageExport(received,authority);
  }
  const source = rows.find(r => r.id === exported.proof.sourceBatchIntentId);
  if (!source) throw Error('handover_source_batch_invalid');
  // Older exports retained the signed source and fingerprints, but omitted media metadata.
  const attached = parseOfflineAttachedPreservingDecimals(source.body) as { operations: OfflineRecord[] };
  if (attached.operations.some(operation => attachedCaptures(operation).length > 0)) {
    await exportHandoverMedia(exported, source, authority, attached.operations, recipientCards);
  }
  return exported;
}

async function exportHandoverMedia(
  exported: OfflineJournalRecord, source: OfflineJournalRecord, identity: QueueIdentity,
  operations: OfflineRecord[], recipientCards: OfflinePublicRecipientCard[],
) {
  const pkg=exported.receipt as OfflinePackageDetail;
  if(source.proof.kind!=='signed-field-batch'||!sameOfflinePartition(source.identity,identity)||source.projectId!==exported.projectId||
    source.proof.sourceBatchId!==pkg.sourceBatchId||source.proof.registrationId!==pkg.sourceDeviceRegistrationId||
    await generateChecksum(source.body)!==pkg.payloadHash)throw Error('handover_source_batch_invalid');
  crewReadGuard(identity);
  const parent=authenticatedPackageEnvelope(pkg),native=crewOfflineNative(identity),probe=await inspectOfflineDevice(identity);
  crewReadGuard(identity);
  if(!native||probe.deviceId!==parent.header.sourceDeviceId||!probe.capability.signingUsable||!probe.capability.agreementUsable)throw Error('BLOCKED_NATIVE');
  const local=await readLocalOfflineSources(identity,pkg.projectId,pkg.sourceDeviceRegistrationId,probe.deviceId);
  crewReadGuard(identity);validateDevice(local.device,identity,pkg.sourceDeviceRegistrationId,probe.deviceId);
  if(local.device.signingPublicKey!==parent.senderSigningPublicKey)throw Error('offline_device_key_mismatch');
  const binding=deviceBinding(identity,probe.deviceId);
  const recipients = (exported.proof.recipients ?? recipientCards.map(card =>
    parsePublicRecipientCard(JSON.stringify(card)))) as Pick<
      OfflinePublicRecipientCard, 'actorId' | 'deviceId' | 'encryptionPublicKey' | 'signingPublicKey'
    >[];
  const {openFieldRuntime}=await import('./crewFieldDraft');
  const {readCrewPhotoBytes}=await import('./crewMediaVault');
  const {sha256HexOfBytes}=await import('./uploads');
  const journal=await openOfflineJournal(identity);
  const seen=new Set<string>();
  for(const operation of operations){
    for(const evidence of attachedCaptures(operation)){
      const captureId=requireGuid(evidence.captureOriginId,'handover_artifact_manifest_invalid');
      if(seen.has(captureId))throw Error('handover_artifact_manifest_invalid');
      seen.add(captureId);
      const firstId=await handoverArtifactId(pkg.id,captureId,0);
      let first=await journal.readArtifact(firstId);
      if(!first){
        if (!Array.isArray(recipients) || recipients.length !== parent.recipients.length ||
            !parent.recipients.every(wrap => recipients.filter(recipient =>
              recipient.actorId === wrap.actorId && recipient.deviceId === wrap.deviceId &&
              recipientKeyFingerprint(recipient.encryptionPublicKey) === wrap.recipientKeyFingerprint).length === 1)) {
          throw Error('handover_recipient_invalid');
        }
        const context={actor:source.identity.actor,environment:source.identity.environment,scope:source.identity.scope,
          projectId:pkg.projectId,taskId:String(operation.taskId)};
        const runtime=await openFieldRuntime(context,identity);
        const draft=await runtime.historicalRead?.(context.scope);crewReadGuard(identity);
        const capture=draft?.captures.find(c=>c.id===captureId);
        if(!capture?.vault||capture.cancelState||capture.checksum!==evidence.checksumSha256||capture.mediaType!==evidence.mediaType||
          capture.purpose!==evidence.purpose||(evidence.sizeBytes!=null&&evidence.sizeBytes!==capture.size)||capture.size>MAX_CAPTURE_BYTES)throw Error('handover_artifact_source_missing');
        const bytes=await readCrewPhotoBytes(context,capture,()=>{crewReadGuard(identity);return true;});
        try{
          crewReadGuard(identity);
          const chunks:OfflineCaptureChunk[]=[],envelopes:HandoverEnvelope[]=[];
          for(let offset=0;offset<bytes.length;offset+=ARTIFACT_CHUNK_BYTES){
            const part=bytes.subarray(offset,offset+ARTIFACT_CHUNK_BYTES),index=chunks.length;
            const artifactId=await handoverArtifactId(pkg.id,captureId,index),plaintextChecksum=await sha256HexOfBytes(part);
            crewReadGuard(identity);
            const header={...parent.header,packageId:artifactId,originIds:[captureId],payloadSha256:plaintextChecksum};
            const envelope=JSON.parse(await native.sealPackage(binding,JSON.stringify({header,payloadBase64:bytesToBase64(part),recipients}))) as HandoverEnvelope;
            crewReadGuard(identity);
            const envelopeFingerprint=await sha256HexOfBytes(utf8ToBytes(unsignedEnvelope(envelope)));
            crewReadGuard(identity);
            chunks.push({artifactId,index,offset,length:part.length,plaintextChecksum,envelopeFingerprint});
            envelopes.push(envelope);
          }
          const manifest:OfflineCaptureManifest={version:1,parentPackageId:pkg.id,parentManifestHash:pkg.manifestHash,projectId:pkg.projectId,
            originalActorId:pkg.originalActorId,sourceDeviceRegistrationId:pkg.sourceDeviceRegistrationId,captureOriginId:captureId,
            taskId:context.taskId,purpose:capture.purpose,mediaType:capture.mediaType as OfflineCaptureManifest['mediaType'],
            fileSize:bytes.length,fileChecksum:capture.checksum,chunks};
          const signedManifest=canonicalCaptureManifest(manifest),manifestSignature=await native.signManifest(binding,signedManifest);
          crewReadGuard(identity);offlineP1363(manifestSignature);
          if(!await native.verifyManifest(parent.senderSigningPublicKey,signedManifest,manifestSignature))throw Error('offline_signature_self_verify_failed');
          crewReadGuard(identity);
          const intents:OfflineIntent[]=chunks.map(chunk=>({id:chunk.artifactId,identity,projectId:pkg.projectId,key:uuidv4(),
            path:`${offlineProjectPath(pkg.projectId)}/artifacts`,body:JSON.stringify({manifest,manifestSignature,chunkIndex:chunk.index,envelope:envelopes[chunk.index]}),
            proof:{kind:'handover-artifact',registrationId:pkg.sourceDeviceRegistrationId,exportIntentId:exported.id}}));
          await journal.prepareArtifacts(exported,intents);
        }finally{bytes.fill(0);}
        first=await journal.readArtifact(firstId);
      }
      if(!first||first.proof.exportIntentId!==exported.id)throw Error('handover_artifact_manifest_invalid');
      const {manifest}=JSON.parse(first.body) as {manifest:OfflineCaptureManifest};
      const canonical=canonicalCaptureManifest(manifest),manifestHash=await generateChecksum(canonical);
      for(const chunk of manifest.chunks){
        let record=await journal.readArtifact(chunk.artifactId);
        if(!record||record.proof.exportIntentId!==exported.id)throw Error('handover_artifact_manifest_invalid');
        if(record.phase==='RECONCILED')continue;
        if(record.phase==='IN_FLIGHT')record=await journal.transition(record,'UNKNOWN_OUTCOME');
        if(record.phase!=='RECEIVED')record=await dispatchHandoverPost(record,identity);
        const artifact=await readOfflineResource<CaptureArtifact>(identity,pkg.projectId,'artifacts',chunk.artifactId);
        crewReadGuard(identity);
        if(artifact.id!==chunk.artifactId||artifact.parentPackageId!==pkg.id||artifact.captureOriginId!==captureId||
          artifact.manifestHash!==manifestHash||artifact.envelopeFingerprint!==chunk.envelopeFingerprint)throw Error('handover_artifact_readback_mismatch');
        await journal.transition(record,'RECONCILED');
      }
    }
  }
}

export async function reconcileHandoverPackageExport(
  record: OfflineJournalRecord,
  authority: QueueIdentity = record.identity,
): Promise<OfflineJournalRecord> {
  if (authority !== record.identity && !sameOfflinePartition(record.identity, authority)) {
    throw Error('offline_session_changed');
  }
  crewReadGuard(authority);
  const pkgId = String(record.proof.packageId ?? '');
  if (!isCrewResourceId(pkgId)) throw Error('handover_export_source_required');
  const detail = await readOfflineResource<OfflinePackageDetail>(authority, record.projectId, 'packages', pkgId);
  crewReadGuard(authority);
  if (
    detail.id !== pkgId ||
    detail.projectId !== record.projectId ||
    detail.originalActorId !== record.identity.actor ||
    detail.sourceDeviceRegistrationId !== record.proof.registrationId ||
    detail.sourceBatchId !== record.proof.sourceBatchId ||
    detail.manifestHash !== record.proof.manifestHash ||
    detail.payloadHash !== record.proof.payloadHash
  ) {
    throw Error('handover_package_readback_mismatch');
  }
  const journal = await openOfflineJournal(authority);
  const received = record.phase === 'RECEIVED' ? record : await journal.transition(record, 'RECEIVED', detail);
  return journal.transition(received, 'RECONCILED', detail);
}

function descriptorsMatchScope(descriptors: OfflineRecord[], scopeItems: OfflineGrantItemScope[]): boolean {
  if (descriptors.length !== scopeItems.length) return false;
  return descriptors.every((d) =>
    scopeItems.filter((s) =>
      s.originId === d.originId &&
      s.kind === d.kind &&
      s.corePayloadHash === d.corePayloadHash &&
      s.envelopeHash === d.envelopeHash &&
      s.taskId === d.taskId &&
      s.assignmentId === d.assignmentId &&
      s.snapshotId === d.snapshotId &&
      (s.repairResourceId ?? null) === (d.repairResourceId ?? null),
    ).length === 1,
  );
}

/** Verifies Supervisor grant, trusted sender key, native cipher decryption and exact manifest/scope bindings before import. */
export async function inspectAndOpenHandoverPackage(
  identity: QueueIdentity,
  projectId: string,
  packageId: string,
  grantId: string,
  trustedSenderSigningPublicKey: string,
  localEnvelopeJson?: string,
): Promise<HandoverOpenedPackage> {
  requireOfflineNativeAcceptance(identity);
  crewReadGuard(identity);
  if (!isCrewResourceId(projectId) || !isCrewResourceId(packageId) || !isCrewResourceId(grantId)) {
    throw Error('offline_resource_source_required');
  }
  if(trustedSenderSigningPublicKey)offlineSigningPublicKey(trustedSenderSigningPublicKey);

  const native = crewOfflineNative(identity);
  const probe = await inspectOfflineDevice(identity);
  crewReadGuard(identity);
  if (!native || !probe.deviceId || !probe.capability.signingUsable || !probe.capability.agreementUsable) {
    throw Error('BLOCKED_NATIVE');
  }
  const localRegId = await findRegisteredId(identity, projectId);
  const local = await readLocalOfflineSources(identity, projectId, localRegId, probe.deviceId);
  crewReadGuard(identity);
  validateDevice(local.device, identity, localRegId, probe.deviceId);
  const binding = deviceBinding(identity, probe.deviceId);
  const keys = await native.publicKeys(binding);
  crewReadGuard(identity);
  if (keys.signingPublicKey !== local.device.signingPublicKey || keys.encryptionPublicKey !== local.device.encryptionPublicKey) {
    throw Error('offline_device_key_mismatch');
  }

  const grant=await readActiveHandoverGrant(identity,projectId,packageId,grantId,localRegId);

  const pkg = await readOfflineResource<OfflinePackageDetail>(identity, projectId, 'packages', packageId);
  crewReadGuard(identity);
  if (
    !pkg ||
    pkg.id !== packageId ||
    pkg.projectId !== projectId ||
    pkg.originalActorId !== grant.sourceActorId ||
    pkg.sourceDeviceRegistrationId !== grant.sourceDeviceRegistrationId ||
    pkg.manifestHash !== grant.manifestHash
  ) {
    throw Error('handover_package_mismatch');
  }

  const registeredEnvelope=authenticatedPackageEnvelope(pkg);
  const registeredSender=registeredEnvelope.senderSigningPublicKey;
  if(trustedSenderSigningPublicKey&&trustedSenderSigningPublicKey!==registeredSender)throw Error('handover_source_signature_invalid');
  if (localEnvelopeJson?.trim()) {
    const localEnvelope=JSON.parse(localEnvelopeJson) as HandoverEnvelope;
    if(localEnvelope.signature!==registeredEnvelope.signature||unsignedEnvelope(localEnvelope)!==unsignedEnvelope(registeredEnvelope)){
      throw Error('handover_package_mismatch');
    }
  }

  if ((await generateChecksum(pkg.signedManifestJson)) !== pkg.manifestHash) {
    throw Error('handover_manifest_hash_mismatch');
  }
  const sourceSigValid = await native.verifyManifest(registeredSender, pkg.signedManifestJson, pkg.sourceSignature);
  crewReadGuard(identity);
  if (!sourceSigValid) throw Error('handover_source_signature_invalid');

  const payloadB64 = await native.openPackage(binding, pkg.cipherPackageJson, registeredSender);
  crewReadGuard(identity);
  const attachedPayloadJson = bytesToUtf8(offlineBase64BytesUnbounded(payloadB64));
  if ((await generateChecksum(attachedPayloadJson)) !== pkg.payloadHash) {
    throw Error('handover_payload_hash_mismatch');
  }

  const attached = parseOfflineAttachedPreservingDecimals(attachedPayloadJson) as {
    batchId?: string;
    sourceDeviceRegistrationId?: string;
    operations?: OfflineRecord[];
    signature?: string;
  };
  if (
    attached.batchId !== pkg.sourceBatchId ||
    attached.sourceDeviceRegistrationId !== pkg.sourceDeviceRegistrationId ||
    attached.signature !== pkg.sourceSignature ||
    !Array.isArray(attached.operations) ||
    attached.operations.length < 1
  ) {
    throw Error('handover_payload_mismatch');
  }

  const descriptors: OfflineRecord[] = [];
  for (const op of attached.operations) {
    if (op.originalActorId !== pkg.originalActorId) throw Error('handover_payload_mismatch');
    descriptors.push(await describeOfflineOperation(op, generateChecksum));
    crewReadGuard(identity);
  }
  const rebuiltManifest = canonicalOfflineManifest(projectId, pkg.sourceBatchId, pkg.sourceDeviceRegistrationId, descriptors);
  if (rebuiltManifest !== pkg.signedManifestJson||
    `{"batchId":${offlineWebString(pkg.sourceBatchId)},"sourceDeviceRegistrationId":${offlineWebString(pkg.sourceDeviceRegistrationId)},"operations":[${attached.operations.map(serializeOfflineOperation).join(',')}],"signature":${offlineWebString(pkg.sourceSignature)}}`!==attachedPayloadJson) {
    throw Error('handover_manifest_mismatch');
  }

  const scopeItems = (JSON.parse(grant.scopeJson) as { items?: OfflineGrantItemScope[] })?.items;
  if (!Array.isArray(scopeItems) || !descriptorsMatchScope(descriptors, scopeItems)) {
    throw Error('handover_grant_scope_mismatch');
  }

  return {
    projectId,
    packageDetail: pkg,
    grantDetail: grant,
    attachedPayloadJson,
    operations: attached.operations,
    descriptors,
    localRegistrationId: localRegId,
    deviceId: probe.deviceId,
  };
}

function offlineBase64BytesUnbounded(b64: string, maxBytes=16*1024*1024): Uint8Array {
  if (!b64 || b64.length>4*Math.ceil(maxBytes/3)||!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)||b64.length%4!==0) {
    throw Error('offline_base64_invalid');
  }
  if (b64.length <= 172) return offlineBase64(b64);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const clean = b64.replace(/=+$/, '');
  const padLen = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  const out = new Uint8Array(Math.floor((b64.length * 3) / 4) - padLen);
  if(out.length>maxBytes)throw Error('offline_base64_bound');
  let idx = 0;
  let bits = 0;
  let val = 0;
  for (let i = 0; i < clean.length; i++) {
    val = (val << 6) | alphabet.indexOf(clean[i]);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[idx++] = (val >> bits) & 0xff;
    }
  }
  if(bits&&(val&((1<<bits)-1)))throw Error('offline_base64_noncanonical');
  return out;
}

export async function readHandoverCapture(record:OfflineJournalRecord,identity:QueueIdentity,taskId:string,evidence:OfflineRecord) {
  if(record.proof.kind!=='handover-import'||record.phase!=='RECEIVED'||!sameOfflinePartition(record.identity,identity))throw Error('handover_import_source_required');
  const projectId=record.projectId,packageId=String(record.proof.packageId),registrationId=String(record.proof.registrationId);
  const grant=await readActiveHandoverGrant(identity,projectId,packageId,String(record.proof.grantId),registrationId);
  const pkg=await readOfflineResource<OfflinePackageDetail>(identity,projectId,'packages',packageId);crewReadGuard(identity);
  if(pkg.id!==packageId||pkg.projectId!==projectId||pkg.sourceBatchId!==record.proof.sourceBatchId||pkg.payloadHash!==record.proof.payloadHash||
    pkg.originalActorId!==record.proof.sourceActorId||pkg.originalActorId!==grant.sourceActorId||
    pkg.sourceDeviceRegistrationId!==record.proof.sourceDeviceRegistrationId||pkg.sourceDeviceRegistrationId!==grant.sourceDeviceRegistrationId||
    pkg.manifestHash!==record.proof.manifestHash||pkg.manifestHash!==grant.manifestHash)throw Error('handover_package_mismatch');
  const parent=authenticatedPackageEnvelope(pkg);
  const native=crewOfflineNative(identity),probe=await inspectOfflineDevice(identity);crewReadGuard(identity);
  if(!native||!probe.deviceId||!probe.capability.signingUsable||!probe.capability.agreementUsable)throw Error('BLOCKED_NATIVE');
  const local=await readLocalOfflineSources(identity,projectId,registrationId,probe.deviceId);crewReadGuard(identity);
  validateDevice(local.device,identity,registrationId,probe.deviceId);
  const binding=deviceBinding(identity,probe.deviceId),keys=await native.publicKeys(binding);crewReadGuard(identity);
  const fingerprint=recipientKeyFingerprint(local.device.encryptionPublicKey);
  if(keys.signingPublicKey!==local.device.signingPublicKey||keys.encryptionPublicKey!==local.device.encryptionPublicKey||
    !parent.recipients.some(w=>w.actorId===identity.actor&&w.deviceId===probe.deviceId&&w.recipientKeyFingerprint===fingerprint))throw Error('offline_device_key_mismatch');
  const captureId=requireGuid(evidence.captureOriginId,'handover_artifact_manifest_invalid');
  const firstId=await handoverArtifactId(packageId,captureId,0);
  const readArtifact=async(id:string)=>{
    try{return await readOfflineResource<CaptureArtifact>(identity,projectId,'artifacts',id);}
    catch(error){
      crewReadGuard(identity);
      if((error as {response?:{status?:number}})?.response?.status===404)throw Error('handover_artifact_waiting');
      throw error;
    }
  };
  const first=await readArtifact(firstId);crewReadGuard(identity);
  const {manifest}=JSON.parse(first.signedManifestJson) as {manifest:OfflineCaptureManifest};
  const canonical=canonicalCaptureManifest(manifest);
  if(canonical!==first.signedManifestJson||manifest.parentPackageId!==packageId||manifest.parentManifestHash!==pkg.manifestHash||
    manifest.projectId!==projectId||manifest.originalActorId!==pkg.originalActorId||manifest.sourceDeviceRegistrationId!==pkg.sourceDeviceRegistrationId||
    manifest.captureOriginId!==captureId||manifest.taskId!==taskId||manifest.purpose!==evidence.purpose||manifest.mediaType!==evidence.mediaType||
    manifest.fileChecksum!==evidence.checksumSha256||(evidence.sizeBytes!=null&&manifest.fileSize!==evidence.sizeBytes)||
    manifest.chunks[0].artifactId!==firstId||manifest.chunks.some(c=>c.length>ARTIFACT_CHUNK_BYTES))throw Error('handover_artifact_manifest_invalid');
  const manifestHash=await generateChecksum(canonical);crewReadGuard(identity);
  offlineP1363(first.manifestSignature);
  if(!await native.verifyManifest(parent.senderSigningPublicKey,canonical,first.manifestSignature))throw Error('handover_source_signature_invalid');
  crewReadGuard(identity);
  const {sha256HexOfBytes}=await import('./uploads');
  const bytes=new Uint8Array(manifest.fileSize);
  try{
    for(const chunk of manifest.chunks){
      const artifact=chunk.index===0?first:await readArtifact(chunk.artifactId);crewReadGuard(identity);
      if(artifact.id!==chunk.artifactId||artifact.projectId!==projectId||artifact.parentPackageId!==packageId||artifact.captureOriginId!==captureId||
        artifact.taskId!==taskId||artifact.originalActorId!==pkg.originalActorId||artifact.sourceDeviceRegistrationId!==pkg.sourceDeviceRegistrationId||
        artifact.chunkIndex!==chunk.index||artifact.chunkOffset!==chunk.offset||artifact.chunkLength!==chunk.length||
        artifact.plaintextChecksum!==chunk.plaintextChecksum||artifact.envelopeFingerprint!==chunk.envelopeFingerprint||
        artifact.manifestHash!==manifestHash||artifact.signedManifestJson!==canonical||artifact.manifestSignature!==first.manifestSignature||
        artifact.cipherEnvelopeJson.length>4*Math.ceil(ARTIFACT_CHUNK_BYTES/3)+32768)throw Error('handover_artifact_readback_mismatch');
      const envelope=JSON.parse(artifact.cipherEnvelopeJson) as HandoverEnvelope,header=envelope.header;
      if(header.packageId!==chunk.artifactId||header.projectId!==projectId||header.originalActorId!==pkg.originalActorId||
        header.sourceDeviceId!==parent.header.sourceDeviceId||header.originIds.length!==1||header.originIds[0]!==captureId||
        header.payloadSha256!==chunk.plaintextChecksum||envelope.senderSigningPublicKey!==parent.senderSigningPublicKey||
        await sha256HexOfBytes(utf8ToBytes(unsignedEnvelope(envelope)))!==chunk.envelopeFingerprint)throw Error('handover_artifact_readback_mismatch');
      crewReadGuard(identity);
      const plaintext=offlineBase64BytesUnbounded(await native.openPackage(binding,artifact.cipherEnvelopeJson,parent.senderSigningPublicKey),chunk.length);
      try{
        crewReadGuard(identity);
        if(plaintext.length!==chunk.length||await sha256HexOfBytes(plaintext)!==chunk.plaintextChecksum)throw Error('handover_artifact_checksum_mismatch');
        crewReadGuard(identity);bytes.set(plaintext,chunk.offset);
      }finally{plaintext.fill(0);}
    }
    if(await sha256HexOfBytes(bytes)!==manifest.fileChecksum)throw Error('handover_artifact_checksum_mismatch');
    crewReadGuard(identity);
    return {bytes,manifest};
  }catch(error){bytes.fill(0);throw error;}
}

/** Signs canonical recipient import endorsement and persists durable journal row before POST /offline/import. */
export async function prepareHandoverImport(
  identity: QueueIdentity,
  projectId: string,
  opened: HandoverOpenedPackage,
): Promise<OfflineJournalRecord> {
  requireOfflineNativeAcceptance(identity);
  crewReadGuard(identity);
  if (!opened || opened.projectId !== projectId || opened.grantDetail.recipientActorId !== identity.actor) {
    throw Error('handover_grant_mismatch');
  }
  const native = crewOfflineNative(identity);
  const probe = await inspectOfflineDevice(identity);
  crewReadGuard(identity);
  if (!native || probe.deviceId !== opened.deviceId || !probe.capability.signingUsable || !probe.capability.agreementUsable) {
    throw Error('BLOCKED_NATIVE');
  }
  const local = await readLocalOfflineSources(identity, projectId, opened.localRegistrationId, probe.deviceId);
  crewReadGuard(identity);
  validateDevice(local.device, identity, opened.localRegistrationId, probe.deviceId);
  const journal=await openOfflineJournal(identity);
  const existing=(await journal.list()).find(r=>r.projectId===projectId&&r.proof.kind==='handover-import'&&
    r.proof.packageId===opened.packageDetail.id&&r.proof.grantId===opened.grantDetail.id&&r.proof.registrationId===opened.localRegistrationId&&
    r.proof.payloadHash===opened.packageDetail.payloadHash);
  crewReadGuard(identity);
  if(existing)return existing;

  const importBatchId = uuidv4();
  const claim = canonicalRecipientImportClaim({
    projectId,
    packageId: opened.packageDetail.id,
    grantId: opened.grantDetail.id,
    importBatchId,
    recipientDeviceRegistrationId: opened.localRegistrationId,
    attachedSourcePayloadHash: opened.packageDetail.payloadHash,
  });
  const binding = deviceBinding(identity, probe.deviceId);
  const recipientSignature = await native.signManifest(binding, claim);
  crewReadGuard(identity);
  offlineP1363(recipientSignature);
  if (!(await native.verifyManifest(local.device.signingPublicKey, claim, recipientSignature))) {
    throw Error('offline_signature_self_verify_failed');
  }

  const serializedOps = opened.operations.map((op) => serializeOfflineOperation(op)).join(',');
  const importBody =
    `{"batchId":${offlineWebString(importBatchId)}` +
    `,"packageId":${offlineWebString(opened.packageDetail.id)}` +
    `,"grantId":${offlineWebString(opened.grantDetail.id)}` +
    `,"recipientDeviceRegistrationId":${offlineWebString(opened.localRegistrationId)}` +
    `,"operations":[${serializedOps}]` +
    `,"sourceSignature":${offlineWebString(opened.packageDetail.sourceSignature)}` +
    `,"recipientSignature":${offlineWebString(recipientSignature)}}`;
  return journal.prepare({
    id: uuidv4(),
    identity,
    projectId,
    path: `${offlineProjectPath(projectId)}/import`,
    key: uuidv4(),
    body: importBody,
    proof: {
      kind: 'handover-import',
      importBatchId,
      packageId: opened.packageDetail.id,
      grantId: opened.grantDetail.id,
      registrationId: opened.localRegistrationId,
      sourceBatchId: opened.packageDetail.sourceBatchId,
      sourceDeviceRegistrationId: opened.packageDetail.sourceDeviceRegistrationId,
      sourceActorId: opened.packageDetail.originalActorId,
      manifestHash: opened.packageDetail.manifestHash,
      payloadHash: opened.packageDetail.payloadHash,
      descriptors: opened.descriptors,
    },
  });
}

export async function sendHandoverImportIntent(
  record: OfflineJournalRecord,
  authority: QueueIdentity = record.identity,
): Promise<OfflineJournalRecord> {
  return withHandoverLock(record,()=>sendRetainedHandoverImport(record,authority));
}

async function sendRetainedHandoverImport(record:OfflineJournalRecord,authority:QueueIdentity):Promise<OfflineJournalRecord> {
  if (authority !== record.identity && !sameOfflinePartition(record.identity, authority)) {
    throw Error('offline_session_changed');
  }
  requireOfflineNativeAcceptance(authority);
  crewReadGuard(authority);
  const base = offlineProjectPath(record.projectId);
  if (record.proof.kind !== 'handover-import' || record.path !== `${base}/import`) {
    throw Error('handover_import_source_required');
  }
  const current = (await (await openOfflineJournal(authority)).list()).find((r) => r.id === record.id);
  if (!current || current.body !== record.body || current.key !== record.key || JSON.stringify(current.proof) !== JSON.stringify(record.proof)) {
    throw Error('handover_import_source_changed');
  }
  if (current.phase === 'RECONCILED') return current;
  if (current.phase === 'RECEIVED') return continueHandoverImport(current, authority);
  if (!['PREPARED', 'UNKNOWN_OUTCOME', 'IN_FLIGHT'].includes(current.phase)) {
    throw Error('handover_import_phase_invalid');
  }
  const start = current.phase === 'IN_FLIGHT'
    ? await (await openOfflineJournal(authority)).transition(current, 'UNKNOWN_OUTCOME')
    : current;
  const received = await dispatchHandoverPost(start, authority);
  return continueHandoverImport(received, authority);
}

async function continueHandoverImport(record:OfflineJournalRecord,authority:QueueIdentity) {
  const reconciled=await reconcileHandoverImport(record,authority);crewReadGuard(authority);
  if(reconciled.phase==='RECONCILED'||reconciled.terminalItems?.length)return reconciled;
  const pending=(reconciled.receipt as OfflineBatchReceipt).items.some(i=>
    !reconciled.verifiedItems?.some(v=>v.originId===i.originId)&&!i.durableAcknowledgment&&i.state==='PENDING_DEPENDENCY'&&
    ['evidence_upload_required','evidence_verification_pending'].includes(i.code??''));
  if(!pending)return reconciled;
  await (await import('./crewOfflineAdmission')).resumeSignedEvidence(reconciled,authority);crewReadGuard(authority);
  const received=await dispatchHandoverPost(reconciled,authority);
  return reconcileHandoverImport(received,authority);
}

export async function reconcileHandoverImport(
  record: OfflineJournalRecord,
  authority: QueueIdentity = record.identity,
): Promise<OfflineJournalRecord> {
  if (authority !== record.identity && !sameOfflinePartition(record.identity, authority)) {
    throw Error('offline_session_changed');
  }
  crewReadGuard(authority);
  if (record.phase !== 'RECEIVED' || record.proof.kind !== 'handover-import') {
    throw Error('offline_batch_receipt_required');
  }
  const received = record.receipt as OfflineBatchReceipt;
  validateBatch(received);
  const readback = await readOfflineResource<OfflineBatchReceipt>(authority, record.projectId, 'batches', received.batchId);
  validateBatch(readback);
  const expected = record.proof.descriptors as OfflineRecord[];
  if (readback.batchId !== received.batchId || received.batchId!==record.proof.importBatchId||
    readback.items.length !== expected.length || received.items.length !== expected.length) {
    throw Error('offline_batch_readback_mismatch');
  }
  const journal = await openOfflineJournal(authority);
  let next = record;
  let verifiedCount = 0;
  for (const d of expected) {
    const a = received.items.find((i) => i.originId === d.originId);
    const b = readback.items.find((i) => i.originId === d.originId);
    if (!a || !b || a.kind !== d.kind || b.kind !== d.kind) throw Error('offline_batch_readback_mismatch');
    if (isTerminalOfflineItem(b, d)) {
      const origin = await readOfflineResource<OfflineItemReceipt>(authority, record.projectId, 'origins', String(d.originId));
      crewReadGuard(authority);
      if(!isTerminalOfflineItem(origin,d)||origin.state!==b.state||origin.code!==b.code||origin.serverReceivedAt!==b.serverReceivedAt)
        throw Error('offline_origin_readback_mismatch');
      next = await journal.checkpointTerminal(next, {
        originId: origin.originId,
        kind: origin.kind,
        serverBatchId: received.batchId,
        state: origin.state as 'REJECTED' | 'CONFLICT' | 'STALE_SNAPSHOT',
        code: origin.code,
        serverReceivedAt: origin.serverReceivedAt,
      });
      continue;
    }
    const wasDurable=isDurableOfflineItem(a,d);
    if((a.durableAcknowledgment||['COMMITTED','REPLAYED'].includes(a.state))&&!wasDurable)throw Error('offline_batch_readback_mismatch');
    if (!isDurableOfflineItem(b, d)) {
      if(wasDurable||b.durableAcknowledgment||['COMMITTED','REPLAYED'].includes(b.state))throw Error('offline_batch_readback_mismatch');
      continue;
    }
    if(wasDurable&&a.canonicalOriginId!==b.canonicalOriginId)throw Error('offline_origin_readback_mismatch');
    const origin = await readOfflineResource<OfflineItemReceipt>(authority, record.projectId, 'origins', String(d.originId));
    crewReadGuard(authority);
    if (!isDurableOfflineItem(origin, d) || origin.canonicalOriginId !== b.canonicalOriginId) {
      throw Error('offline_origin_readback_mismatch');
    }
    next = await journal.checkpoint(next, [toVerifiedOfflineObservation(origin, received.batchId)]);
    verifiedCount++;
  }
  return verifiedCount === expected.length ? journal.transition(next, 'RECONCILED', readback) : next;
}

export function handoverErrorMessage(error: unknown): string {
  const err = error as { message?: string; code?: string; response?: { status?: number; data?: { code?: string } } } | undefined;
  const apiCode = err?.response?.data?.code ?? '';
  const msg = err?.message ?? '';
  const status = err?.response?.status;
  if (apiCode === 'handover_grant_revoked' || msg === 'handover_grant_revoked') {
    return 'Ủy quyền bàn giao đã bị giám sát viên thu hồi.';
  }
  if (apiCode === 'handover_grant_expired' || msg === 'handover_grant_expired') {
    return 'Ủy quyền bàn giao đã hết hạn. Cần xin cấp lại ủy quyền mới.';
  }
  if(msg==='handover_artifact_waiting')return 'Hồ sơ đang chờ thiết bị gửi đăng ký đủ ảnh mã hóa. Có thể tiếp tục với cùng gói và ủy quyền.';
  if(msg==='handover_artifact_source_missing')return 'Thiết bị gửi thiếu ảnh gốc trong kho mã hóa. Gói bàn giao vẫn chờ ảnh.';
  if(['handover_artifact_manifest_invalid','handover_artifact_readback_mismatch','handover_artifact_checksum_mismatch'].includes(msg))
    return 'Ảnh mã hóa hoặc thông tin đối soát của ảnh không khớp với hồ sơ đã ký.';
  if(msg==='handover_previous_intent_requires_reconciliation')return 'Đã có lượt bàn giao cho gói thao tác này. Cần đối soát lượt đã lưu trước khi tiếp tục.';
  if(apiCode==='upload_session_not_uploadable'||msg==='field_upload_not_uploadable')return 'Phiên tải ảnh đã hết hạn hoặc không còn cho phép tải. Hồ sơ đang chờ xử lý.';
  if (apiCode === 'offline_key_revoked' || msg === 'offline_device_invalid_or_revoked') {
    return 'Khóa thiết bị đã bị thu hồi hoặc không còn hiệu lực.';
  }
  if (msg === 'handover_source_signature_invalid' || msg === 'handover_payload_hash_mismatch' || msg === 'handover_manifest_hash_mismatch' || msg === 'offline_signature_self_verify_failed' || apiCode === 'offline_signature_invalid') {
    return 'Chữ ký hoặc nội dung gói mã hóa không hợp lệ; dữ liệu có thể đã bị sửa đổi.';
  }
  if (msg === 'handover_source_batch_invalid') {
    return 'Không tìm thấy gói thao tác đã ký hợp lệ trên thiết bị để đóng gói bàn giao.';
  }
  if (msg === 'handover_seal_validation_failed' || msg === 'invalid_handover_package') {
    return 'Gói mã hóa đầu cuối chưa đạt kiểm tra cấu trúc hoặc chữ ký native.';
  }
  if (msg === 'offline_device_key_mismatch' || msg === 'offline_verified_device_not_downloaded' || msg === 'offline_device_revocation_requires_online_check') {
    return 'Thông tin đăng ký thiết bị hoặc khóa ký chưa đồng bộ. Hãy kiểm tra lại trạng thái thiết bị offline.';
  }
  if (msg === 'handover_grant_mismatch' || msg === 'handover_grant_scope_mismatch' || msg === 'handover_package_mismatch') {
    return 'Gói bàn giao không khớp với ủy quyền, thiết bị nhận hoặc phạm vi được cấp.';
  }
  if (msg === 'handover_recipient_invalid' || msg === 'handover_recipients_required' || msg === 'handover_recipient_duplicate') {
    return 'Thông tin khóa công khai người nhận không hợp lệ hoặc bị trùng lặp.';
  }
  if (msg === 'BLOCKED_NATIVE' || msg === 'BLOCKED_QA_NATIVE') {
    return 'Thiết bị chưa đáp ứng khóa bảo mật native cho bàn giao mã hóa.';
  }
  if (status === 400 || apiCode === 'validation_error' || msg === 'offline_intent_invalid') {
    return 'Dữ liệu yêu cầu bàn giao chưa hợp lệ hoặc chưa khớp định dạng máy chủ.';
  }
  if (status === 401 || msg === 'offline_session_changed' || msg === 'crew_session_invalid') {
    return 'Phiên đăng nhập đã thay đổi hoặc hết hạn. Hãy đăng nhập lại.';
  }
  if (status === 403 || apiCode === 'access_forbidden' || apiCode === 'offline_admission_proof_unavailable') {
    return 'Tài khoản hoặc thiết bị hiện tại không có quyền thực hiện bàn giao này.';
  }
  if (status === 404 || apiCode === 'not_found') {
    return 'Không tìm thấy gói bàn giao hoặc ủy quyền trên máy chủ.';
  }
  if (status === 409 || apiCode === 'origin_content_conflict' || apiCode === 'concurrency_conflict' || apiCode === 'idempotency_key_reused') {
    return 'Dữ liệu gói bàn giao bị xung đột hoặc đã được đăng ký trước đó.';
  }
  if (!err?.response && (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED' || /network|timeout/i.test(msg))) {
    return 'Không có kết nối mạng. Dữ liệu và lệnh bàn giao vẫn được giữ an toàn.';
  }
  return 'Chưa thể hoàn tất bàn giao dữ liệu. Nhật ký gốc vẫn được giữ nguyên.';
}
