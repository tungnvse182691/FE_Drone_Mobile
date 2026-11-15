import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { colors, spacing, typography } from '../design-tokens';
import { useAuthStore } from '../store/auth';
import { loadLocalOperatorTasks, loadLocalOperatorWork, type LocalOperatorTask, type LocalOperatorWork } from '../offline/operatorLocalTasks';
import { openLocalOperatorUploadDraft, type OperatorUploadDraft } from '../api/operatorUploadDraft';
import { operatorTaskDisplayCode, operatorTaskStatusLabel } from '../api/operator-task-view';

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
    <View style={styles.header}>
      <Text style={typography.titleLg}>Nhiệm vụ đã tải</Text>
      <Text style={styles.description}>Bản lưu trên máy</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.description}>Kết nối lại để cập nhật phân công và tiếp tục gửi dữ liệu.</Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.description}>Chưa đọc được bản lưu của tài khoản này. Dữ liệu vẫn được giữ trên máy.</Text> : null}
      {!loading && !error && !tasks.length ? <Text style={styles.description}>Chưa có nhiệm vụ đã tải cho phiên đăng nhập này.</Text> : null}
      {tasks.map(task => <View key={task.id} style={styles.card}>
        <Text style={typography.labelLg}>Nhiệm vụ {operatorTaskDisplayCode(task.id)}</Text>
        <Text style={styles.description}>{operatorTaskStatusLabel(task.status)}</Text>
        <Text style={styles.description}>{task.segmentCount} đoạn khảo sát</Text>
        <Text style={styles.caption}>Đã tải: {new Date(task.cachedAt).toLocaleString('vi-VN')}</Text>
        <Button variant="secondary" title={`Mở nhiệm vụ ${operatorTaskDisplayCode(task.id)}`} onPress={()=>setSelected(task)} />
      </View>)}
    </ScrollView>
    <View style={styles.footer}><Button variant="primary" title="Quay lại kết nối" onPress={onClose} /></View>
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
    <View style={styles.header}><Button variant="text" title="Quay lại nhiệm vụ đã tải" onPress={back}/><Text style={typography.titleLg}>Nhiệm vụ {operatorTaskDisplayCode(task.id)}</Text><Text style={styles.caption}>Ngoại tuyến · Phân công chưa được cập nhật</Text></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.card}><Text style={typography.titleMd}>Gói công việc đã tải</Text>
        {loading?<ActivityIndicator/>:work?<>
          <Text style={styles.description}>{work.segmentCount} đoạn khảo sát</Text>
          <Text style={styles.description}>Hạn bay: {work.dueAt?new Date(work.dueAt).toLocaleString('vi-VN'):'Chưa có thời hạn'}</Text>
          <Text style={styles.description}>{work.access?`Điểm tiếp cận: ${work.access[1].toFixed(6)}, ${work.access[0].toFixed(6)}`:'Chưa có điểm tiếp cận trong bản lưu.'}</Text>
        </>:<Text style={styles.description}>Gói công việc chưa được tải cho nhiệm vụ này.</Text>}
      </View>
      <View style={styles.card}><Text style={typography.titleMd}>Nháp dữ liệu khảo sát</Text>
        <Text style={styles.description}>Thời gian ghi hình</Text>
        <TextInput accessibilityLabel="Thời gian ghi hình ngoại tuyến" value={draft.recordedAt} editable={!!runtime&&!saving} maxLength={32} placeholder="2026-11-15 08:30" onChangeText={recordedAt=>{setDraft(d=>({...d,recordedAt}));setDirty(true);setMessage(null);}} style={styles.input}/>
        {draft.telemetryKey?<><Text style={styles.description}>Độ lệch SRT so với video (ms)</Text><TextInput accessibilityLabel="Độ lệch SRT ngoại tuyến" value={draft.timeOffset} editable={!!runtime&&!saving} maxLength={32} keyboardType="numbers-and-punctuation" onChangeText={timeOffset=>{setDraft(d=>({...d,timeOffset}));setDirty(true);setMessage(null);}} style={styles.input}/></>:null}
        <Text style={styles.caption}>{draft.videoKey?'Lựa chọn video đã lưu được giữ lại.':'Chưa có video trong nháp.'} {draft.telemetryKey?'Lựa chọn SRT đã lưu được giữ lại.':''}</Text>
        <Button variant="primary" title="Lưu nháp trên máy" loading={saving} disabled={!runtime||loading||saving} onPress={()=>void save()}/>
        {message?<Text accessibilityLiveRegion="polite" style={styles.description}>{message}</Text>:null}
      </View>
      <Text style={styles.caption}>Kết nối lại và khôi phục phiên để chọn tệp, kiểm tra phân công và tiếp tục gửi dữ liệu.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', backgroundColor: colors.surface },
  header: { padding: spacing.lg, gap: spacing.xs },
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  description: { ...typography.bodyMd, color: colors.secondary },
  caption: { ...typography.caption, color: colors.secondary },
  card: { padding: spacing.md, gap: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: 16 },
  input: {...typography.bodyMd,color:colors.neutral,borderWidth:1,borderColor:colors.border,borderRadius:8,minHeight:52,padding:12,backgroundColor:colors.surface},
  footer: { padding: spacing.lg },
});
