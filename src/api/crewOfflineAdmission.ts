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
  const body=JSON.parse(record.body),operation=(body.operations as OfflineRecord[])?.find(o=>o.originId===item.originId);
  const a=item.admission;
  if(!operation||!a||!guid(a.id)||item.kind!==operation.kind||a.projectId!==record.projectId||
    a.batchId!==(record.receipt as {batchId?:string})?.batchId||a.sourceBatchId!==body.batchId||
    a.sourceBatchId!==record.proof.sourceBatchId||a.sourceDeviceRegistrationId!==body.sourceDeviceRegistrationId||
    a.sourceDeviceRegistrationId!==record.proof.registrationId||a.originId!==operation.originId||
    a.taskId!==operation.taskId||a.assignmentId!==operation.assignmentId||a.snapshotId!==operation.snapshotId||
    a.originalActorId!==operation.originalActorId||a.originalActorId!==record.identity.actor||
    a.currentImporterId!==record.identity.actor||a.grantId!==null||
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
  if(!batch||batch.projectId!==draft.projectId||batch.proof.kind!=='signed-field-batch'||batch.phase!=='RECEIVED')return fail();
  if(identity.scope!==draft.scope){
    if(!sameOfflinePartition(batch.identity,identity))return fail();
    const regId=String(batch.proof.registrationId??'');
    const confirmed=rows.some(r=>r.projectId===batch.projectId&&r.phase==='RECONCILED'&&r.proof.kind==='session-confirm'&&
      r.identity.scope===identity.scope&&r.proof.registrationId===regId);
    const revoked=rows.some(r=>r.projectId===batch.projectId&&r.proof.kind==='revocation'&&r.proof.registrationId===regId);
    if(!confirmed||revoked)return fail();
  }
  const fresh=await readOfflineResource<OfflineItemReceipt>(identity,batch.projectId,'origins',mapping.originId);crewReadGuard(identity);
  const {operation,admission,evidence}=validateAdmissionSource(batch,fresh);
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
    const confirmed=validateAdmissionSource(batch,after).admission.captures.find(c=>c.captureOriginId===capture.id);
    if(confirmed?.uploadId!==upload.id||confirmed.fileId!==upload.fileId)return fail();
    return upload;
  }};
}

/** Serial continuation of only the pending evidence members. Uses the original
 * encrypted draft/vault, immutable journal and existing multipart uploader. */
export async function resumeSignedEvidence(record:OfflineJournalRecord,authority:QueueIdentity=record.identity,onStage?:(stage:import('./crewFieldDraft').FieldUploadStage)=>void):Promise<void> {
  if(!sameOfflinePartition(record.identity,authority))return fail();
  crewReadGuard(authority);
  if(record.phase!=='RECEIVED'||record.proof.kind!=='signed-field-batch')return fail();
  const receipt=record.receipt as {items:OfflineItemReceipt[]};
  for(const item of receipt.items){
    if(record.terminalItems?.some(t=>t.originId===item.originId)||record.verifiedItems?.some(v=>v.originId===item.originId))continue;
    if(item.durableAcknowledgment||item.state!=='PENDING_DEPENDENCY'||!['evidence_upload_required','evidence_verification_pending'].includes(item.code??''))continue;
    const fresh=await readOfflineResource<OfflineItemReceipt>(authority,record.projectId,'origins',item.originId);crewReadGuard(authority);
    if(fresh.durableAcknowledgment)continue;
    const {operation,admission,evidence}=validateAdmissionSource(record,fresh);
    const context={actor:record.identity.actor,scope:record.identity.scope,environment:record.identity.environment,projectId:record.projectId,taskId:String(operation.taskId)};
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
