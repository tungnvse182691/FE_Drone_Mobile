import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { openDroneTaskJournal, listDroneTaskCommands } from '../../api/droneTaskJournal';
import { operatorTaskStatusLabel, operatorTaskDisplayCode } from '../../api/operator-task-view';
import { useRouter } from 'expo-router';
import { useOperatorReadScope } from '../../hooks/useOperatorReadScope';
import { Button } from '../Button';
import { Card } from '../Card';
import { operatorAppearance } from './appearance';
import { typography, spacing, colors } from '../../design-tokens';

type Runtime = Awaited<ReturnType<typeof openDroneTaskJournal>>;
type Saved = Awaited<ReturnType<Runtime['read']>>;
/** One dispatcher for detail/decline/recovery. Opening the panel never posts. */
export function DroneTaskCommandPanel({taskId, operation, collapsed = false, onExpand, onResolved, children}: {
  taskId: string; operation: 'accept' | 'decline'; collapsed?: boolean; onExpand?: () => void;
  onResolved?: (status: string) => void;
  children?: React.ReactNode;
}) {
  const scope = useOperatorReadScope(taskId);
  const [runtime,setRuntime] = useState<Runtime | null>(null), [saved,setSaved] = useState<Saved>(null);
  const [ready,setReady] = useState(false), [busy,setBusy] = useState(false), [reason,setReason] = useState('');
  const [error,setError] = useState<string | null>(null), [current,setCurrent] = useState<string | null>(null);
  const [detailsExpanded,setDetailsExpanded] = useState(false);
  const [canPrepare,setCanPrepare] = useState(false);
  const [revision,setRevision] = useState(0);
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
      } catch { opened?.close(); if (!cancelled && isCurrent()) setError('Không đọc được lịch sử yêu cầu. Dữ liệu vẫn được giữ; có thể thử mở lại.'); }
    })();
    return () => { cancelled=true; opened?.close(); };
  }, [taskId,scope.key,scope.capture,revision]);
  const run = async (action: 'prepare' | 'dispatch' | 'read') => {
    const isCurrent=scope.capture();
    if (dataScope !== scope.key || !runtime || !ready || lock.current || !isCurrent()) return;
    if (action==='prepare' && !canPrepare) return;
    lock.current=true;setBusy(true);setError(null);
    let resolvedStatus: string | null = null;
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
      try { const row=await runtime.read(); if(isCurrent()) {
        setSaved(row);
        // Only the durable, validated receipt resolves a command. A current
        // task GET or a transport response alone must not announce success.
        if (action==='dispatch' && row?.phase==='RECEIPT' && row.receipt) resolvedStatus=row.receipt.data.status;
      } }
      catch { if(isCurrent()){setReady(false);setError('Không đọc được lịch sử yêu cầu; thao tác gửi được khóa để bảo toàn dữ liệu.');} }
      if(isCurrent()){lock.current=false;setBusy(false);}
    }
    if (resolvedStatus && isCurrent()) {
      setCurrent(operatorTaskStatusLabel(resolvedStatus));setCanPrepare(false);
      onResolved?.(resolvedStatus);
    }
  };
  if (dataScope !== scope.key) return <Text>Đang khôi phục lịch sử yêu cầu…</Text>;
  if(!scope.key)return <Text>Cần phiên Operator hợp lệ.</Text>;
  // Keep the journal mounted while collapsed. A saved command or a storage
  // failure must remain visible independently of the current task GET/status.
  // A failed assignment read is not a pending command. Only a real unresolved
  // row or an unreadable journal needs the collapsed recovery notice.
  if (collapsed) return (saved && saved.phase !== 'RECEIPT') || (error && !ready) ?
    <Card style={{...operatorAppearance.card,gap:spacing.sm,marginBottom:spacing.md}}>
      <View accessibilityRole="alert" testID="command-recovery-notice">
        <Text style={typography.titleMd}>{saved?.phase === 'PREPARED' ? 'Đã lưu lệnh, chưa gửi' : saved && saved.phase !== 'RECEIPT' ? 'Chưa rõ kết quả lệnh đã gửi' : 'Cần kiểm tra lịch sử yêu cầu'}</Text>
        <Text style={typography.bodyMd}>{error ?? 'Lệnh gốc vẫn được giữ. Mở để kiểm tra; ứng dụng không tự gửi lại.'}</Text>
      </View>
      <Button variant="secondary" title="Xem lệnh cần đối soát" onPress={() => onExpand?.()} />
    </Card> : !ready ? <Text style={typography.caption}>Đang khôi phục lịch sử yêu cầu…</Text> : null;
  const disabledReason = busy ? 'Đang xử lý yêu cầu đã chọn. Vui lòng chờ.' : !ready ? 'Chưa đọc được lịch sử yêu cầu; thao tác gửi đang khóa.' : !saved && !canPrepare ? 'Cập nhật trạng thái để kiểm tra quyền nhận nhiệm vụ.' : !saved && operation === 'decline' && !reason.trim() ? 'Cần nhập lý do thực tế trước khi lưu yêu cầu từ chối.' : null;
  const primaryStyle = { minHeight: 52, borderRadius: 12, backgroundColor: colors.primary, borderColor: colors.primary };
  return <Card style={{gap:spacing.md,marginTop:spacing.md,marginBottom:12,...operatorAppearance.card,borderColor:colors.border}}>
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><MaterialIcons name="assignment-turned-in" size={16} color={colors.brandGold} /><Text style={{...typography.titleMd,color:colors.neutral,flex:1}}>{(saved?.command.operation ?? operation)==='accept'?'Tiếp nhận nhiệm vụ':'Từ chối nhiệm vụ'}</Text></View>
    {!ready&&!error ? <Text>Đang khôi phục lịch sử yêu cầu…</Text> : null}
    {saved ? <>
      {saved.command.payload.reason ? <Text>{saved.command.payload.reason}</Text> : null}
      <View style={commandStyles.status}>
        <MaterialIcons name={saved.phase==='RECEIPT'?'check-circle-outline':saved.phase==='PREPARED'?'schedule':'sync-problem'} size={24} color={saved.phase==='RECEIPT'?colors.success:colors.secondary}/>
        <View style={{flex:1,gap:4}}><Text style={typography.titleMd}>{saved.phase==='RECEIPT'?'Đã có kết quả':saved.phase==='PREPARED'?'Sẵn sàng xác nhận':'Cần kiểm tra kết quả'}</Text><Text style={commandStyles.caption}>{saved.phase==='RECEIPT'?'Máy chủ đã trả kết quả cho lệnh này.':saved.phase==='PREPARED'?'Yêu cầu đã lưu trên máy, chưa gửi.':'Chưa xác nhận được kết quả. Yêu cầu gốc vẫn được giữ.'}</Text></View>
      </View>
      {saved.phase!=='RECEIPT'?<>
        <Button variant="secondary" style={primaryStyle} disabledTextStyle={{color:colors.neutral}} icon={<MaterialIcons name="send" size={18} color={colors.neutral} />} title="Xác nhận gửi" disabled={busy||!ready} onPress={()=>void run('dispatch')} />
      </>:null}
    </>:<>
      {operation==='decline'?<TextInput accessibilityLabel="Lý do từ chối" value={reason} editable={!busy&&ready} onChangeText={setReason} multiline placeholder="Nhập lý do thực tế" style={{...typography.bodyMd,minHeight:96,borderWidth:1,borderColor:colors.border,borderRadius:12,padding:16,color:colors.neutral,textAlignVertical:'top'}}/>:null}
      <View style={{alignItems:'stretch',gap:spacing.sm}}>
      {children ? <Pressable accessibilityRole="button" accessibilityLabel="Chuẩn bị tiếp nhận nhiệm vụ" accessibilityState={{disabled:busy||!ready||!canPrepare}} disabled={busy||!ready||!canPrepare} onPress={()=>void run('prepare')} style={{...primaryStyle,flexDirection:'row',gap:spacing.xs,alignItems:'center',justifyContent:'center',padding:12,opacity:busy||!ready||!canPrepare?0.5:1}}>
        <MaterialIcons name="assignment-turned-in" size={18} color={colors.neutral} />
        <Text style={{...typography.labelLg,color:colors.neutral,textAlign:'center',lineHeight:21,flexShrink:1}}>Chuẩn bị tiếp nhận nhiệm vụ</Text>
      </Pressable> : <Button variant="secondary" style={primaryStyle} disabledTextStyle={{color:colors.neutral}} icon={<MaterialIcons name={operation==='accept'?'assignment-turned-in':'save'} size={18} color={colors.neutral} />} title={operation==='accept'?'Chuẩn bị tiếp nhận nhiệm vụ':'Lưu yêu cầu từ chối để xác nhận'} disabled={busy||!ready||!canPrepare||(operation==='decline'&&!reason.trim())} onPress={()=>void run('prepare')} />}
      {children ? <View>{children}</View> : null}
      </View>
    </>}
    {disabledReason ? <View testID="command-disabled-reason" style={{flexDirection:'row',alignItems:'center',gap:8,padding:12,borderRadius:12,backgroundColor:colors.surfaceAlt}}><MaterialIcons name="info-outline" size={18} color={colors.secondary} /><Text style={{...typography.caption,color:colors.secondary,textAlign:'center',flex:1}}>{disabledReason}</Text></View> : null}
    <View style={commandStyles.footer}>
      <Pressable accessibilityRole="button" accessibilityLabel="Đọc trạng thái nhiệm vụ hiện hành" disabled={busy||!ready} accessibilityState={{disabled:busy||!ready}} onPress={()=>void run('read')} style={commandStyles.link}><MaterialIcons name="refresh" size={20} color={colors.secondary}/><Text style={commandStyles.caption}>Cập nhật trạng thái</Text></Pressable>
      <Pressable testID="command-details-toggle" accessibilityRole="button" accessibilityLabel="Chi tiết yêu cầu" accessibilityState={{expanded:detailsExpanded}} onPress={()=>setDetailsExpanded(v=>!v)} style={commandStyles.link}><Text style={commandStyles.caption}>Chi tiết</Text><MaterialIcons name={detailsExpanded?'expand-less':'expand-more'} size={20} color={colors.secondary}/></Pressable>
    </View>
    {detailsExpanded?<Text style={commandStyles.caption}>Gửi lại giữ nguyên nội dung, phiên bản và mã yêu cầu đã lưu. Đọc trạng thái nhiệm vụ không tự giải quyết lệnh chưa rõ kết quả.</Text>:null}
    {current?<Text style={commandStyles.caption}>Trạng thái hiện hành: {current}</Text>:null}
    {error?<View accessibilityRole="alert"><Text>{error}</Text></View>:null}
    {!ready&&error?<Button variant="secondary" title="Thử mở lại lịch sử yêu cầu" onPress={()=>{if(scope.capture()())setRevision(v=>v+1);}} />:null}
  </Card>;
}

