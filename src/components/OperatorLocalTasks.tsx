import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { colors, spacing, typography } from '../design-tokens';
import { useAuthStore } from '../store/auth';
import { loadLocalOperatorTasks, loadLocalOperatorWork, type LocalOperatorTask, type LocalOperatorWork } from '../offline/operatorLocalTasks';
import { openLocalOperatorUploadDraft, type OperatorUploadDraft } from '../api/operatorUploadDraft';
import { operatorTaskDisplayCode, operatorTaskStatusLabel } from '../api/operator-task-view';
import { OperatorLocalFiles } from './drone/OperatorLocalFiles';

/** Local reading/editing only: no role routes, API calls or command dispatch. */
export function OperatorLocalTasks({ onClose }: { onClose: () => void }) {
  const owner = useAuthStore(s => s.user);
  const [tasks, setTasks] = useState<LocalOperatorTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<LocalOperatorTask | null>(null);
  useEffect(() => {
    if (selected) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => subscription.remove();
  }, [onClose, selected]);
  useEffect(() => {
    let active = true;
    const unsubscribe = useAuthStore.subscribe(() => {
      active = false;
      setTasks([]);
      onClose();
    });
    void (async () => {
      try {
        const scope = await useAuthStore.getState().operatorLocalReadScope();
        if (!scope) throw Error('local_session_unavailable');
        const rows = await loadLocalOperatorTasks(scope, () => active);
        if (active) setTasks(rows);
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; unsubscribe(); };
  }, [owner, onClose]);
  if (selected) return <OperatorLocalTaskDetail task={selected} onBack={()=>setSelected(null)} />;
  return <SafeAreaView style={styles.root}>
    <View style={styles.toolbar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại kết nối" onPress={onClose} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={colors.secondary}/>
      </Pressable>
      <View style={styles.toolbarTitle}><Text style={styles.title}>Nhiệm vụ đã tải</Text><Text style={styles.caption}>Bản lưu trên thiết bị</Text></View>
      {!loading&&!error?<Text style={styles.count}>{tasks.length}</Text>:null}
    </View>
    <ScrollView contentContainerStyle={styles.detailContent}>
      <View style={styles.notice}><MaterialIcons name="cloud-off" size={18} color={colors.secondary}/><Text style={styles.noticeText}>Xem và lưu nháp trên máy. Kết nối lại để cập nhật phân công và gửi dữ liệu.</Text></View>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.description}>Chưa đọc được bản lưu của tài khoản này. Dữ liệu vẫn được giữ trên máy.</Text> : null}
      {!loading && !error && !tasks.length ? <Text style={styles.description}>Chưa có nhiệm vụ đã tải cho phiên đăng nhập này.</Text> : null}
      {tasks.map(task => <Pressable key={task.id} accessibilityRole="button"
        accessibilityLabel={`Mở nhiệm vụ ${operatorTaskDisplayCode(task.id)}, ${operatorTaskStatusLabel(task.status)}`}
        onPress={()=>setSelected(task)} style={({pressed})=>[styles.taskRow,pressed&&styles.taskPressed]}>
        <View style={styles.taskIcon}><MaterialIcons name="assignment" size={24} color={colors.secondary}/></View>
        <View style={styles.taskText}>
          <Text style={styles.taskTitle}>Nhiệm vụ {operatorTaskDisplayCode(task.id)}</Text>
          <Text style={styles.description}>{operatorTaskStatusLabel(task.status)} · {task.segmentCount} đoạn</Text>
          <Text style={styles.caption}>Đã tải {new Date(task.cachedAt).toLocaleString('vi-VN')}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.secondary}/>
      </Pressable>)}
    </ScrollView>
    <View style={styles.saveBar}><Button variant="secondary" title="Quay lại kết nối" onPress={onClose} /></View>
  </SafeAreaView>;
}

