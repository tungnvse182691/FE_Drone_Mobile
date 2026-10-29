import React, { useEffect, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { openDroneTaskJournal, listDroneTaskCommands } from '../../api/droneTaskJournal';
import { operatorTaskStatusLabel, operatorTaskDisplayCode } from '../../api/operator-task-view';
import { useRouter } from 'expo-router';
import { useOperatorReadScope } from '../../hooks/useOperatorReadScope';
import { Button } from '../Button';
import { Card } from '../Card';
import { typography, spacing, colors } from '../../design-tokens';

type Runtime = Awaited<ReturnType<typeof openDroneTaskJournal>>;
type Saved = Awaited<ReturnType<Runtime['read']>>;
/** One dispatcher for detail/decline/recovery. Opening the panel never posts. */
export function DroneTaskCommandPanel({taskId, operation}: {taskId: string; operation: 'accept' | 'decline'}) {
  const scope = useOperatorReadScope(taskId);
  const [runtime,setRuntime] = useState<Runtime | null>(null), [saved,setSaved] = useState<Saved>(null);
  const [ready,setReady] = useState(false), [busy,setBusy] = useState(false), [reason,setReason] = useState('');
  const [error,setError] = useState<string | null>(null), [current,setCurrent] = useState<string | null>(null);
  const [canPrepare,setCanPrepare] = useState(false);
  const lock = useRef(false);
  const [dataScope,setDataScope] = useState<string | null>(null);
  useEffect(() => {
    const isCurrent = scope.capture(); let cancelled = false, opened: Runtime | null = null;
    setDataScope(scope.key);setRuntime(null);setSaved(null);setReady(false);setReason('');setCurrent(null);setCanPrepare(false);setError(null);setBusy(false);lock.current=false;
    void (async () => {
      try {
        const r = await openDroneTaskJournal(taskId); opened=r;
        if (cancelled || !isCurrent()) { r.close(); return; }
        const row = await r.read();
        if (cancelled || !isCurrent()) { r.close(); return; }
        setSaved(row);setRuntime(r);setReady(true);
        if (!row) {
          try {
            const task = await r.readCurrent();
            if (!cancelled && isCurrent()) {setCurrent(operatorTaskStatusLabel(task.status));setCanPrepare(['NEW_ASSIGNED','REASSIGNED'].includes(task.status));}
          } catch { if(!cancelled&&isCurrent())setError('Chưa đọc được phân công hiện hành. Hãy đọc lại trạng thái trước khi chuẩn bị lệnh.'); }
        }
      } catch { opened?.close(); if (!cancelled && isCurrent()) setError('Không đọc được lịch sử yêu cầu. Dữ liệu vẫn được giữ; hãy mở lại màn hình.'); }
    })();
    return () => { cancelled=true; opened?.close(); };
  }, [taskId,scope.key,scope.capture]);
  const run = async (action: 'prepare' | 'dispatch' | 'read') => {
    const isCurrent=scope.capture();
    if (dataScope !== scope.key || !runtime || !ready || lock.current || !isCurrent()) return;
    if (action==='prepare' && !canPrepare) return;
    lock.current=true;setBusy(true);setError(null);
    try {
      if (action === 'prepare') await runtime.prepare(operation,reason);
      if (action === 'dispatch' && saved) await runtime.dispatch(saved.command.key,true);
      if (action === 'read') {
        const task = await runtime.readCurrent();
        if (isCurrent()) {setCurrent(operatorTaskStatusLabel(task.status));setCanPrepare(['NEW_ASSIGNED','REASSIGNED'].includes(task.status));}
      }
    } catch (e) {
      if (!isCurrent()) return;
      const status=(e as {response?:{status?:number}}).response?.status;
      if(action==='prepare')setCanPrepare(false);
      setError(action==='prepare' ? 'Chưa thể chuẩn bị yêu cầu. Hãy đọc lại phân công hiện hành; dữ liệu cũ vẫn được giữ.' : status===403 ? 'Quyền hoặc phân công không còn hợp lệ. Lệnh cũ vẫn được giữ.' : status===409 || status===412 ?
        'Máy chủ báo xung đột. Lệnh gốc được giữ nguyên; đọc lại nhiệm vụ để kiểm tra. Không tạo lệnh mới tự động.' :
        'Chưa xác nhận được kết quả. Kiểm tra lịch sử bên dưới trước khi quyết định gửi lại đúng lệnh.');
    } finally {
      try { const row=await runtime.read(); if(isCurrent())setSaved(row); }
      catch { if(isCurrent()){setReady(false);setError('Không đọc được lịch sử yêu cầu; thao tác gửi được khóa để bảo toàn dữ liệu.');} }
      if(isCurrent()){lock.current=false;setBusy(false);}
    }
  };
  if (dataScope !== scope.key) return <Text>Đang khôi phục lịch sử yêu cầu…</Text>;
  if(!scope.key)return <Text>Cần phiên Operator hợp lệ.</Text>;
  return <Card style={{gap:spacing.sm,marginBottom:spacing.md}}>
    <Text style={typography.titleMd}>Tiếp nhận và phản hồi nhiệm vụ</Text>
    {!ready&&!error ? <Text>Đang khôi phục lịch sử yêu cầu…</Text> : null}
    {saved ? <>
      <Text style={typography.bodyMd}>{saved.command.operation==='accept'?'Tiếp nhận nhiệm vụ':'Từ chối nhiệm vụ'}</Text>
      {saved.command.payload.reason ? <Text>{saved.command.payload.reason}</Text> : null}
      <Text>{saved.phase==='RECEIPT'?'Máy chủ đã trả kết quả cho lệnh này.':saved.phase==='PREPARED'?'Đã lưu lệnh, chưa gửi.':'Lệnh đã gửi nhưng chưa xác nhận được kết quả.'}</Text>
      {saved.phase!=='RECEIPT'?<>
        <Text style={typography.caption}>Gửi lại giữ nguyên nội dung, phiên bản và mã yêu cầu đã lưu. Đọc trạng thái nhiệm vụ không tự giải quyết lệnh chưa rõ kết quả.</Text>
        <Button variant="primary" title="Xác nhận gửi lệnh đã lưu" disabled={busy||!ready} onPress={()=>void run('dispatch')} />
      </>:null}
    </>:<>
      {operation==='decline'?<TextInput accessibilityLabel="Lý do từ chối" value={reason} editable={!busy&&ready} onChangeText={setReason} multiline placeholder="Nhập lý do thực tế" style={{borderWidth:1,borderColor:colors.border,padding:spacing.sm}}/>:null}
      {!canPrepare?<Text style={typography.caption}>Chỉ chuẩn bị yêu cầu khi máy chủ xác nhận nhiệm vụ mới được giao hoặc giao lại cho bạn.</Text>:null}
      <Button variant="primary" title={operation==='accept'?'Chuẩn bị tiếp nhận nhiệm vụ':'Lưu yêu cầu từ chối để xác nhận'} disabled={busy||!ready||!canPrepare||(operation==='decline'&&!reason.trim())} onPress={()=>void run('prepare')} />
    </>}
    <Button variant="secondary" title="Đọc trạng thái nhiệm vụ hiện hành" disabled={busy||!ready} onPress={()=>void run('read')} />
    {current?<Text>Trạng thái hiện hành: {current}</Text>:null}
    {error?<View accessibilityRole="alert"><Text>{error}</Text></View>:null}
  </Card>;
}

export function DroneTaskRecoveryList() {
  const scope = useOperatorReadScope('task-command-history'), router = useRouter();
  const [rows,setRows] = useState<Awaited<ReturnType<typeof listDroneTaskCommands>>>([]);
  const [dataScope,setDataScope] = useState<string | null>(null), [error,setError] = useState(false);
  const [busy,setBusy] = useState(false);
  const lock = useRef(false);
  const load = async () => {
    const isCurrent = scope.capture(); if (!isCurrent() || lock.current) return;
    lock.current=true;setBusy(true);setError(false);
    try { const result=await listDroneTaskCommands(); if(isCurrent()){setRows(result);setDataScope(scope.key);} }
    catch { if(isCurrent())setError(true); }
    finally { if(isCurrent()){lock.current=false;setBusy(false);} }
  };
  useEffect(() => { setRows([]);setDataScope(null);setError(false);lock.current=false;void load(); },[scope.key]);
  if (!scope.key) return null;
  return <Card style={{gap:spacing.sm,marginBottom:spacing.md}}>
    <Text style={typography.titleMd}>Yêu cầu nhiệm vụ đã lưu</Text>
    <Text style={typography.caption}>Lịch sử trên thiết bị của tài khoản và môi trường hiện tại. Mở yêu cầu để kiểm tra hoặc xác nhận gửi lại lệnh gốc.</Text>
    {dataScope===scope.key ? rows.map(row=><Button key={row.taskId} variant="secondary"
      title={`${operatorTaskDisplayCode(row.taskId)} · ${row.operation==='accept'?'Tiếp nhận':'Từ chối'} · ${row.phase==='RECEIPT'?'Có kết quả máy chủ':row.phase==='PREPARED'?'Chưa gửi':'Chưa rõ kết quả'}`}
      onPress={()=>{if(scope.capture()())router.push(`/(drone)/request-detail?taskId=${encodeURIComponent(row.taskId)}`);}} />):null}
    {dataScope===scope.key && !rows.length ? <Text>Chưa có yêu cầu đã lưu trong phân vùng này.</Text>:null}
    {error?<Text accessibilityRole="alert">Không đọc được lịch sử; dữ liệu vẫn được giữ.</Text>:null}
    <Button variant="secondary" title="Đọc lại lịch sử yêu cầu" disabled={busy} onPress={()=>void load()} />
  </Card>;
}
