import type { OfflineJournalRecord } from './crewOfflineJournal';
import { openOfflineJournal, sameOfflinePartition } from './crewOfflineJournal';
import { crewReadGuard } from './crewSafetyWorkflow';
import { currentQueueIdentity, type QueueIdentity } from '../offline/upload-queue';
import { dispatchOfflineIntent, readOfflineResource, type OfflineItemReceipt } from './crewOfflineWorkflow';
import { openFieldRuntime, uploadFieldCapture, assertFieldContext, type FieldDraft, type FieldCapture, type FieldRuntime } from './crewFieldDraft';
import type { OfflineRecord } from './crewOfflineProtocol';
import type { CrewUploadSessionDto } from './crewApi';
import { uuidv4 } from '../utils/uuid';

const guid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(v)&&!/^0+-0+-0+-0+-0+$/.test(v);
const fail=():never=>{throw Error('offline_admission_source_mismatch');};
const evidenceOf=(o:OfflineRecord):OfflineRecord[]=>((o.fieldSubmission??(o.repair as OfflineRecord)?.assessment) as OfflineRecord)?.evidence as OfflineRecord[];

/** Direct-sync only. Authenticated readback must match the immutable source in full.
 * Admission/mapping never supplies an effect ID, signature, or new signed payload. */
export function validateAdmissionSource(record:OfflineJournalRecord,item:OfflineItemReceipt) {
  return validateAdmissionRecord(record, item, false);
}

/** Imported handover admission: preserves originalActorId and requires exact non-null grantId. */
export function validateImportedAdmissionSource(record:OfflineJournalRecord,item:OfflineItemReceipt) {
  if(record.proof.kind!=='handover-import')return fail();
  return validateAdmissionRecord(record, item, true);
}

function validateAdmissionRecord(record:OfflineJournalRecord,item:OfflineItemReceipt,imported:boolean) {
  const body=JSON.parse(record.body),operation=(body.operations as OfflineRecord[])?.find(o=>o.originId===item.originId);
  const a=item.admission;
  const expectedBatchId = imported ? body.batchId : (record.receipt as {batchId?:string})?.batchId;
  const expectedSourceBatchId = imported ? String(record.proof.sourceBatchId ?? '') : body.batchId;
  const expectedSourceRegId = imported ? String(record.proof.sourceDeviceRegistrationId ?? '') : body.sourceDeviceRegistrationId;
  const expectedGrantId = imported ? String(body.grantId ?? '') : null;
  if(!operation||!a||!guid(a.id)||item.kind!==operation.kind||a.projectId!==record.projectId||
    a.batchId!==expectedBatchId||a.sourceBatchId!==expectedSourceBatchId||
    a.sourceBatchId!==record.proof.sourceBatchId||a.sourceDeviceRegistrationId!==expectedSourceRegId||
    (!imported && a.sourceDeviceRegistrationId!==record.proof.registrationId)||a.originId!==operation.originId||
    a.taskId!==operation.taskId||a.assignmentId!==operation.assignmentId||a.snapshotId!==operation.snapshotId||
    a.originalActorId!==operation.originalActorId||a.originalActorId!==(imported?record.proof.sourceActorId:record.identity.actor)||
    (imported&&(body.grantId!==record.proof.grantId||body.batchId!==record.proof.importBatchId||
      body.packageId!==record.proof.packageId||body.recipientDeviceRegistrationId!==record.proof.registrationId))||
    a.currentImporterId!==record.identity.actor||(imported ? (!guid(a.grantId) || a.grantId!==expectedGrantId) : a.grantId!==null)||
    !['WAITING_UPLOAD','WAITING_VERIFICATION','WAITING_DEPENDENCY','READY','UPLOAD_FAILED','COMMITTED'].includes(a.status))return fail();
  const evidence=evidenceOf(operation);
  if(!Array.isArray(evidence)||!Array.isArray(a.captures)||evidence.length!==a.captures.length||
    new Set(a.captures.map(c=>c.captureOriginId)).size!==a.captures.length)return fail();
  for(const e of evidence){
    const c=a.captures.find(c=>c.captureOriginId===e.captureOriginId);
    if(!c||!guid(c.captureOriginId)||c.purpose!==e.purpose||c.mediaType!==e.mediaType||c.checksumSha256!==e.checksumSha256||
      (c.declaredSizeBytes??null)!==(e.sizeBytes??null)||
      (c.fileId!==null&&!guid(c.fileId))||(c.uploadId!==null&&!guid(c.uploadId))||
      (e.fileId==null&&(c.fileId===null)!==(c.uploadId===null))||
      (e.fileId!=null&&c.fileId!==e.fileId)||
      (c.sizeBytes!=null&&e.sizeBytes!=null&&c.sizeBytes!==e.sizeBytes))return fail();
  }
  return {operation,admission:a,evidence};
}

