import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../design-tokens';
import { Card } from '../Card';
import { Button } from '../Button';
import { inspectOfflineDevice, reconcileDeviceIntent } from '../../api/crewOfflineDevice';
import { reconcileSignedBatch, recoverSignedOrigins, reconcileStartIntent } from '../../offline/crewSignedSync';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { NATIVE_ACCEPTANCE_VERIFIED } from '../../../modules/roadguard-offline-crypto';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';

/** Real Crew sync route, actor/session keyed by parent. Read never changes pending/legacy state. */
export function CrewOfflinePanel({identity, refreshSignal=0}:{identity:QueueIdentity; refreshSignal?: number}) {
  const [probe,setProbe]=useState<Awaited<ReturnType<typeof inspectOfflineDevice>>|null>(null);
  const [records,setRecords]=useState<OfflineJournalRecord[]>([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [showDiagnostics,setShowDiagnostics]=useState(false);
  const sequence=useRef(0),running=useRef(false);
  useEffect(()=>()=>{sequence.current++;},[]);
  const refresh=useCallback(async()=>{
    if(running.current||!sameQueueIdentity(identity))return;running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try {
      const j=await openOfflineJournal(identity),rows=await j.list();
      if(n!==sequence.current||!sameQueueIdentity(identity))return;
      setRecords(rows);
      // Native capability is diagnostic; it must not hide durable online commands.
      try {
        const p=await inspectOfflineDevice(identity);
        if(n===sequence.current&&sameQueueIdentity(identity))setProbe(p);
      }catch {if(n===sequence.current&&sameQueueIdentity(identity))setProbe(null);}
    }catch {if(n===sequence.current&&sameQueueIdentity(identity))setError('Không đọc được thông tin thiết bị hoặc nhật ký; dữ liệu được giữ nguyên.');}
    finally {running.current=false;if(n===sequence.current&&sameQueueIdentity(identity))setBusy(false);}
  },[identity]);
  // Focus is the authoritative initial load. A positive signal is emitted by
  // the parent screen's refresh action and should refresh this panel once.
  useEffect(()=>{if(refreshSignal>0)void refresh();},[refresh,refreshSignal]);
  useFocusEffect(useCallback(()=>{
    void refresh();
  },[refresh]));
  const reconcile=async(record:OfflineJournalRecord)=>{
    if(running.current||!sameQueueIdentity(identity)||!sameQueueIdentity(record.identity,identity))return;
    running.current=true;setBusy(true);setError('');const n=++sequence.current;
    try {
      if(record.proof.kind==='signed-field-batch'){
        if(record.phase==='RECEIVED')await reconcileSignedBatch(record);else await recoverSignedOrigins(record);
      }else if(record.proof.kind==='start-reconciliation')await reconcileStartIntent(record);
      else await reconcileDeviceIntent(record);
      const j=await openOfflineJournal(identity),rows=await j.list();
      if(n===sequence.current&&sameQueueIdentity(identity))setRecords(rows);
    }catch {if(n===sequence.current&&sameQueueIdentity(identity))setError('Chưa xác nhận đầy đủ kết quả. Lệnh, khóa và dữ liệu chờ vẫn được giữ nguyên.');}
    finally {running.current=false;if(n===sequence.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  if(!sameQueueIdentity(identity))return null;
  const pending=records.filter(r=>['UNKNOWN_OUTCOME','IN_FLIGHT','RECEIVED'].includes(r.phase)).length;
  const confirmed=records.filter(r=>r.phase==='RECONCILED').length;
  return <Card style={styles.panel}>
    <View style={styles.heading}><MaterialIcons name="sync" size={20} color={colors.brandGold}/><Text style={typography.titleMd}>Hàng đợi trên thiết bị</Text></View>
    <View style={styles.stateRow}><View><Text style={styles.value}>{records.length}</Text><Text style={styles.label}>Đã lưu</Text></View><View><Text style={styles.value}>{pending}</Text><Text style={styles.label}>Chờ đối soát</Text></View><View><Text style={styles.value}>{confirmed}</Text><Text style={styles.label}>Đã xác nhận</Text></View></View>
    <Text style={styles.description}>Chỉ biên nhận hợp lệ từ máy chủ mới được tính là đã đồng bộ.</Text>
    {error?<Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text>:null}
    {records.length===0?<Text style={styles.description}>Chưa có lệnh cần đối soát.</Text>:records.map(r=><View key={r.id} style={styles.record}><View style={styles.recordTitle}><Text style={typography.labelLg}>{({'signed-field-batch':'Hồ sơ hiện trường','start-reconciliation':'Bắt đầu nhiệm vụ',enrollment:'Đăng ký thiết bị',snapshot:'Dữ liệu nhiệm vụ',revocation:'Thu hồi thiết bị',safety:'An toàn hiện trường','review-request':'Yêu cầu xem xét lại'} as Record<string,string>)[String(r.proof.kind)] ?? 'Thao tác đã lưu'}</Text><Text style={styles.phase}>{({RECONCILED:'Đã xác nhận',RECEIVED:'Cần đối soát',UNKNOWN_OUTCOME:'Chưa rõ kết quả',IN_FLIGHT:'Đang xử lý',PREPARED:'Chờ gửi',CONFLICT:'Dữ liệu đã thay đổi',REJECTED:'Chưa được chấp nhận'} as Record<string,string>)[r.phase] ?? 'Chưa xác nhận'}</Text></View>
      {sameQueueIdentity(r.identity,identity)&&((r.phase==='RECEIVED'&&['signed-field-batch','start-reconciliation','enrollment','snapshot','revocation'].includes(String(r.proof.kind)))||(['UNKNOWN_OUTCOME','IN_FLIGHT'].includes(r.phase)&&['signed-field-batch','start-reconciliation'].includes(String(r.proof.kind))))?<Button title="Đối soát kết quả" variant="secondary" disabled={busy} onPress={()=>void reconcile(r)}/>:null}
    </View>)}
    <Pressable accessibilityRole="button" accessibilityLabel="Chi tiết kỹ thuật" accessibilityState={{expanded:showDiagnostics}} onPress={()=>setShowDiagnostics(v=>!v)} style={styles.diagnosticToggle}><Text style={typography.labelLg}>Chi tiết kỹ thuật</Text><MaterialIcons name={showDiagnostics?'expand-less':'expand-more'} size={20} color={colors.secondary}/></Pressable>
    {showDiagnostics?<View style={styles.diagnostics}><Text style={styles.description}>Thiết bị: {probe?.capability.apiLevel || 'Chưa đọc'}</Text><Text style={styles.description}>{NATIVE_ACCEPTANCE_VERIFIED?'Đã có bằng chứng native trong phạm vi đã kiểm.':'Chưa có bằng chứng native đủ để mở gửi offline.'}</Text><Pressable accessibilityRole="button" style={styles.readButton} onPress={()=>void refresh()} disabled={busy}><Text style={styles.readLabel}>{busy?'Đang đọc…':'Đọc lại nhật ký'}</Text></Pressable></View>:null}
  </Card>;
}

const styles = StyleSheet.create({
  panel: { borderWidth: 1, borderColor: '#E8D9A8', borderRadius: radius.lg, gap: spacing.sm, marginBottom: spacing.md },
  description: { ...typography.caption, color: colors.secondary },
  heading: { flexDirection:'row', alignItems:'center', gap: spacing.xs },
  stateRow: { flexDirection:'row', justifyContent:'space-around', borderTopWidth:1, borderBottomWidth:1, borderColor:colors.border, paddingVertical:spacing.sm },
  value: { ...typography.titleMd, color: colors.neutral, textAlign:'center' },
  label: { ...typography.caption, color: colors.secondary, textAlign:'center' },
  record: { gap: spacing.xs, borderBottomWidth:1, borderColor:colors.border, paddingVertical:spacing.sm },
  recordTitle: { flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', gap: spacing.sm },
  phase: { ...typography.caption, color: colors.secondary },
  error: { color: colors.error },
  diagnosticToggle: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', minHeight:48 },
  diagnostics: { gap: spacing.xs, borderTopWidth:1, borderColor:colors.border, paddingTop:spacing.sm },
  readButton: { alignSelf:'flex-start', minHeight:48, justifyContent:'center' },
  readLabel: { ...typography.labelSm, color: colors.secondary },
});