function OperatorLocalTaskDetail({task,onBack}:{task:LocalOperatorTask;onBack:()=>void}) {
  const [work,setWork]=useState<LocalOperatorWork|null>(null);
  const [draft,setDraft]=useState<OperatorUploadDraft>({recordedAt:'',timeOffset:'',videoKey:null,telemetryKey:null});
  const [runtime,setRuntime]=useState<Awaited<ReturnType<typeof openLocalOperatorUploadDraft>>|null>(null);
  const activeRef=useRef(false), saveLock=useRef(false);
  const [dirty,setDirty]=useState(false);
  const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[message,setMessage]=useState<string|null>(null);
  useEffect(()=>{
    let active=true,opened:Awaited<ReturnType<typeof openLocalOperatorUploadDraft>>|undefined;
    activeRef.current=true;
    const unsubscribe=useAuthStore.subscribe(()=>{active=false;activeRef.current=false;setRuntime(null);setWork(null);});
    void(async()=>{
      try {
        const scope=await useAuthStore.getState().operatorLocalReadScope();
        if(!scope||!active)throw Error('local_session_changed');
        // A missing/unreadable work snapshot must not hide a separately saved draft.
        let cached:LocalOperatorWork|null=null;
        try{cached=await loadLocalOperatorWork(scope,task.id,()=>active);}catch{if(!active)return;}
        if(!active)return;setWork(cached);
        opened=await openLocalOperatorUploadDraft(task.id);
        if(!active){opened.close();return;}
        const saved=await opened.read();if(!active)return;
        if(saved)setDraft(saved);setRuntime(opened);
      }catch{opened?.close();if(active)setMessage('Chưa mở được bản nháp. Dữ liệu đã lưu vẫn được giữ.');}
      finally{if(active)setLoading(false);}
    })();
    return()=>{active=false;activeRef.current=false;unsubscribe();opened?.close();};
  },[task.id]);
  const save=async()=>{
    if(!runtime||saveLock.current||!activeRef.current)return;
    saveLock.current=true;setSaving(true);setMessage(null);
    try{await runtime.save(draft);if(activeRef.current){setDirty(false);setMessage('Đã lưu nháp trên máy. Chưa gửi.');}}
    catch{if(activeRef.current)setMessage('Không lưu được thay đổi. Bản nháp trước vẫn được giữ.');}
    finally{saveLock.current=false;if(activeRef.current)setSaving(false);}
  };
  const back=()=>{
    if(saveLock.current)return;
    if(!dirty){onBack();return;}
    Alert.alert('Thay đổi chưa lưu','Lưu nháp trước khi quay lại để giữ thay đổi.',[
      {text:'Tiếp tục chỉnh sửa',style:'cancel'},
      {text:'Bỏ thay đổi',style:'destructive',onPress:onBack},
    ]);
  };
  useEffect(()=>{
    const subscription=BackHandler.addEventListener('hardwareBackPress',()=>{back();return true;});
    return()=>subscription.remove();
  },[dirty,onBack]);
  return <SafeAreaView style={styles.root}>
    <View style={styles.toolbar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại nhiệm vụ đã tải" disabled={saving} onPress={back} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={24} color={colors.secondary}/>
      </Pressable>
      <View style={styles.toolbarTitle}><Text style={styles.title}>Nháp khảo sát</Text><Text style={styles.caption}>Nhiệm vụ {operatorTaskDisplayCode(task.id)}</Text></View>
      <View style={styles.offlineBadge}><MaterialIcons name="cloud-off" size={14} color={colors.secondary}/><Text style={styles.caption}>Ngoại tuyến</Text></View>
    </View>
    <KeyboardAvoidingView style={styles.body} behavior={Platform.OS==='ios'?'padding':undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.detailContent}>
        <View style={styles.notice}><MaterialIcons name="info-outline" size={18} color={colors.secondary}/><Text style={styles.noticeText}>Lưu trên máy. Kết nối lại để cập nhật phân công và gửi dữ liệu.</Text></View>
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Gói công việc</Text>
          {loading?<ActivityIndicator/>:work?<>
            <View style={styles.summaryRow}><Text style={styles.caption}>Phạm vi</Text><Text style={styles.summaryValue}>{work.segmentCount} đoạn khảo sát</Text></View>
            <View style={styles.summaryRow}><Text style={styles.caption}>Hạn bay</Text><Text style={styles.summaryValue}>{work.dueAt?new Date(work.dueAt).toLocaleString('vi-VN'):'Chưa có thời hạn'}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.caption}>Điểm tiếp cận</Text><Text style={styles.summaryValue}>{work.access?`${work.access[1].toFixed(6)}, ${work.access[0].toFixed(6)}`:'Chưa có trong bản lưu'}</Text></View>
          </>:<Text style={styles.description}>Chưa có gói công việc trong bản lưu.</Text>}
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Tệp khảo sát</Text>
          {runtime?<OperatorLocalFiles taskId={task.id} selectedVideoKey={draft.videoKey} selectedTelemetryKey={draft.telemetryKey} onSelect={file=>{if(!activeRef.current||saveLock.current)return;setDraft(d=>({...d,[file.kind==='VIDEO'?'videoKey':'telemetryKey']:file.key}));setDirty(true);setMessage(null);}}/>:<Text style={styles.caption}>Đang mở tệp đã lưu…</Text>}
        </View>
        <View style={styles.detailCard}>
          <Text style={styles.sectionTitle}>Thông tin ghi hình</Text>
          <View style={styles.field}>
            <Text style={styles.description}>Thời gian ghi hình</Text>
            <TextInput accessibilityLabel="Thời gian ghi hình ngoại tuyến" value={draft.recordedAt} editable={!!runtime&&!saving} maxLength={32} placeholder="2026-11-15 08:30" onChangeText={recordedAt=>{setDraft(d=>({...d,recordedAt}));setDirty(true);setMessage(null);}} style={styles.input}/>
          </View>
          {draft.telemetryKey?<View style={styles.field}><Text style={styles.description}>Độ lệch SRT so với video (ms)</Text><TextInput accessibilityLabel="Độ lệch SRT ngoại tuyến" value={draft.timeOffset} editable={!!runtime&&!saving} maxLength={32} keyboardType="numbers-and-punctuation" onChangeText={timeOffset=>{setDraft(d=>({...d,timeOffset}));setDirty(true);setMessage(null);}} style={styles.input}/></View>:null}
        </View>
      </ScrollView>
      <View style={styles.saveBar}>
        <Text accessibilityLiveRegion="polite" style={styles.caption}>{message??(dirty?'Có thay đổi chưa lưu':'Bản nháp trên thiết bị · Chưa gửi')}</Text>
        <Button variant="primary" title="Lưu nháp trên máy" loading={saving} disabled={!runtime||loading||saving} onPress={()=>void save()}/>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', backgroundColor: colors.surface },
  description: { ...typography.bodyMd, color: colors.secondary },
  caption: { ...typography.caption, color: colors.secondary },
  input: {...typography.bodyMd,color:colors.neutral,borderWidth:1,borderColor:colors.border,borderRadius:8,minHeight:52,padding:12,backgroundColor:colors.surface},
  count:{...typography.labelLg,color:colors.secondary,padding:spacing.md},
  taskRow:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.md,minHeight:100,borderWidth:1,borderColor:colors.border,borderRadius:12},
  taskPressed:{backgroundColor:colors.surfaceAlt},
  taskIcon:{width:40,height:40,alignItems:'center',justifyContent:'center',borderRadius:8,backgroundColor:colors.surfaceAlt},
  taskText:{flex:1,minWidth:0,gap:spacing.xs},
  taskTitle:{...typography.labelLg,color:colors.neutral},
  body:{flex:1},
  toolbar:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingHorizontal:spacing.sm,paddingVertical:spacing.sm,borderBottomWidth:1,borderBottomColor:colors.border},
  backButton:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},
  toolbarTitle:{flex:1,minWidth:0,gap:spacing.xs},
  title:{...typography.titleMd,color:colors.neutral},
  offlineBadge:{flexDirection:'row',alignItems:'center',gap:spacing.xs,padding:spacing.sm,flexShrink:1},
  detailContent:{padding:spacing.md,gap:spacing.md},
  notice:{flexDirection:'row',alignItems:'flex-start',gap:spacing.sm,padding:spacing.sm,backgroundColor:colors.surfaceAlt,borderRadius:8},
  noticeText:{...typography.caption,color:colors.secondary,flex:1},
  detailCard:{padding:spacing.md,gap:spacing.md,borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:colors.surface},
  sectionTitle:{...typography.titleMd,color:colors.neutral},
  summaryRow:{flexDirection:'row',alignItems:'flex-start',gap:spacing.md,justifyContent:'space-between'},
  summaryValue:{...typography.bodyMd,color:colors.secondary,flex:1,textAlign:'right'},
  field:{gap:spacing.sm},
  saveBar:{padding:spacing.md,gap:spacing.sm,borderTopWidth:1,borderTopColor:colors.border,backgroundColor:colors.surface},
});