/** Called by the existing multipart uploader on every resume, before touching bytes.
 * A cached admission alone never permits upload continuation. */
export async function admissionCaptureTransport(draft:FieldDraft,capture:FieldCapture,runtime:FieldRuntime) {
  assertFieldContext(draft,runtime);
  const identity=runtime.authority??currentQueueIdentity(),mapping=capture.offlineUpload;
  if(!identity||!mapping||identity.actor!==draft.actor||identity.environment!==draft.environment) return fail();
  crewReadGuard(identity);
  const journal=await openOfflineJournal(identity),rows=await journal.list();crewReadGuard(identity);
  const batch=rows.find(r=>r.id===mapping.batchIntentId);
  if(!batch||batch.projectId!==draft.projectId||!['signed-field-batch','handover-import'].includes(String(batch.proof.kind))||batch.phase!=='RECEIVED')return fail();
  const validate=batch.proof.kind==='handover-import'?validateImportedAdmissionSource:validateAdmissionSource;
  if(identity.scope!==draft.scope){
    if(!sameOfflinePartition(batch.identity,identity))return fail();
    const regId=String(batch.proof.registrationId??'');
    const confirmed=rows.some(r=>r.projectId===batch.projectId&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm'&&
      r.identity.scope===identity.scope&&r.proof.registrationId===regId);
    const revoked=rows.some(r=>r.projectId===batch.projectId&&r.proof.kind==='revocation'&&r.proof.registrationId===regId);
    if(!confirmed||revoked)return fail();
  }
  const fresh=await readOfflineResource<OfflineItemReceipt>(identity,batch.projectId,'origins',mapping.originId);crewReadGuard(identity);
  const {operation,admission,evidence}=validate(batch,fresh);
  const declaration=evidence.find(e=>e.captureOriginId===capture.id),remote=admission.captures.find(c=>c.captureOriginId===capture.id);
  if(!declaration||!remote||declaration.fileId!==null||admission.id!==mapping.admissionId||operation.taskId!==draft.taskId||
    capture.cancelState||capture.purpose!==declaration.purpose||capture.checksum!==declaration.checksumSha256||
    capture.mediaType!==declaration.mediaType||!Number.isSafeInteger(capture.size)||capture.size<=0||
    (declaration.sizeBytes!=null&&declaration.sizeBytes!==capture.size)||
    !['WAITING_UPLOAD','WAITING_VERIFICATION','WAITING_DEPENDENCY','READY'].includes(admission.status)||
    fresh.durableAcknowledgment||fresh.state!=='PENDING_DEPENDENCY'||
    !['evidence_upload_required','evidence_verification_pending'].includes(fresh.code??''))return fail();
  if(capture.upload&&(capture.upload.id!==remote.uploadId||capture.upload.fileId!==remote.fileId))return fail();
  const body=JSON.stringify({admissionId:admission.id,captureOriginId:capture.id,upload:{purpose:capture.purpose,projectId:draft.projectId,
    targetId:draft.taskId,fileName:`${capture.id}.${capture.mediaType==='image/png'?'png':'jpg'}`,mediaType:capture.mediaType,sizeBytes:capture.size,checksumSha256:capture.checksum}});
  const intent=await journal.prepare({id:mapping.createIntentId,identity,projectId:draft.projectId,path:'/offline/uploads',key:capture.createKey,body,
    proof:{kind:'admission-upload',batchIntentId:batch.id,originId:operation.originId,captureOriginId:capture.id,admissionId:admission.id}});crewReadGuard(identity);
  // Recover a lost create response through the fresh mapping, without creating another session.
  if(!capture.upload&&remote.uploadId&&remote.fileId){
    const upload=await runtime.api.getCrewUploadSession(remote.uploadId);crewReadGuard(identity);assertFieldContext(draft,runtime);
    if(upload.id!==remote.uploadId||upload.fileId!==remote.fileId)return fail();
    capture.upload=upload;capture.localOnly=false;await runtime.write(draft);crewReadGuard(identity);
  }
  return {create:async():Promise<CrewUploadSessionDto>=>{
    crewReadGuard(identity);assertFieldContext(draft,runtime);
    if(capture.upload)return capture.upload;
    // RECEIVED contains the original create receipt; uncertain dispatch reuses its exact body/key.
    const replay=intent.phase==='IN_FLIGHT'?await journal.transition(intent,'UNKNOWN_OUTCOME'):intent;
    const received=replay.phase==='RECEIVED'?replay:await dispatchOfflineIntent(replay,identity);crewReadGuard(identity);
    const upload=received.receipt as CrewUploadSessionDto;
    if(!upload||!guid(upload.id)||!guid(upload.fileId))return fail();
    const after=await readOfflineResource<OfflineItemReceipt>(identity,batch.projectId,'origins',mapping.originId);crewReadGuard(identity);
    const confirmed=validate(batch,after).admission.captures.find(c=>c.captureOriginId===capture.id);
    if(confirmed?.uploadId!==upload.id||confirmed.fileId!==upload.fileId)return fail();
    return upload;
  }};
}

