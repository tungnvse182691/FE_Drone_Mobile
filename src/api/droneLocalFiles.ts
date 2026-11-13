import { Directory, File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { openDatabase, initDatabase } from '../offline/database';
import { useAuthStore } from '../store/auth';
import { passwordSessionIdentity } from './authApi';
import { apiClient } from './client';
import { getOperatorSurveyTaskDetailReal } from './droneApi';

type Kind = 'VIDEO' | 'TELEMETRY';
export type DroneLocalFile = { schema: 1; key: string; actor: string; environment: string; session: string;
  taskId: string; projectId: string; taskVersion: string; kind: Kind; name: string; size: number;
  uri: string; partialUri: string; checksumSha256: string | null };
const KIND = 'DRONE_LOCAL_SOURCE';
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) && !v.startsWith('00000000-0000-0000-0000-');
const version = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9+/]{10}[AEIMQUYcgkosw048]=$/.test(v);

// Incremental SHA-256. File.readableStream() supplies bounded native chunks;
// no whole-file ArrayBuffer/base64 is created for large video files.
class Sha256 {
  private readonly h = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  private readonly w = new Uint32Array(64);
  private block = new Uint8Array(64);
  private blockLength = 0;
  private bytes = 0;
  update(input: Uint8Array): void {
    this.bytes += input.byteLength;
    let offset = 0;
    while (offset < input.byteLength) {
      const take = Math.min(64 - this.blockLength, input.byteLength - offset);
      this.block.set(input.subarray(offset, offset + take), this.blockLength);
      this.blockLength += take; offset += take;
      if (this.blockLength === 64) { this.compress(this.block); this.blockLength = 0; }
    }
  }
  private compress(chunk: Uint8Array): void {
    const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    for (let i=0;i<16;i++) this.w[i]=((chunk[i*4]<<24)|(chunk[i*4+1]<<16)|(chunk[i*4+2]<<8)|chunk[i*4+3])>>>0;
    for (let i=16;i<64;i++){const x=this.w[i-15],y=this.w[i-2];const s0=((x>>>7)|(x<<25))^((x>>>18)|(x<<14))^(x>>>3);const s1=((y>>>17)|(y<<15))^((y>>>19)|(y<<13))^(y>>>10);this.w[i]=(this.w[i-16]+s0+this.w[i-7]+s1)>>>0;}
    let [a,b,c,d,e,f,g,h]=this.h;
    for(let i=0;i<64;i++){const S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7));const ch=g^(e&(f^g));const t1=h+S1+ch+k[i]+this.w[i];const S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10));const maj=(a&b)|(c&(a^b));const t2=S0+maj;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    this.h[0]=(this.h[0]+a)>>>0;this.h[1]=(this.h[1]+b)>>>0;this.h[2]=(this.h[2]+c)>>>0;this.h[3]=(this.h[3]+d)>>>0;this.h[4]=(this.h[4]+e)>>>0;this.h[5]=(this.h[5]+f)>>>0;this.h[6]=(this.h[6]+g)>>>0;this.h[7]=(this.h[7]+h)>>>0;
  }
  digest(): string {
    const bitLength = this.bytes * 8; this.block[this.blockLength++] = 0x80;
    if (this.blockLength > 56) { this.block.fill(0, this.blockLength); this.compress(this.block); this.blockLength = 0; }
    this.block.fill(0, this.blockLength, 56);
    for(let i=0;i<8;i++) this.block[56+i]=(bitLength / 2 ** (56 - i * 8)) & 0xff;
    this.compress(this.block);
    return Array.from(this.h).map(v=>v.toString(16).padStart(8,'0')).join('');
  }
}
async function hashFile(file: File, expectedSize: number): Promise<string> {
  if (!file.exists || file.size !== expectedSize) throw Error('drone_file_size_changed');
  const hash = new Sha256(); const reader = file.readableStream().getReader(); let read = 0;
  try { while (true) { const part = await reader.read(); if (part.done) break; hash.update(part.value); read += part.value.byteLength; } }
  finally { reader.releaseLock(); }
  if (read !== expectedSize || !file.exists || file.size !== expectedSize) throw Error('drone_file_size_changed');
  return hash.digest();
}
/** Read only one bounded multipart range; never materialize the whole video. */
export async function readDroneFileRange(file: DroneLocalFile, offset: number, length: number): Promise<Uint8Array> {
  const owner=identity();
  if (!owner || file.actor!==owner.actor || file.environment!==owner.environment || !file.checksumSha256 || !Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset<0 || length<=0 || length>64*1024**2 || offset+length>file.size) throw Error('drone_file_range_invalid');
  let invalid=false;
  const unsubscribe=useAuthStore.subscribe(()=>{if(JSON.stringify(identity())!==JSON.stringify(owner))invalid=true;});
  const guard=()=>{if(invalid || JSON.stringify(identity())!==JSON.stringify(owner))throw Error('drone_file_session_changed');};
  let handle: ReturnType<File['open']> | undefined;
  try {
    const source=new File(file.uri);
    if(!source.exists || source.size!==file.size)throw Error('drone_file_size_changed');
    handle=source.open(); handle.offset=offset;
    const result=new Uint8Array(length);let read=0;
    while(read<length){guard();const chunk=await handle.readBytes(length-read);guard();if(!chunk.byteLength || chunk.byteLength>length-read)throw Error('drone_file_size_changed');result.set(chunk,read);read+=chunk.byteLength;}
    if(!source.exists || source.size!==file.size)throw Error('drone_file_size_changed');
    guard();return result;
  } finally {handle?.close();unsubscribe();}
}
function identity() {
  const s = useAuthStore.getState(), session = passwordSessionIdentity(s.token), environment = apiClient.defaults.baseURL ?? '';
  if (!session || !uuid(s.user?.id) || JSON.parse(session)[0] !== s.user.id || s.user.role_code !== 'DRONE_OPERATOR' ||
    s.user.must_change_password || !['AUTHENTICATED','REFRESHING'].includes(s.status) || !/^https?:\/\/[^@?#\s]+$/.test(environment)) return null;
  return { actor: s.user.id, session, environment };
}
/** Preserves source bytes only. This is neither an upload ledger nor VERIFIED evidence. */
export async function openDroneLocalFiles(taskId: string) {
  const owner = identity();
  if (!owner || !uuid(taskId)) throw Error('drone_file_session_invalid');
  let closed = false, invalid = false;
  const unsubscribe = useAuthStore.subscribe(() => { if (JSON.stringify(identity()) !== JSON.stringify(owner)) invalid = true; });
  const guard = () => { if (closed || invalid || JSON.stringify(identity()) !== JSON.stringify(owner)) throw Error('drone_file_session_changed'); };
  const close = () => { closed = true; unsubscribe(); };
  let db: ReturnType<typeof openDatabase>;
  try { db = openDatabase(); await initDatabase(db); guard(); } catch (e) { close(); throw e; }
  const prefix = 'drone-source-v1:' + JSON.stringify([owner.environment,owner.actor,taskId]) + ':';
  const directory = new Directory(Paths.document, 'drone-sources-v1');
  const paths = (key: string, kind: Kind) => {
    const file = new File(directory, key + (kind === 'VIDEO' ? '.mp4' : '.srt'));
    return { uri: file.uri, partialUri: new File(directory, key + '.partial').uri };
  };
  return { close,
    list: async () => {
      guard();
      const rows = await db.getAllAsync<{id: string; payload: string}>('SELECT id, payload FROM local_draft WHERE kind = ? AND substr(id, 1, ?) = ?',KIND,prefix.length,prefix);
      guard();
      return rows.map(row => {
        const file = JSON.parse(row.payload) as DroneLocalFile;
        if (file.schema !== 1 || !uuid(file.key) || row.id !== prefix + file.key || file.actor !== owner.actor ||
          file.environment !== owner.environment || file.taskId !== taskId || !uuid(file.projectId) || !version(file.taskVersion) ||
          !['VIDEO','TELEMETRY'].includes(file.kind) || (file.checksumSha256 !== null && !/^[a-f0-9]{64}$/.test(file.checksumSha256)) || !Number.isSafeInteger(file.size) || file.size <= 0 ||
          typeof file.session !== 'string' || JSON.parse(file.session)[0] !== owner.actor || !JSON.parse(file.session)[1] ||
          file.uri !== paths(file.key,file.kind).uri || file.partialUri !== paths(file.key,file.kind).partialUri) throw Error('drone_file_history_invalid');
        const final = new File(file.uri), partial = new File(file.partialUri);
        const availability = final.exists && final.size === file.size ? (file.checksumSha256 ? 'LOCAL_READY' : 'LOCAL_UNHASHED') as 'LOCAL_READY' | 'LOCAL_UNHASHED' :
          final.exists || partial.exists ? 'INCOMPLETE' as const : 'MISSING' as const;
        return { ...file, availability };
      });
    },
    preserve: async (kind: Kind, asset: {name: string; uri: string; size?: number}) => {
      guard();
      if (!['VIDEO','TELEMETRY'].includes(kind) || !/^(file|content):\/\//.test(asset.uri) ||
        !asset.name || !(kind === 'VIDEO' ? /\.mp4$/i : /\.srt$/i).test(asset.name)) throw Error('drone_file_invalid');
      const source = new File(asset.uri), size = source.size;
      // UploadAdmissionPolicy at BE 01cc4725: per-file limits, not the dataset total.
      const maximum = kind === 'VIDEO' ? 8 * 1024 ** 3 : 10 * 1024 ** 2;
      if (!source.exists || !Number.isSafeInteger(size) || size <= 0 || size > maximum ||
        (asset.size !== undefined && asset.size !== size)) throw Error('drone_file_size_invalid');
      const current = await getOperatorSurveyTaskDetailReal(taskId); guard();
      const t = current.data;
      if (t.id !== taskId || t.operatorId !== owner.actor || !uuid(t.projectId) || !version(t.version) || current.etag !== `"${t.version}"`) throw Error('drone_file_task_invalid');
      directory.create({ idempotent: true, intermediates: true }); guard();
      const key = randomUUID();
      const record: DroneLocalFile = {schema:1,key,...owner,taskId,projectId:t.projectId,taskVersion:t.version,kind,name:asset.name,size,...paths(key,kind),checksumSha256:null};
      const now = new Date().toISOString();
      // Persist provenance and destination before copying. Failed/late copies remain discoverable.
      await db.runAsync('INSERT INTO local_draft (id, kind, payload, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',prefix+key,KIND,JSON.stringify(record),now,now); guard();
      const partial = new File(record.partialUri);
      await source.copy(partial); guard();
      if (!partial.exists || partial.size !== size || !source.exists || source.size !== size) throw Error('drone_file_copy_incomplete');
      await partial.move(new File(record.uri)); guard();
      if (!new File(record.uri).exists || new File(record.uri).size !== size) throw Error('drone_file_copy_incomplete');
      const checksumSha256 = await hashFile(new File(record.uri), size); guard();
      const hashed: DroneLocalFile = { ...record, checksumSha256 };
      const nowHashed = new Date().toISOString();
      await db.runAsync('UPDATE local_draft SET payload = ?, updated_at = ? WHERE id = ?', JSON.stringify(hashed), nowHashed, prefix + key); guard();
      return hashed;
    },
  };
}
