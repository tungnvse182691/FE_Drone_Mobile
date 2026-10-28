/** Direct-sync v1 only. Source/provenance: tests/c10-reference/provenance.json.
 * No transport, native key generation or enrollment capability is granted here.
 * Decimal values use an explicit lexical wrapper to retain .NET decimal scale.
 * Doubles are deliberately bounded to ordinary fixed-point numbers; unsupported
 * scientific values fail closed until a separately verified number codec exists. */
export type DecimalToken = { decimal: string };
export type OfflineRecord = Record<string, unknown>;
export type Sha256 = (utf8: string) => Promise<string>;
type Field = readonly [string, string];
const fields = (text:string):Field[] => text.split(' ').map(x=>x.split(':') as unknown as Field);
const schemas:Record<string,Field[]> = {
 operation: fields('schemaVersion:int originId:guid effectId:guid kind:string originalActorId:guid sourceDeviceId:guid snapshotId:guid taskId:guid assignmentId:guid taskVersion:string corePayloadHash:string dependencies:guid[] claimedFinishedAt:date? fieldStart:start? fieldSubmission:submission? repair:repair? fieldAction:action?'),
 descriptor: fields('originId:guid effectId:guid kind:string envelopeHash:string corePayloadHash:string taskId:guid assignmentId:guid snapshotId:guid repairResourceId:guid?'),
 action: fields('reason:string assignedToUserId:guid? handover:handover?'),
 handover: fields('performedPortionState:string summary:string startOriginId:guid submissionIds:guid[] recipientUserId:guid?'),
 start: fields('originId:guid claimedAt:date deviceId:guid? monotonicMilliseconds:int? bootId:string? offlineProof:string?'),
 submission: fields('originId:guid startOriginId:guid parentSubmissionId:guid? measurements:measurement[]? evidence:evidence[]? locationProof:position? captureType:string repaired:bool? unrepairedReason:string? deviceId:guid?'),
 measurement: fields('sampleId:string type:string value:decimal? state:string unknownReason:string? dimension:string unit:string longitude:double? latitude:double? locationReason:string? instrument:string method:string notes:string?'),
 evidence: fields('captureOriginId:guid fileId:guid? purpose:string checksumSha256:string mediaType:string capturedAt:date? attemptChecklist:string?'),
 position: fields('kind:string checklist:string? longitude:double? latitude:double? observedSlabId:string? observedSegmentId:guid? observedRouteVersionId:guid? observedChainageMeters:double?'),
 repair: fields('resourceId:guid action:string start:repairStart? finish:repairFinish? assessment:assessment?'),
 repairStart: fields('originId:guid fieldFirstStartId:guid claimedAt:date assessmentId:guid deviceId:guid? monotonicMilliseconds:int? bootId:string?'),
 repairFinish: fields('originId:guid executionStartId:guid claimedAt:date deviceId:guid? monotonicMilliseconds:int? bootId:string?'),
 assessment: fields('originId:guid fieldFirstStartId:guid measurements:measurement[]? evidence:evidence[]? locationProof:position? deviceId:guid? stopConditions:conditions?'),
};
function fail():never { throw Error('offline_protocol_invalid_or_unproved'); }
export function offlineGuid(v:unknown):string {
 if(typeof v!=='string'||!/^\{?[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\}?$/i.test(v))return fail();
 if(v.startsWith('{')!==v.endsWith('}'))return fail();
 const n=v.replace(/[{}]/g,'').toLowerCase(); if(n==='00000000-0000-0000-0000-000000000000')return fail(); return n;
}
/** Web's default BasicLatin encoder, not UnsafeRelaxedJsonEscaping. */
export function offlineWebString(v:string):string {
 let result='"';
 for(let i=0;i<v.length;i++) {
  const n=v.charCodeAt(i),c=v[i];
  const short:Record<number,string>={8:'\\b',9:'\\t',10:'\\n',12:'\\f',13:'\\r',92:'\\\\'};
  if(short[n])result+=short[n];
  else if(n<32||n>126||[34,38,39,43,60,62,96].includes(n)) {
   if(n>=0xd800&&n<=0xdbff) { const next=v.charCodeAt(i+1); if(!(next>=0xdc00&&next<=0xdfff))return fail(); }
   if(n>=0xdc00&&n<=0xdfff) { const prev=v.charCodeAt(i-1);if(!(prev>=0xd800&&prev<=0xdbff))return fail(); }
   result+='\\u'+n.toString(16).toUpperCase().padStart(4,'0');
  } else result+=c;
 }
 return result+'"';
}
function date(v:unknown):string {
 if(typeof v!=='string')return fail();
 const m=/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,7}))?(Z|[+-]\d{2}:\d{2})$/.exec(v);if(!m)return fail();
 const t=m[1],offset=m[3]==='Z'?'+00:00':m[3],fraction=(m[2]??'').replace(/0+$/,'');
 const [y,mo,d,h,mi,se]=t.split(/[-T:]/).map(Number),[oh,om]=offset.slice(1).split(':').map(Number);
 if(y<1||mo<1||mo>12||d<1||d>new Date(Date.UTC(y<100?y+400:y,mo,0)).getUTCDate()||h>23||mi>59||se>59||oh>14||om>59||(oh===14&&om!==0))return fail();
 const utc=Date.parse(v);if(!Number.isFinite(utc)||utc<Date.parse('0001-01-01T00:00:00Z')||utc>Date.parse('9999-12-31T23:59:59.999Z'))return fail();
 return '"'+t+(fraction?'.'+fraction:'')+(oh===0&&om===0?'+00:00':offset)+'"';
}
function record(v:unknown):OfflineRecord { if(!v||typeof v!=='object'||Array.isArray(v))return fail();return v as OfflineRecord; }
function value(type:string,v:unknown):string {
 if(type.endsWith('?'))return v==null?'null':value(type.slice(0,-1),v);
 if(type.endsWith('[]')) { if(!Array.isArray(v))return fail();return '['+v.map(x=>value(type.slice(0,-2),x)).join(',')+']'; }
 if(type==='guid')return offlineWebString(offlineGuid(v));
 if(type==='date')return date(v);
 if(type==='string')return typeof v==='string'?offlineWebString(v):fail();
 if(type==='bool')return typeof v==='boolean'?String(v):fail();
 if(type==='int')return typeof v==='number'&&Number.isSafeInteger(v)?String(v):fail();
 if(type==='double') {
  if(typeof v!=='number'||!Number.isFinite(v)||Math.abs(v)>=1e15||(v!==0&&Math.abs(v)<0.0001))return fail();
  return Object.is(v,-0)?'-0':String(v);
 }
 if(type==='decimal') {
  const token=typeof v==='number'&&Number.isSafeInteger(v)?String(v):record(v).decimal;
  if(typeof token!=='string'||! /^-?(?:0|[1-9]\d*)(?:\.\d{1,28})?$/.test(token)||token.replace(/[-.]/g,'').length>28)return fail();
  return /^-0(?:\.0+)?$/.test(token)?token.slice(1):token;
 }
 if(type==='conditions') { const r=record(v);return '{'+Object.keys(r).map(k=>offlineWebString(k)+':'+value('bool?',r[k])).join(',')+'}'; }
 const fs=schemas[type];if(!fs)return fail();const r=record(v);
 if(Object.keys(r).some(k=>!fs.some(([name])=>name===k)))return fail();
 return '{'+fs.filter(([name])=>!(type==='assessment'&&name==='stopConditions'&&r[name]==null))
  .map(([name,t])=>offlineWebString(name)+':'+value(t,r[name])).join(',')+'}';
}
/** Preserve numeric identity and reject cyclic/non-data inputs before any await. */
function snapshotRecord(input:OfflineRecord):OfflineRecord {
 const seen=new Set<object>();let remaining=100000;
 function copy(v:unknown,depth:number):unknown {
  if(--remaining<0||depth>64)return fail();
  if(v===null||v===undefined||typeof v==='string'||typeof v==='boolean'||typeof v==='number')return v;
  if(typeof v!=='object'||seen.has(v))return fail();seen.add(v);
  let result:unknown;
  if(Array.isArray(v))result=v.map(x=>copy(x,depth+1));
  else { const r:OfflineRecord=Object.create(null);for(const k of Object.keys(v))r[k]=copy((v as OfflineRecord)[k],depth+1);result=r; }
  seen.delete(v);return result;
 }
 return record(copy(input,0));
}
export function serializeOfflineOperation(operation:OfflineRecord):string {return value('operation',operation);}
async function hash(bytes:string,sha:Sha256):Promise<string> {const h=await sha(bytes);if(!/^[a-f0-9]{64}$/.test(h))return fail();return h;}
export async function fieldCoreHash(operation:OfflineRecord,sha:Sha256):Promise<string> {
 const kind=operation.kind,key=kind==='FIELD_ACCEPT'?'fieldAction':kind==='FIELD_START'?'fieldStart':kind==='FIELD_SUBMISSION'?'fieldSubmission':fail();
 const type=kind==='FIELD_ACCEPT'?'action':kind==='FIELD_START'?'start':'submission';
 return hash('{"id":'+value('guid',operation.taskId)+',"input":'+value(type,operation[key])+',"originalActorId":'+value('guid',operation.originalActorId)+'}',sha);
}
export async function describeOfflineOperation(input:OfflineRecord,sha:Sha256):Promise<OfflineRecord> {
 // Snapshot first, so asynchronous hashing cannot observe caller mutations.
 const snapshot=snapshotRecord(input);
 const serialized=serializeOfflineOperation(snapshot),o=JSON.parse(serialized) as OfflineRecord;
 const origin=offlineGuid(o.originId);if(o.schemaVersion!==1||offlineGuid(o.effectId)!==origin||typeof o.corePayloadHash!=='string'||! /^[a-f0-9]{64}$/.test(o.corePayloadHash))return fail();
 if(typeof o.taskVersion!=='string'||! /^[A-Za-z0-9+/]{10}[AEIMQUYcgkosw048]=$/.test(o.taskVersion))return fail();
 const dependencies=o.dependencies as string[];
 if(dependencies.length>1000||new Set(dependencies).size!==dependencies.length||dependencies.includes(origin))return fail();
 const kind=o.kind;
 if(typeof kind!=='string')return fail();
 if(kind.startsWith('FIELD_')) {
  if(o.repair!==null)return fail();
  if(kind==='FIELD_ACCEPT') {
   const a=record(o.fieldAction);if(o.fieldStart!==null||o.fieldSubmission!==null||a.assignedToUserId!==null||a.handover!==null||typeof a.reason!=='string'||!a.reason.trim()||a.reason.length>2000)return fail();
  } else if(kind==='FIELD_START'||kind==='FIELD_SUBMISSION') {
   const b=record(kind==='FIELD_START'?o.fieldStart:o.fieldSubmission);
   if(o.fieldAction!==null||(kind==='FIELD_START'?o.fieldSubmission:o.fieldStart)!==null||b.originId!==origin||b.deviceId!==o.sourceDeviceId)return fail();
  } else return fail();
  // Hash original lexical decimal tokens, never a JS number roundtrip.
  if(await fieldCoreHash(snapshot,sha)!==o.corePayloadHash)return fail();
 } else {
  if(o.fieldAction!==null||o.fieldStart!==null||o.fieldSubmission!==null)return fail();
  const r=record(o.repair),map:Record<string,[string,string]>= {REPAIR_ASSESSMENT:['assessment','assessment'],REPAIR_EXECUTION_START:['execution-start','start'],REPAIR_EXECUTION_FINISH:['execution-finish','finish']};
  const pair=map[kind];if(!pair||r.action!==pair[0])return fail();const b=record(r[pair[1]]);
  if(['start','finish','assessment'].some(k=>k!==pair[1]&&r[k]!==null)||b.originId!==origin||b.deviceId!==o.sourceDeviceId)return fail();
  offlineGuid(b[pair[1]==='finish'?'executionStartId':'fieldFirstStartId']);if(pair[1]==='start')offlineGuid(b.assessmentId);
 }
 return {originId:origin,effectId:o.effectId,kind,envelopeHash:await hash(serialized,sha),corePayloadHash:o.corePayloadHash,taskId:o.taskId,assignmentId:o.assignmentId,snapshotId:o.snapshotId,repairResourceId:o.repair?record(o.repair).resourceId:null};
}
export function canonicalOfflineManifest(projectId:string,batchId:string,registrationId:string,items:OfflineRecord[]):string {
 if(items.length<1||items.length>1000)return fail();
 const sorted=items.map(i=>JSON.parse(value('descriptor',i)) as OfflineRecord).sort((a,b)=>String(a.originId).replace(/-/g,'')<String(b.originId).replace(/-/g,'')?-1:1);
 if(new Set(sorted.map(x=>x.originId)).size!==sorted.length)return fail();
 for(const d of sorted) { if(d.originId!==d.effectId||!['FIELD_ACCEPT','FIELD_START','FIELD_SUBMISSION','REPAIR_ASSESSMENT','REPAIR_EXECUTION_START','REPAIR_EXECUTION_FINISH'].includes(String(d.kind))||! /^[a-f0-9]{64}$/.test(String(d.envelopeHash))||! /^[a-f0-9]{64}$/.test(String(d.corePayloadHash)))return fail(); }
 return '{"schemaVersion":1,"projectId":'+value('guid',projectId)+',"sourceBatchId":'+value('guid',batchId)+',"sourceDeviceRegistrationId":'+value('guid',registrationId)+',"items":['+sorted.map(d=>value('descriptor',d)).join(',')+']}';
}
export async function canonicalOfflineAttached(batchId:string,registrationId:string,operations:OfflineRecord[],signature:string,sha:Sha256):Promise<string> {
 if(!signature.trim()||operations.length<1||operations.length>1000)return fail();
 const snapshots=operations.map(snapshotRecord);
 const bytes=snapshots.map(serializeOfflineOperation);
 const copies=bytes.map(s=>JSON.parse(s) as OfflineRecord);
 if(new Set(copies.map(o=>o.originId)).size!==copies.length)return fail();
 // Validate each source snapshot, preserving lexical tokens in the serialized bytes.
 for(const snapshot of snapshots)await describeOfflineOperation(snapshot,sha);
 return '{"batchId":'+value('guid',batchId)+',"sourceDeviceRegistrationId":'+value('guid',registrationId)+',"operations":['+bytes.join(',')+'],"signature":'+offlineWebString(signature)+'}';
}