export function DroneTaskRecoveryList() {
  const scope = useOperatorReadScope('task-command-history'), router = useRouter();
  const [rows,setRows] = useState<Awaited<ReturnType<typeof listDroneTaskCommands>>>([]);
  const [dataScope,setDataScope] = useState<string | null>(null), [error,setError] = useState(false);
  const [busy,setBusy] = useState(false);
  const [historyExpanded,setHistoryExpanded] = useState(false);
  const lock = useRef(false);
  const load = async () => {
    const isCurrent = scope.capture(); if (!isCurrent() || lock.current) return;
    lock.current=true;setBusy(true);setError(false);
    try { const result=await listDroneTaskCommands(); if(isCurrent()){setRows(result);setDataScope(scope.key);} }
    catch { if(isCurrent())setError(true); }
    finally { if(isCurrent()){lock.current=false;setBusy(false);} }
  };
  useEffect(() => { setRows([]);setDataScope(null);setError(false);setHistoryExpanded(false);lock.current=false;void load(); },[scope.key]);
  if (!scope.key) return null;
  const visible = dataScope===scope.key ? rows : [];
  const pending = visible.filter(row=>row.phase!=='RECEIPT');
  const history = visible.filter(row=>row.phase==='RECEIPT');
  const renderRow = (row: typeof rows[number]) => {
    const action=row.operation==='accept'?'Tiếp nhận':'Từ chối';
    const status=row.phase==='RECEIPT'?'Có kết quả máy chủ':row.phase==='PREPARED'?'Đã lưu, chưa gửi':'Chưa rõ kết quả';
    return <Pressable key={row.taskId} testID={`saved-task-${row.taskId}`} accessibilityRole="button"
      accessibilityLabel={`Nhiệm vụ ${operatorTaskDisplayCode(row.taskId)}, ${action}, ${status}`}
      onPress={()=>{if(scope.capture()())router.push(`/(drone)/request-detail?taskId=${encodeURIComponent(row.taskId)}`);}}
      style={({pressed})=>[recoveryStyles.row,pressed&&recoveryStyles.pressed]}>
      <View style={recoveryStyles.icon}><MaterialIcons name={row.operation==='accept'?'assignment-turned-in':'assignment-return'} size={22} color={colors.secondary}/></View>
      <View style={recoveryStyles.copy}>
        <Text style={recoveryStyles.title}>{action} · {operatorTaskDisplayCode(row.taskId)}</Text>
        <Text style={recoveryStyles.subtitle}>{status}</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.secondary}/>
    </Pressable>;
  };
  return <Card style={{...operatorAppearance.card,borderColor:colors.border,gap:spacing.sm,marginBottom:spacing.md}}>
    <View style={{flexDirection:'row',flexWrap:'wrap',alignItems:'center',justifyContent:'space-between',gap:spacing.sm}}>
      <Text style={{...typography.titleMd,color:colors.neutral,flex:1}}>Yêu cầu đã lưu</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Đọc lại lịch sử yêu cầu" accessibilityState={{busy,disabled:busy}} disabled={busy} onPress={()=>void load()} style={{minHeight:48,minWidth:48,alignItems:'center',justifyContent:'center',borderRadius:12,backgroundColor:'#FFF1CB',borderWidth:1,borderColor:'#E8D9A9'}}>
        {busy?<ActivityIndicator color={colors.secondary}/>:<MaterialIcons name="refresh" size={22} color={colors.secondary}/>}
      </Pressable>
    </View>
    {pending.length ? <Text style={recoveryStyles.subtitle}>Cần kiểm tra ({pending.length}) · Chạm để xem yêu cầu</Text> : dataScope===scope.key && history.length ? <Text style={recoveryStyles.subtitle}>Không có yêu cầu cần đối soát.</Text> : null}
    {pending.map(renderRow)}
    {history.length ? <>
      <Pressable testID="task-history-toggle" accessibilityRole="button" accessibilityLabel="Lịch sử yêu cầu" accessibilityState={{expanded:historyExpanded}}
        onPress={()=>setHistoryExpanded(value=>!value)} style={({pressed})=>[recoveryStyles.historyToggle,pressed&&recoveryStyles.pressed]}>
        <MaterialIcons name="history" size={22} color={colors.secondary}/>
        <Text style={recoveryStyles.historyLabel}>Lịch sử ({history.length})</Text>
        <MaterialIcons name={historyExpanded?'expand-less':'expand-more'} size={24} color={colors.secondary}/>
      </Pressable>
      {historyExpanded ? history.map(renderRow) : null}
    </> : null}
    {dataScope===scope.key && !rows.length ? <Text>Chưa có yêu cầu đã lưu.</Text>:null}
    {error?<Text accessibilityRole="alert">Không đọc được lịch sử; dữ liệu vẫn được giữ.</Text>:null}
  </Card>;
}

const recoveryStyles = StyleSheet.create({
  row: {minHeight:72,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,paddingHorizontal:4,borderBottomWidth:1,borderBottomColor:colors.border},
  icon: {width:40,height:40,borderRadius:10,backgroundColor:colors.surfaceAlt,alignItems:'center',justifyContent:'center'},
  copy: {flex:1,minWidth:0,gap:4},
  title: {...typography.bodyMd,color:colors.neutral,fontFamily:'Roboto-Medium',flexShrink:1},
  subtitle: {...typography.caption,color:colors.secondary,lineHeight:19,flexShrink:1},
  historyToggle: {minHeight:52,flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:8,borderRadius:12,backgroundColor:'#FFF8E8'},
  historyLabel: {...typography.bodyMd,color:colors.secondary,flex:1},
  pressed: {backgroundColor:operatorAppearance.pressed},
});

const commandStyles=StyleSheet.create({
  status:{flexDirection:'row',alignItems:'center',gap:12,padding:14,borderRadius:12,backgroundColor:colors.surfaceAlt},
  caption:{...typography.caption,color:colors.secondary,lineHeight:19},
  footer:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',borderTopWidth:1,borderTopColor:colors.border},
  link:{minHeight:48,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:4},
});
