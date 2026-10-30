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
  uri: string; partialUri: string; checksumSha256: null };
const KIND = 'DRONE_LOCAL_SOURCE';
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) && !v.startsWith('00000000-0000-0000-0000-');
const version = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9+/]{10}[AEIMQUYcgkosw048]=$/.test(v);
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
          !['VIDEO','TELEMETRY'].includes(file.kind) || file.checksumSha256 !== null || !Number.isSafeInteger(file.size) || file.size <= 0 ||
          typeof file.session !== 'string' || JSON.parse(file.session)[0] !== owner.actor || !JSON.parse(file.session)[1] ||
          file.uri !== paths(file.key,file.kind).uri || file.partialUri !== paths(file.key,file.kind).partialUri) throw Error('drone_file_history_invalid');
        const final = new File(file.uri), partial = new File(file.partialUri);
        const availability = final.exists && final.size === file.size ? 'LOCAL_UNHASHED' as const :
          final.exists || partial.exists ? 'INCOMPLETE' as const : 'MISSING' as const;
        return { ...file, availability };
      });
    },
    preserve: async (kind: Kind, asset: {name: string; uri: string; size?: number}) => {
      guard();
      if (!['VIDEO','TELEMETRY'].includes(kind) || !/^(file|content):\/\//.test(asset.uri) ||
        !asset.name || !(kind === 'VIDEO' ? /\.mp4$/i : /\.srt$/i).test(asset.name)) throw Error('drone_file_invalid');
      const source = new File(asset.uri), size = source.size;
      if (!source.exists || !Number.isSafeInteger(size) || size <= 0 || size > 34359738368 ||
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
      return record;
    },
  };
}