/** Serial continuation of only the pending evidence members. Uses the original
 * encrypted draft/vault, immutable journal and existing multipart uploader. */
export async function resumeSignedEvidence(record:OfflineJournalRecord,authority:QueueIdentity=record.identity,onStage?:(stage:import('./crewFieldDraft').FieldUploadStage)=>void):Promise<void> {
  if(!sameOfflinePartition(record.identity,authority))return fail();
  crewReadGuard(authority);
  const imported=record.proof.kind==='handover-import';
  if(record.phase!=='RECEIVED'||(!imported&&record.proof.kind!=='signed-field-batch'))return fail();
  if(imported&&record.identity.scope!==authority.scope){
    const rows=await (await openOfflineJournal(authority)).list();crewReadGuard(authority);
    if(rows.some(r=>r.projectId===record.projectId&&r.proof.kind==='revocation'&&r.proof.registrationId===record.proof.registrationId)||
      !rows.some(r=>r.projectId===record.projectId&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm'&&
        r.identity.scope===authority.scope&&r.proof.registrationId===record.proof.registrationId))return fail();
  }
  const receipt=record.receipt as {items:OfflineItemReceipt[]};
  for(const item of receipt.items){
    if(record.terminalItems?.some(t=>t.originId===item.originId)||record.verifiedItems?.some(v=>v.originId===item.originId))continue;
    if(item.durableAcknowledgment||item.state!=='PENDING_DEPENDENCY'||!['evidence_upload_required','evidence_verification_pending'].includes(item.code??''))continue;
    const fresh=await readOfflineResource<OfflineItemReceipt>(authority,record.projectId,'origins',item.originId);crewReadGuard(authority);
    if(fresh.durableAcknowledgment)continue;
    const {operation,admission,evidence}=(imported?validateImportedAdmissionSource:validateAdmissionSource)(record,fresh);
    const context={actor:record.identity.actor,scope:record.identity.scope,environment:record.identity.environment,projectId:record.projectId,taskId:String(operation.taskId)};
    if(imported){
      for(const declaration of evidence){
        if(declaration.fileId===null)await uploadImportedCapture(record,authority,context,item.originId,admission.id,declaration,onStage);
      }
      continue;
    }
    const runtime=await openFieldRuntime(context,authority),draft=await runtime.read();crewReadGuard(authority);
    if(!draft)return fail();assertFieldContext(draft,runtime);
    for(const e of evidence){
      if(e.fileId!==null)continue;
      const index=draft.captures.findIndex(c=>c.id===e.captureOriginId),c=draft.captures[index];
      if(!c||c.cancelState||c.checksum!==e.checksumSha256||c.mediaType!==e.mediaType||c.purpose!==e.purpose||
        (e.sizeBytes!=null&&c.size!==e.sizeBytes))return fail();
      if(!c.offlineUpload){
        if(c.upload||c.uploadAttempt||c.localOnly!==true)return fail();
        c.offlineUpload={batchIntentId:record.id,originId:item.originId,admissionId:admission.id,createIntentId:uuidv4()};
        await runtime.write(draft);crewReadGuard(authority);
      }
      if(c.offlineUpload.batchIntentId!==record.id||c.offlineUpload.originId!==item.originId||c.offlineUpload.admissionId!==admission.id)return fail();
      await uploadFieldCapture(draft,index,runtime,undefined,onStage);crewReadGuard(authority);
    }
  }
}

