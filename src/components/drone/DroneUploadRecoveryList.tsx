import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { listDroneUploadRecovery } from '../../api/droneTaskJournal';
import { operatorTaskDisplayCode } from '../../api/operator-task-view';
import { useOperatorReadScope } from '../../hooks/useOperatorReadScope';
import { Card } from '../Card';
import { colors, spacing, typography } from '../../design-tokens';
import { operatorAppearance } from './appearance';

type Row = Awaited<ReturnType<typeof listDroneUploadRecovery>>[number];
const statusLabel = (row: Row) => row.cancelUnknown ? 'Cần đối soát yêu cầu hủy' : row.cancelled ? 'Máy chủ đã xác nhận hủy' : row.includedInDataset ? 'Tệp thuộc hồ sơ đã nộp' : row.transportInterrupted ? 'Truyền tệp gián đoạn · Các phần đã tải được giữ' : ({
  PREPARED:'Đã lưu yêu cầu', SESSION_CREATED:'Đã mở phiên tải', PARTS_IN_PROGRESS:'Tải tệp chưa hoàn tất',
  COMPLETE_UNKNOWN:'Cần đối soát hoàn tất tải', VERIFY_PENDING:'Chờ máy chủ xác minh tệp',
  VERIFIED:'Tệp đã xác minh · Chưa xác nhận nộp hồ sơ', DATASET_UNKNOWN:'Cần đối soát hồ sơ đã gửi',
  DATASET_CONFIRMED:'Máy chủ đã nhận hồ sơ', CONFLICT:'Cần kiểm tra phiên bản', FAILED:'Cần kiểm tra lỗi tải tệp',
})[row.status];

/** Read-only discovery. All transfer and reconciliation stays in the guarded upload workflow. */
export function DroneUploadRecoveryList() {
  const scope = useOperatorReadScope('upload-recovery'), router = useRouter();
  const [rows,setRows] = useState<Row[]>([]), [dataScope,setDataScope] = useState<string|null>(null);
  const [busy,setBusy] = useState(false), [error,setError] = useState(false), [expanded,setExpanded] = useState(false);
  const lock = useRef(false);
  const load = async () => {
    const current = scope.capture(); if (!current() || lock.current) return;
    lock.current = true; setBusy(true); setError(false);
    try { const result = await listDroneUploadRecovery(); if(current()){setRows(result);setDataScope(scope.key);} }
    catch { if(current())setError(true); }
    finally { if(current()){lock.current=false;setBusy(false);} }
  };
  useEffect(()=>{setRows([]);setDataScope(null);setExpanded(false);setBusy(false);setError(false);lock.current=false;void load();},[scope.key]);
  if (!scope.key) return null;
  const visible = dataScope === scope.key ? rows : [];
  const history = visible.filter(row=>row.cancelled || row.includedInDataset || row.status==='DATASET_CONFIRMED');
  const pending = visible.filter(row=>!history.includes(row));
  const renderRow = (row:Row) => <Pressable key={row.key} testID={`upload-recovery-${row.key}`} accessibilityRole="button"
    accessibilityLabel={`${operatorTaskDisplayCode(row.taskId)}, ${statusLabel(row)}, mở hồ sơ`}
    onPress={()=>{if(scope.capture()())router.push(`/(drone)/upload?taskId=${encodeURIComponent(row.taskId)}`);}}
    style={({pressed})=>[styles.row,pressed&&styles.pressed]}>
    <MaterialIcons name={row.kind==='DRONE_DATASET_INTENT'?'folder-open':'video-library'} size={24} color={colors.secondary}/>
    <View style={styles.copy}><Text style={styles.title}>{operatorTaskDisplayCode(row.taskId)}</Text>
      <Text style={styles.caption}>{statusLabel(row)}</Text>
      {row.partCount>0 && !row.cancelled ? <Text style={styles.caption}>{row.partCount} phần tải đã được lưu</Text>:null}
    </View><MaterialIcons name="chevron-right" size={24} color={colors.secondary}/>
  </Pressable>;
  return <Card style={{...operatorAppearance.card,gap:spacing.sm,marginBottom:spacing.md}}>
    <View style={styles.heading}><Text style={styles.headingText}>Hồ sơ tải lên</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Đọc lại hồ sơ tải lên" accessibilityState={{busy,disabled:busy}} disabled={busy} onPress={()=>void load()} style={styles.refresh}>
        {busy?<ActivityIndicator color={colors.secondary}/>:<MaterialIcons name="refresh" size={22} color={colors.secondary}/>}
      </Pressable>
    </View>
    {pending.length ? <Text style={styles.caption}>{pending.length} mục cần xử lý · Mở hồ sơ để tiếp tục hoặc đối soát.</Text> : dataScope===scope.key ? <Text style={styles.caption}>Không có hồ sơ tải lên cần xử lý.</Text>:null}
    {pending.map(renderRow)}
    {history.length ? <><Pressable testID="upload-history-toggle" accessibilityRole="button" accessibilityLabel="Lịch sử tải lên" accessibilityState={{expanded}} onPress={()=>setExpanded(value=>!value)} style={styles.history}>
      <MaterialIcons name="history" size={22} color={colors.secondary}/><Text style={styles.historyText}>Lịch sử ({history.length})</Text>
      <MaterialIcons name={expanded?'expand-less':'expand-more'} size={24} color={colors.secondary}/>
    </Pressable>{expanded?history.map(renderRow):null}</>:null}
    {error?<Text accessibilityRole="alert" style={styles.caption}>Không đọc được hồ sơ tải lên. Dữ liệu vẫn được giữ; hãy thử đọc lại.</Text>:null}
  </Card>;
}
const styles = StyleSheet.create({
  heading:{flexDirection:'row',alignItems:'center',gap:12}, headingText:{...typography.titleMd,color:colors.neutral,flex:1},
  refresh:{minHeight:48,minWidth:48,alignItems:'center',justifyContent:'center'},
  row:{minHeight:76,flexDirection:'row',alignItems:'center',gap:12,paddingVertical:12,borderBottomWidth:1,borderBottomColor:colors.border},
  copy:{flex:1,minWidth:0,gap:4},title:{...typography.bodyMd,color:colors.neutral,fontFamily:'Roboto-Medium'},
  caption:{...typography.caption,color:colors.secondary,lineHeight:19,flexShrink:1},
  history:{minHeight:52,flexDirection:'row',alignItems:'center',gap:12,padding:8,borderRadius:8,backgroundColor:colors.surfaceAlt},
  historyText:{...typography.bodyMd,color:colors.secondary,flex:1},pressed:{backgroundColor:operatorAppearance.pressed},
});
