import React, { useCallback, useState, useRef, useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { AppHeader } from '../../src/components/AppHeader';
import { Card } from '../../src/components/Card';
import { Chip, type ChipVariant } from '../../src/components/Chip';
import { Button } from '../../src/components/Button';
import { EmptyState } from '../../src/components/EmptyState';
import { Toast } from '../../src/components/Toast';
import { repairCommandErrorMessage } from '../../src/hooks/useRepairBootstrap';
import { useAuthStore } from '../../src/store/auth';
import { currentReceivingIdentity, sameReceivingIdentity, type ReceivingIdentity } from '../../src/api/crewReceivingDraft';
import { discoverReceivingProjects, listReceiving, readReceiving, acknowledgeReceiving, type ReceivingView as BusinessDutyView } from '../../src/api/crewReceivingWorkflow';
import type { CrewProject } from '../../src/api/crewApi';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

export function kindLabel(kind: string | null): string {
  switch (kind) {
    case 'CrewSupplement': case 'CREW_SUPPLEMENT': return 'Yêu cầu bổ sung hồ sơ sửa chữa';
    case 'REPAIR_REVIEW_REQUEST': return 'Yêu cầu quản lý duyệt lượt sửa';
    case 'FIELD_VERIFICATION': return 'Xác minh kết quả đo hiện trường';
    case 'HANDOVER_RECEIPT': return 'Biên nhận bàn giao';
    default: return 'Yêu cầu cần tiếp nhận';
  }
}

export function sourceKindLabel(sourceKind: string | null | undefined): string | null {
  switch (sourceKind) {
    case 'FieldReview': case 'FIELD_SUBMISSION': return 'Kết quả đo hiện trường';
    case 'RepairReview': case 'REPAIR_ATTEMPT': return 'Lượt sửa đã nộp';
    case 'REPAIR_HANDOVER': return 'Bàn giao hạng mục sửa chữa';
    default: return null;
  }
}

export function selectReceivingProject(projects: CrewProject[], current: string | null, hasMore = false): string | null {
  if (projects.length === 1 && !hasMore) return projects[0].projectId;
  return current && projects.some(project => project.projectId === current) ? current : null;
}

export function formatWaiting(seconds: number): string {
  if (seconds <= 0) {
    return '—';
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  if (days > 0) return remainingHours > 0 ? `${days} ngày ${remainingHours} giờ` : `${days} ngày`;
  return hours > 0 ? `${hours} giờ ${minutes} phút` : `${minutes} phút`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return 'Chưa có thời điểm hợp lệ';
  }
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export function ackStateChip(request: BusinessDutyView): { variant: ChipVariant; label: string } {
  if (request.completedAt) return { variant: 'status-pending', label: 'Đã đóng' };
  return request.acknowledgmentId && request.acknowledgedAt
    ? { variant: 'approved', label: 'Đã xác nhận' }
    : { variant: 'status-pending', label: 'Chưa xác nhận' };
}

export default function CrewReceivingScreen() {
  useAuthStore(s => s.token); useAuthStore(s => s.user); useAuthStore(s => s.status);
  const identity=currentReceivingIdentity();
  if(!identity)return <SafeAreaScreen header={<AppHeader subtitle="Yêu cầu cần tiếp nhận" />}><Text>Cần phiên đăng nhập đội sửa chữa hợp lệ.</Text></SafeAreaScreen>;
  return <ReceivingProjects key={JSON.stringify(identity)} identity={identity} />;
}
function ReceivingProjects({identity}:{identity:ReceivingIdentity}) {
  const [projects,setProjects]=useState<CrewProject[]>([]), [cursor,setCursor]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(false);
  const [showHelp,setShowHelp]=useState(false);
  const sequence=useRef(0),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;sequence.current++;};},[]);
  const load=useCallback(async(more=false)=>{
    const n=++sequence.current;setLoading(true);setError(null);
    try {const page=await discoverReceivingProjects(identity,more?cursor??undefined:undefined);
      if(!mounted.current||n!==sequence.current)return;
      setProjects(old=>Array.from(new Map([...(more?old:[]),...page.items].map(p=>[p.projectId,p])).values()));
      setCursor(page.nextCursor);
      if(!more)setSelected(selectReceivingProject(page.items, null, page.nextCursor!==null));
    }catch(e){if(mounted.current&&n===sequence.current)setError(repairCommandErrorMessage(e));}
    finally{if(mounted.current&&n===sequence.current)setLoading(false);}
  },[identity,cursor]);
  useFocusEffect(useCallback(()=>{void load(false);},[identity]));
  return <SafeAreaScreen scroll header={<AppHeader subtitle="Yêu cầu cần tiếp nhận" />}>
    <Pressable onPress={()=>setShowHelp(value=>!value)} accessibilityRole="button" accessibilityState={{expanded:showHelp}} style={styles.helpToggle}>
      <MaterialIcons name="help-outline" size={18} color={colors.brandGold}/><Text style={styles.helpLabel}>Vì sao cần chọn dự án?</Text>
    </Pressable>
    {showHelp?<Text style={[typography.caption,styles.helpText]}>Chỉ hiển thị yêu cầu trong các dự án mà máy chủ xác nhận quyền hiện tại. Danh sách có thể chưa bao phủ tất cả dự án của bạn.</Text>:null}
    {projects.map(p=>selected===p.projectId&&projects.length===1?
      <View key={p.projectId} style={styles.projectSelected}><MaterialIcons name="check-circle" size={18} color={colors.success}/><View style={styles.projectText}><Text style={typography.labelLg}>{p.projectCode}</Text><Text style={typography.caption}>{p.name}</Text></View></View>:
      <Pressable key={p.projectId} accessibilityRole="button" accessibilityState={{selected:selected===p.projectId}} onPress={()=>setSelected(p.projectId)} style={({pressed})=>[styles.projectOption,pressed&&styles.pressed]}>
        <MaterialIcons name={selected===p.projectId?'radio-button-checked':'radio-button-unchecked'} size={18} color={selected===p.projectId?colors.brandGold:colors.secondary}/><View style={styles.projectText}><Text style={typography.labelLg}>{p.projectCode}</Text><Text style={typography.caption}>{p.name}</Text></View>
      </Pressable>)}
    {error?<Text accessibilityRole="alert">{error}</Text>:null}
    {!loading&&!error&&!projects.length?<Text>Không có dự án trong phạm vi được máy chủ trả về.</Text>:null}
    <Button variant="secondary" title="Tải lại dự án" loading={loading} onPress={()=>void load(false)} />
    {cursor?<Button variant="secondary" title="Thêm dự án" disabled={loading} onPress={()=>void load(true)} />:null}
    {selected?<ReceivingRequests key={selected} identity={{...identity,projectId:selected}} />:null}
  </SafeAreaScreen>;
}
function ReceivingRequests({identity}:{identity:ReceivingIdentity}) {
  const [step, setStep] = useState<'list' | 'detail'>('list');
  const [items, setItems] = useState<BusinessDutyView[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BusinessDutyView | null>(null);
  const [acking, setAcking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType,setToastType]=useState<'error'|'success'>('error');
  const [cursor,setCursor]=useState<string|null>(null);
  const sequence=useRef(0),mounted=useRef(true),ackLock=useRef(false);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;sequence.current++;};},[]);
  const active=()=>mounted.current&&sameReceivingIdentity(identity,currentReceivingIdentity(identity.projectId));
  const loadList = useCallback(async (more=false) => {
    const n=++sequence.current;setLoading(true);setListError(null);setStep('list');setSelected(null);
    try {const result=await listReceiving(identity,{limit:25,after:more?cursor??undefined:undefined});
      if(!active()||n!==sequence.current)return;
      setItems(old=>Array.from(new Map([...(more?old:[]),...result.items].map(v=>[v.id,v])).values()));setCursor(result.continuation);
    }catch(error){if(active()&&n===sequence.current)setListError(repairCommandErrorMessage(error));}
    finally{if(active()&&n===sequence.current)setLoading(false);}
  },[identity,cursor]);
  useEffect(()=>{void loadList();},[identity.projectId]);
  const openDetail=async(requestId:string)=>{
    if(ackLock.current)return;
    const n=++sequence.current;setLoading(true);
    try{const detail=await readReceiving(identity,requestId);if(active()&&n===sequence.current){setSelected(detail);setStep('detail');}}
    catch(e){if(active()&&n===sequence.current){setToastType('error');setToast(repairCommandErrorMessage(e));}}
    finally{if(active()&&n===sequence.current)setLoading(false);}
  };
  const handleAck=async()=>{
    if(!selected||selected.acknowledgmentId||selected.completedAt||ackLock.current)return;
    ackLock.current=true;setAcking(true);setToast(null);
    try{const result=await acknowledgeReceiving(identity,selected.id);if(active()){
      setSelected(result);setItems(old=>old.map(v=>v.id===result.id?result:v));setToastType('success');setToast('Máy chủ đã xác nhận bạn tiếp nhận yêu cầu. Đây không phải phê duyệt hay hoàn thành sửa chữa.');
    }}catch(e){if(active()){setToastType('error');setToast(repairCommandErrorMessage(e)+' Lệnh được giữ để đối soát; thử lại giữ nguyên khóa và phiên bản.');}}
    finally{ackLock.current=false;if(active())setAcking(false);}
  };

  const renderList = () => {
    if (loading && items.length === 0) {
      return (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, styles.loadingText]}>Đang tải yêu cầu cần tiếp nhận…</Text>
        </View>
      );
    }
    if (listError) {
      return (
        <EmptyState
          icon="error-outline"
          title="Không tải được yêu cầu cần tiếp nhận"
          message={listError}
          actionLabel="Tải lại"
          onAction={() => void loadList()}
        />
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          icon="inbox"
          title="Chưa có yêu cầu cần tiếp nhận"
          message="Khi có yêu cầu được gửi cho đội sửa chữa, yêu cầu sẽ xuất hiện tại đây để bạn xác nhận đã tiếp nhận."
        />
      );
    }
    return (
      <View style={styles.list}>
        {items.map((request) => {
          const state = ackStateChip(request);
          return (
            <Pressable
              key={request.id}
              disabled={acking || loading}
              onPress={() => void openDetail(request.id)}
              accessibilityRole="button"
              accessibilityLabel={`${kindLabel(request.kind)} — ${state.label}`}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card style={styles.rowCard}>
                <View style={styles.rowHeader}>
                  <View style={styles.rowTitleWrap}>
                    <MaterialIcons name="inbox" size={16} color={colors.brandGold} />
                    <Text style={[typography.labelLg, styles.rowTitle]}>{kindLabel(request.kind)}</Text>
                  </View>
                  <Chip variant={state.variant} label={state.label} uppercase={false} />
                </View>
                <View style={styles.metaRow}>
                  <MaterialIcons name="schedule" size={13} color={colors.secondary} />
                  <Text style={[typography.caption, styles.metaText]}>
                    Gửi lúc {formatDateTime(request.requestedAt)} • Chờ {formatWaiting(request.waitingSeconds)}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <MaterialIcons name="person" size={13} color={colors.secondary} />
                  <Text style={[typography.caption, styles.metaText]}>
                    {sourceKindLabel(request.sourceKind) ? `Nguồn: ${sourceKindLabel(request.sourceKind)}` : null}
                  </Text>
                </View>
              </Card>
            </Pressable>
          );
        })}
      </View>
    );
  };

  const renderDetail = () => {
    if (!selected) {
      return null;
    }
    const state = ackStateChip(selected);
    const acknowledged = Boolean(selected.acknowledgmentId && selected.acknowledgedAt);
    const closed = Boolean(selected.completedAt);
    const sourceLabel = sourceKindLabel(selected.sourceKind);
    return (
      <View>
        <Card style={styles.detailCard}>
          <View style={styles.rowHeader}>
            <Text style={[typography.titleMd, styles.detailTitle]}>{kindLabel(selected.kind)}</Text>
            <Chip variant={state.variant} label={state.label} uppercase={false} />
          </View>

          {sourceLabel ? (
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Nguồn yêu cầu</Text>
              <Text style={[typography.bodyMd, styles.infoValue]}>{sourceLabel}</Text>
            </View>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Gửi lúc</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {formatDateTime(selected.requestedAt)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[typography.caption, styles.infoLabel]}>Thời gian chờ</Text>
            <Text style={[typography.bodyMd, styles.infoValue]}>
              {formatWaiting(selected.waitingSeconds)}
            </Text>
          </View>
          {acknowledged ? (
            <View style={styles.infoRow}>
              <Text style={[typography.caption, styles.infoLabel]}>Đã xác nhận lúc</Text>
              <Text style={[typography.bodyMd, styles.infoValue]}>
                {formatDateTime(selected.acknowledgedAt)}
              </Text>
            </View>
          ) : null}
        </Card>

        <View style={styles.notice}>
          <MaterialIcons name="info-outline" size={16} color={colors.brandGold} />
          <Text style={[typography.caption, styles.noticeText]}>
            Xác nhận là thao tác bất biến: yêu cầu sẽ được ghi nhận cho người tiếp nhận đầu tiên. Xác nhận là không thể hoàn tác.
          </Text>
        </View>

        <Button
          variant="primary"
          title={closed || acknowledged ? (closed ? 'Đã đóng' : 'Đã xác nhận') : 'Xác nhận đã tiếp nhận yêu cầu'}
          loading={acking}
          disabled={closed || acknowledged || acking}
          onPress={() => void handleAck()}
          style={styles.ackButton}
        />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {step==='detail'?<Pressable disabled={acking} onPress={()=>{sequence.current++;setStep('list');setSelected(null);}} accessibilityRole="button" accessibilityLabel="Quay lại danh sách" style={{minHeight:48,justifyContent:'center'}}><Text style={typography.labelLg}>← Danh sách yêu cầu</Text></Pressable>:null}
        {step === 'list' ? <>{renderList()}<Button variant="secondary" title="Tải lại yêu cầu" disabled={loading||acking} onPress={()=>void loadList()} />{cursor?<Button variant="secondary" title="Tải thêm yêu cầu" disabled={loading||acking} onPress={()=>void loadList(true)} />:null}</> : renderDetail()}
      {toast ? <Toast type={toastType} message={toast} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.secondary,
  },
  list: {
    paddingBottom: spacing.lg,
  },
  rowCard: {
    marginBottom: spacing.md,
    borderRadius: radius.xl,
  },
  rowHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flexShrink: 1,
  },
  rowTitle: {
    color: colors.neutral,
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  metaText: {
    color: colors.secondary,
    flexShrink: 1,
  },
  detailCard: {
    borderRadius: radius.xl,
  },
  detailTitle: {
    color: colors.neutral,
    flexShrink: 1,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    color: colors.secondary,
    flexShrink: 0,
  },
  infoValue: {
    color: colors.neutral,
    flexShrink: 1,
    textAlign: 'right',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  noticeText: {
    color: colors.secondary,
    flex: 1,
  },
  ackButton: {
    marginTop: spacing.lg,
  },
  helpToggle: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  helpLabel: {
    ...typography.labelLg,
    color: colors.secondary,
  },
  helpText: {
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  projectOption: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  projectSelected: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  projectText: { flex: 1, gap: spacing.xs },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  topBarTitle: {
    color: colors.neutral,
  },
  backButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.7,
  },
});