/** Recipient transport uses a separate durable ledger. Native plaintext stays in memory for the verified upload. */
async function uploadImportedCapture(record:OfflineJournalRecord,authority:QueueIdentity,context:import('./crewFieldDraft').FieldContext,
  originId:string,admissionId:string,declaration:OfflineRecord,onStage?:(stage:import('./crewFieldDraft').FieldUploadStage)=>void){
  const captureId=declaration.captureOriginId;
  if(!guid(captureId))return fail();
  const {readHandoverCapture}=await import('./crewOfflineHandover');
  const {openDatabase,initDatabase}=await import('../offline/database');
  const base=await openFieldRuntime(context,authority);crewReadGuard(authority);
  const db=openDatabase();await initDatabase(db);crewReadGuard(authority);
  const key='handover-upload:'+JSON.stringify([context.environment,context.actor,context.projectId,record.id,originId,captureId]);
  const kind='C10BC_HANDOVER_UPLOAD_V1';
  const row=await db.getFirstAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id=? AND kind=?',key,kind);crewReadGuard(authority);
  let previous=row?.payload;
  let plaintext:Uint8Array|undefined;
  const runtime:FieldRuntime={...base,read:async()=>previous?JSON.parse(previous) as FieldDraft:null,
    bytes:async()=>{
      crewReadGuard(authority);
      plaintext??=(await readHandoverCapture(record,authority,context.taskId,declaration)).bytes;
      crewReadGuard(authority);return plaintext;
    },
    write:async draft=>{
      crewReadGuard(authority);assertFieldContext(draft,base);
      const payload=JSON.stringify(draft),now=new Date().toISOString();
      await db.withExclusiveTransactionAsync(async tx=>{
        crewReadGuard(authority);
        const result=previous===undefined
          ?await tx.runAsync('INSERT INTO local_draft (id,kind,payload,created_at,updated_at) VALUES (?,?,?,?,?)',key,kind,payload,now,now)
          :await tx.runAsync('UPDATE local_draft SET payload=?,updated_at=? WHERE id=? AND kind=? AND payload=?',payload,now,key,kind,previous);
        crewReadGuard(authority);if(result.changes!==1)throw Error('offline_journal_cas_failed');
      });
      crewReadGuard(authority);previous=payload;
    },
  };
  try{
    let draft=await runtime.read();crewReadGuard(authority);
    if(!draft){
      const opened=await readHandoverCapture(record,authority,context.taskId,declaration);
      plaintext=opened.bytes;crewReadGuard(authority);
      const m=opened.manifest;
      const capture:FieldCapture={id:captureId,uri:'',purpose:m.purpose,mediaType:m.mediaType,checksum:m.fileChecksum,size:m.fileSize,
        capturedAt:null,coordinates:null,createKey:uuidv4(),completeKey:uuidv4(),parts:[],localOnly:true,
        offlineUpload:{batchIntentId:record.id,originId,admissionId,createIntentId:uuidv4()}};
      draft={...context,captures:[capture],measurements:[],locationProof:null};
      await runtime.write(draft);
    }
    assertFieldContext(draft,runtime);
    const c=draft.captures[0],link=c?.offlineUpload;
    if(draft.captures.length!==1||!c||c.vault!==undefined||c.uri!==''||c.id!==captureId||c.checksum!==declaration.checksumSha256||
      c.mediaType!==declaration.mediaType||c.purpose!==declaration.purpose||(declaration.sizeBytes!=null&&c.size!==declaration.sizeBytes)||
      !link||link.batchIntentId!==record.id||link.originId!==originId||link.admissionId!==admissionId)return fail();
    await uploadFieldCapture(draft,0,runtime,undefined,onStage);crewReadGuard(authority);
  }finally{plaintext?.fill(0);}
}
