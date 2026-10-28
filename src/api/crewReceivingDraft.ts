import { openDatabase, initDatabase } from '../offline/database';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from './authApi';
import { apiClient } from './client';
import { isCrewResourceId, isRepairItemVersion } from './crewApi';

export interface ReceivingIdentity { actor: string; scope: string; environment: string; projectId: string }
export interface ReceivingCommand {
  identity: ReceivingIdentity; requestId: string; key: string; version: string;
  body: { claimedDeviceAt: null }; phase: 'PENDING' | 'CONFIRMED';
}
const KIND = 'H01_RECEIVING_ACK';
export function currentReceivingIdentity(projectId = ''): ReceivingIdentity | null {
  const s = useAuthStore.getState(), scope = passwordSessionIdentity(s.token);
  if (!s.user || !scope || JSON.parse(scope)[0] !== s.user.id || s.user.role_code !== 'REPAIR_CREW' ||
      s.user.must_change_password || !['AUTHENTICATED','REFRESHING'].includes(s.status) || (projectId !== '' && !isCrewResourceId(projectId))) return null;
  return { actor: s.user.id, scope, environment: apiClient.defaults.baseURL ?? '', projectId };
}
export function sameReceivingIdentity(a: ReceivingIdentity, b: ReceivingIdentity | null): boolean {
  return !!b && (['actor','scope','environment','projectId'] as const).every(k => a[k] === b[k]);
}
function valid(i: ReceivingIdentity) {
  const claims = JSON.parse(i.scope);
  if (![i.actor,i.projectId].every(isCrewResourceId) || !Array.isArray(claims) || claims.length !== 2 ||
      claims[0] !== i.actor || typeof claims[1] !== 'string' || !claims[1] || !/^https?:\/\/[^@?#\s]+$/.test(i.environment)) throw Error('receiving_identity_invalid');
}
function snapshot(c: ReceivingCommand): ReceivingCommand {
  valid(c.identity);
  if (!isCrewResourceId(c.requestId) || !isCrewResourceId(c.key) || !isRepairItemVersion(c.version) ||
      c.body?.claimedDeviceAt !== null || Object.keys(c.body).length !== 1 || !['PENDING','CONFIRMED'].includes(c.phase)) throw Error('receiving_journal_invalid');
  const {actor,scope,environment,projectId}=c.identity;
  return {identity:{actor,scope,environment,projectId},requestId:c.requestId,key:c.key,version:c.version,body:{claimedDeviceAt:null},phase:c.phase};
}
/** One immutable intent per request, retained across logout and restart; no destructive migration. */
export async function openReceivingJournal(identity: ReceivingIdentity, current = () => currentReceivingIdentity(identity.projectId)) {
  const i = {...identity}; valid(i);
  const guard=()=>{if(!sameReceivingIdentity(i,current()))throw Error('receiving_session_changed');};
  guard(); const db=openDatabase(); await initDatabase(db); guard();
  const id=(requestId:string)=>`h01ack:${JSON.stringify([i.environment,i.actor,i.projectId,requestId])}`;
  const read=async(requestId:string)=>{
    guard(); if(!isCrewResourceId(requestId))throw Error('receiving_identity_invalid');
    const rows=await db.getAllAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id = ? AND kind = ?',id(requestId),KIND);guard();
    if(!rows.length)return null;
    const raw=JSON.parse(rows[0].payload),c=snapshot(raw);
    if(JSON.stringify(c)!==JSON.stringify(raw) || c.identity.actor!==i.actor || c.identity.environment!==i.environment ||
       c.identity.projectId!==i.projectId || c.requestId!==requestId)throw Error('receiving_journal_invalid');
    return c;
  };
  return {read, async prepare(command:ReceivingCommand) {
    guard();const c=snapshot(command);
    if(!sameReceivingIdentity(c.identity,i)||c.phase!=='PENDING')throw Error('receiving_session_changed');
    await db.withExclusiveTransactionAsync(async tx=>{
      guard();const rows=await tx.getAllAsync<{payload:string}>('SELECT payload FROM local_draft WHERE id = ? AND kind = ?',id(c.requestId),KIND);guard();
      if(rows.length) {if(rows[0].payload!==JSON.stringify(c))throw Error('receiving_intent_immutable');return;}
      const now=new Date().toISOString();
      await tx.runAsync('INSERT INTO local_draft (id,kind,payload,created_at,updated_at) VALUES (?,?,?,?,?)',id(c.requestId),KIND,JSON.stringify(c),now,now);guard();
    });guard();return c;
  },async confirm(command:ReceivingCommand) {
    guard();const stored=await read(command.requestId);
    if(!stored || JSON.stringify(stored)!==JSON.stringify(command))throw Error('receiving_intent_immutable');
    const c={...stored,phase:'CONFIRMED' as const};
    await db.runAsync('UPDATE local_draft SET payload = ?, updated_at = ? WHERE id = ? AND kind = ? AND payload = ?',JSON.stringify(c),new Date().toISOString(),id(c.requestId),KIND,JSON.stringify(stored));
    guard();return c;
  }};
}
