import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect, useIsFocused } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraCapturedPicture } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { ViewFinder, type Coords, type CaptureMetadata } from '../../src/components/ViewFinder';
import { Button } from '../../src/components/Button';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { CrewTaskBoundary, useCrewIdentity } from './tasks';
import { fieldCapabilityBlock, type CrewTask } from '../../src/api/crewApi';
import { currentFieldContext, openFieldRuntime, loadFieldDraft, captureFieldPhoto, fieldDraftPending, fieldErrorMessage, type FieldDraft } from '../../src/api/crewFieldDraft';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { CrewPressable } from '../../src/components/crew/CrewMotion';

type ViewfinderMode = 'before' | 'after' | 'measurement';

const MODES: { key: ViewfinderMode; label: string }[] = [
  { key: 'before', label: 'Trước' },
  { key: 'after', label: 'Sau' },
  { key: 'measurement', label: 'Đo' },
];

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

function formatDateTime(date: Date): string {
  const dd = pad(date.getDate());
  const mm = pad(date.getMonth() + 1);
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${dd}/${mm}/${date.getFullYear()} ${hh}:${min}:${ss}`;
}

export default function CrewViewfinderScreen() {
  return <CrewTaskBoundary operational={false} localDraft>{task => <CrewViewfinderScreenContent key={`${task.projectId}:${task.id}`} task={task} />}</CrewTaskBoundary>;
}
function CrewViewfinderScreenContent({ task }: { task: CrewTask }) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const params = useLocalSearchParams<{ id?: string; mode?: string; supplement?: string }>();
  const initialMode: ViewfinderMode = params.mode === 'AFTER' ? 'after' : 'before';

  const [mode, setMode] = useState<ViewfinderMode>(initialMode);
  const [flashOn, setFlashOn] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [coords, setCoords] = useState<Coords | null>(null);

  const { user, scope } = useCrewIdentity();
  const [draft, setDraft] = useState<FieldDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [localRecoveryBlocked, setLocalRecoveryBlocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [postRepairCapture,setPostRepairCapture]=useState(false);
  const [cameraShooting, setCameraShooting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'locating' | 'ready' | 'unavailable'>('locating');
  const normalAfter=mode==='after'&&(task.detail?.mode==='NORMAL'||task.detail?.mode==='CONDITIONAL_FT');
  const afterBlocked=normalAfter&&(!draft?.repairClaim||!postRepairCapture);
  const activeRef=useRef(false),savingRef=useRef(false),pickerRef=useRef(false),cameraShootingRef=useRef(false);
  const handleShootingChange = useCallback((value: boolean) => { cameraShootingRef.current = value; setCameraShooting(value); }, []);
  const matches=(c:ReturnType<typeof currentFieldContext>)=>!!c&&JSON.stringify(currentFieldContext(task.projectId,task.id))===JSON.stringify(c);
  useFocusEffect(useCallback(() => {
    let active=true;activeRef.current=true;setReady(false);setCoords(null);setLocalRecoveryBlocked(false);
    const context=currentFieldContext(task.projectId,task.id);
    if (context) void openFieldRuntime(context).then(runtime=>loadFieldDraft(context,runtime)).then(value=>{if(active&&matches(context)){setDraft(value);setReady(true);}}).catch(error=>{if(active&&matches(context)){setDraft({ ...context, captures: [], measurements: [], locationProof: null });setReady(true);setLocalRecoveryBlocked(true);setNotice(`Không thể dùng nháp cũ: ${fieldErrorMessage(error)} Chỉ đọc hồ sơ máy chủ; cần đối soát trước khi lưu ảnh mới.`);}});
    return ()=>{active=false;activeRef.current=false;};
  },[task.id,task.projectId,scope]));
  const block = !user || !scope || !task.detail ? 'Phiên đội sửa chữa không hợp lệ.' : fieldCapabilityBlock(task.detail,task.etag??'',user.id,'capture');
  const beforeReady = !!draft?.captures.some(c=>c.purpose==='BEFORE');
  const afterReady = !!draft?.captures.some(c=>c.purpose==='AFTER');
  const photoCount = draft?.captures.length??0;
  const previewDate = new Date();
  const gpsText = coords ? `GPS: ${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : locationStatus === 'locating' ? 'Đang lấy vị trí thiết bị…' : 'Chưa lấy được vị trí. Bấm Lấy lại GPS để thử lại.';
  const savePhoto = async (uri: string, mediaType: string, camera: boolean, metadata?: CaptureMetadata) => {
    if (!isFocused || !activeRef.current || savingRef.current || busy || block || afterBlocked || localRecoveryBlocked || !ready || !draft || draft.command) {
      if (activeRef.current && !busy && (block || afterBlocked || localRecoveryBlocked)) setNotice(block || (afterBlocked ? 'Cần xác nhận điều kiện ảnh sau sửa.' : 'Cần đối soát nháp cũ trước khi lưu ảnh mới.'));
      return;
    }
    const context=currentFieldContext(task.projectId,task.id);if(!context)return;
    savingRef.current=true;setBusy(true);
    try {
      const value=await captureFieldPhoto(context,uri,mode==='after'?'AFTER':mode==='measurement'?'MEASUREMENT':'BEFORE',mediaType,metadata?.coordinates??null,camera,normalAfter&&postRepairCapture,metadata?.capturedAt,{...context,data:task.detail!,etag:task.etag??''});
      if(!activeRef.current||!matches(context))return;
      setDraft(value);setNotice(camera&&!metadata?.coordinates?'Đã lưu ảnh vào nháp, chưa lấy được GPS cho ảnh này. Xem trong Thông tin ảnh tại hồ sơ.':'Đã lưu ảnh vào nháp riêng của nhiệm vụ; chưa tải ảnh lên hoặc gửi hồ sơ.');
    } catch(error) {if(activeRef.current&&matches(context))setNotice(fieldErrorMessage(error));}
    finally {savingRef.current=false;if(activeRef.current&&matches(context))setBusy(false);}
  };
  const renderedContext=currentFieldContext(task.projectId,task.id);
  const handleCapture = (photo: CameraCapturedPicture, metadata?: CaptureMetadata) => {if(matches(renderedContext))void savePhoto(photo.uri,'image/jpeg',true,metadata);};
  const fieldHref = { pathname: '/(crew)/field-review' as const, params: { id: task.id, projectId: task.projectId, ...(params.supplement === '1' ? { supplement: '1' } : {}) } };
  const closeCamera = () => { if (router.canGoBack()) router.back(); else router.dismissTo(fieldHref); };
  if (block) return <SafeAreaView style={styles.blockedSafe}>
    <ScrollView contentContainerStyle={styles.blockedContent}>
      <View style={styles.blockedPanel}>
        <View style={styles.blockedIcon}><MaterialIcons name="no-photography" size={28} color={colors.secondary} /></View>
        <Text style={styles.blockedTitle}>Chưa thể chụp ảnh</Text>
        <Text style={styles.blockedMessage}>{block}</Text>
        <View style={styles.blockedAction}><Button variant="secondary" title="Quay lại" onPress={closeCamera} /></View>
      </View>
    </ScrollView>
  </SafeAreaView>;

  const watermark = (
    <View style={styles.watermarkCard} pointerEvents="none">
      <View style={styles.watermarkRow}>
        <View style={styles.watermarkGps}>
          <MaterialIcons name="location-on" size={14} color={colors.warning} />
          <Text style={[typography.labelSm, styles.watermarkGpsText]}>{gpsText}</Text>
        </View>
        <Text style={styles.rtkBadge}>{coords ? 'Có GPS' : locationStatus === 'locating' ? 'Đang lấy' : 'Chưa có'}</Text>
      </View>
      <View style={styles.watermarkMeta}>
        <MaterialIcons name="description" size={13} color="#94A3B8" />
        <Text style={[typography.caption, styles.watermarkMetaText]}>
          {task.wo_code || `ID nhiệm vụ: ${task.id.slice(0,8)}`}
        </Text>
      </View>
      <View style={styles.watermarkMeta}>
        <MaterialIcons name="warning" size={13} color="#94A3B8" />
        <Text style={[typography.caption, styles.watermarkMetaText]}>
          {task.defect_type_code ? defectTypeLabel(task.defect_type_code) : 'Chưa có phân loại từ máy chủ'}
        </Text>
      </View>
      <View style={styles.watermarkMeta}>
        <MaterialIcons name="calendar-today" size={13} color="#94A3B8" />
        <Text style={[typography.caption, styles.watermarkMetaText]}>{formatDateTime(previewDate)}</Text>
      </View>
    </View>
  );

  const thumbs = (
    <View style={styles.thumbsRow}>
      <View style={styles.thumb}>
        <MaterialIcons name="image" size={18} color="#64748B" />
        <View style={[styles.thumbCheck, beforeReady ? styles.thumbCheckGreen : styles.thumbCheckPending]}>
          <MaterialIcons name={beforeReady ? 'check' : 'add'} size={10} color={colors.surface} />
        </View>
        <Text style={[typography.labelSm, beforeReady ? styles.thumbLabelGreen : styles.thumbLabelPending]}>
          TRƯỚC
        </Text>
      </View>

      {task.detail?.purpose === 'PostRepair' ? (
        <View style={styles.thumb}>
          <MaterialIcons name="image" size={18} color="#64748B" />
          <View style={[styles.thumbCheck, afterReady ? styles.thumbCheckGold : styles.thumbCheckPending]}>
            <MaterialIcons name={afterReady ? 'check' : 'add'} size={10} color={colors.surface} />
          </View>
          <Text style={[typography.labelSm, afterReady ? styles.thumbLabelGold : styles.thumbLabelPending]}>
            SAU
          </Text>
        </View>
      ) : null}

      <View style={styles.readyBlock}>
        <Text style={[typography.labelLg, styles.readyCount]}>
          {photoCount} ảnh nháp
        </Text>
        <Text
          style={[
            typography.labelLg,
            photoCount > 0 ? styles.readyOk : styles.readyWaiting,
          ]}
        >
          {photoCount > 0 ? 'Đã lưu nháp' : 'Chưa có ảnh'}
        </Text>
      </View>
    </View>
  );

  const handlePickGallery = async () => {
    if(!isFocused||pickerRef.current||savingRef.current||busy||!ready||normalAfter||draft?.command||localRecoveryBlocked){if(localRecoveryBlocked)setNotice('Cần đối soát nháp cũ trước khi chọn ảnh mới.');return;}
    const pickedContext=currentFieldContext(task.projectId,task.id),pickedMode=mode;
    if(!pickedContext)return;pickerRef.current=true;
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'image/jpeg', 'image/png'],
        // Read the granted source URI, then captureFieldPhoto preserves it in
        // this experience's document directory. Expo Go's shared picker cache
        // is outside the scoped File API permissions.
        copyToCacheDirectory: false,
      });
      if (activeRef.current && matches(pickedContext) && mode===pickedMode && !res.canceled && res.assets && res.assets.length > 0) {
        await savePhoto(res.assets[0].uri,res.assets[0].mimeType ?? '',false);
      }
    } catch { if(activeRef.current&&matches(pickedContext))setNotice('Không chọn được ảnh. Vui lòng thử lại.'); } finally {pickerRef.current=false;}
  };

  const galleryButton = (
    <CrewPressable
      accessibilityRole="button"
      accessibilityLabel="Chọn ảnh từ thiết bị"
      disabled={!isFocused||normalAfter||busy||!ready||!!draft?.command||localRecoveryBlocked}
      onPress={handlePickGallery}
      style={({ pressed }) => [styles.sideControl, pressed && styles.sideControlPressed]}
    >
      <MaterialIcons name="photo-library" size={20} color={colors.surface} />
    </CrewPressable>
  );

  const switchButton = (
    <CrewPressable
      accessibilityRole="button"
      accessibilityLabel="Đổi máy ảnh trước/sau"
      disabled={!isFocused||busy||cameraShooting}
      accessibilityState={{ disabled: !isFocused||busy||cameraShooting }}
      onPress={() => { if (!isFocused||busy||cameraShootingRef.current) return; setFacing((f) => (f === 'back' ? 'front' : 'back')); }}
      style={({ pressed }) => [styles.sideControl, (!isFocused||busy||cameraShooting) && styles.sideControlDisabled, pressed && !cameraShooting && styles.sideControlPressed]}
    >
      <MaterialIcons name="flip-camera-android" size={20} color={colors.surface} />
    </CrewPressable>
  );

  const handleConfirm = () => {
    router.dismissTo(fieldHref);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.topBar}>
        <CrewPressable onPress={closeCamera} accessibilityRole="button" accessibilityLabel="Đóng máy ảnh" style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
          <MaterialIcons name="close" size={20} color={colors.surface} />
        </CrewPressable>

        <View style={styles.modePills}>
          {MODES.filter(item=>item.key!=='after'||task.detail?.purpose==='PostRepair').map((item) => {
            const active = item.key === mode;
            return (
              <CrewPressable
                key={item.key}
                disabled={busy||pickerRef.current}
                onPress={() => {if(savingRef.current||pickerRef.current)return;setMode(item.key);setPostRepairCapture(false);}}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.modePill, active && styles.modePillActive]}
              >
                {active && <View style={styles.modeDot} />}
                <Text style={[typography.labelLg, active ? styles.modeTextActive : styles.modeText]}>{item.label}</Text>
              </CrewPressable>
            );
          })}
        </View>

        <View style={styles.rightActions}>
          <CrewPressable
            onPress={() => setFlashOn((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={flashOn ? 'Tắt đèn flash' : 'Bật đèn flash'}
            accessibilityState={{ selected: flashOn }}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          >
            <MaterialIcons name={flashOn ? 'flash-on' : 'flash-off'} size={19} color={colors.surface} />
          </CrewPressable>
        </View>
      </View>

      {normalAfter?<View style={{padding:spacing.sm}}>
        <Text style={{...typography.bodyMd,color:colors.surface,marginBottom:spacing.sm}}>{draft?.repairClaim?'Chụp trực tiếp hiện trạng sau khi đã sửa xong.':'Chưa đến bước chụp sau sửa. Cần lưu số đo và tải ảnh trước, gửi đánh giá, sau đó bắt đầu và kết thúc thi công.'}</Text>
        {draft?.repairClaim?<Pressable accessibilityRole="checkbox" accessibilityLabel="Tôi xác nhận đang chụp hiện trạng sau sửa" accessibilityState={{checked:postRepairCapture,disabled:busy||!!draft.command}} disabled={busy||!!draft.command} onPress={()=>setPostRepairCapture(v=>!v)} style={({pressed})=>[styles.afterConfirmation,postRepairCapture&&styles.afterConfirmationSelected,pressed&&styles.afterConfirmationPressed]}>
          <MaterialIcons name={postRepairCapture?'check-box':'check-box-outline-blank'} size={26} color="#FFFFFF"/>
          <Text style={styles.afterConfirmationText}>{postRepairCapture?'Đã xác nhận chụp sau sửa':'Xác nhận chụp sau sửa'}</Text>
        </Pressable>:<Button variant="secondary" style={{backgroundColor:colors.surface}} title="Xem bước cần làm để chụp sau" disabled={busy||cameraShooting||pickerRef.current} onPress={()=>router.dismissTo({pathname:'/(crew)/progress',params:{id:task.id,projectId:task.projectId}})}/>}
      </View>:null}
      {!ready?<Button variant="secondary" style={{backgroundColor:colors.surface}} title="Quay lại hồ sơ để tải lại nháp" onPress={()=>router.dismissTo(fieldHref)}/>:null}
      <View style={styles.viewport}>
        <ViewFinder
          key={`${task.projectId}:${task.id}:${isFocused}`}
          active={isFocused}
          taskKey={`${task.projectId}:${task.id}`}
          disabled={busy||!ready||!!draft?.command||afterBlocked||localRecoveryBlocked}
          disabledReason={localRecoveryBlocked ? 'Nháp phiên cũ cần đối soát trước khi chụp ảnh.' : !ready ? 'Đang mở hồ sơ hiện trường…' : draft?.command ? 'Hồ sơ có lệnh đang chờ đối soát.' : afterBlocked ? 'Cần xác nhận điều kiện ảnh sau sửa.' : busy ? 'Đang lưu ảnh vào nháp…' : undefined}
          onCapture={handleCapture}
          freshLocationOnCapture
          onShootingChange={handleShootingChange}
          onCoordsChange={setCoords}
          onLocationStatusChange={setLocationStatus}
          defectType={task.defect_type_code ? defectTypeLabel(task.defect_type_code) : ''}
          flashMode={flashOn ? 'on' : 'off'}
          facing={facing}
          watermarkContent={watermark}
          hudItems={thumbs}
          leftControl={galleryButton}
          rightControl={switchButton}
        />
      </View>

      <View style={styles.bottomSheet}>

        <Button variant="primary" title="Đo kiểm và hồ sơ hiện trường" disabled={busy || !ready} onPress={handleConfirm} />

        <Text style={[typography.caption, styles.sheetHint]}>
          {notice || 'Ảnh chụp lưu GPS tại lần chụp. Ảnh chọn từ máy chỉ đọc GPS gốc nếu ảnh còn thông tin này.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  blockedSafe: { flex: 1, backgroundColor: colors.surfaceAlt },
  blockedContent: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center' },
  blockedPanel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  blockedIcon: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: '#FBF8EE', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  blockedTitle: { ...typography.titleMd, color: colors.neutral },
  blockedMessage: { ...typography.bodyMd, color: colors.secondary },
  blockedAction: { alignSelf: 'flex-start', minWidth: 144, marginTop: spacing.md },
  afterConfirmation: {minHeight:52,padding:spacing.md,gap:spacing.sm,flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:'#94A3B8',borderRadius:radius.md,backgroundColor:'#334155'},
  afterConfirmationSelected: {backgroundColor:'#14532D',borderColor:'#86EFAC'},
  afterConfirmationPressed: {opacity:0.85},
  afterConfirmationText: {...typography.labelLg,color:'#FFFFFF',flex:1,flexShrink:1},
  safe: {
    flex: 1,
    backgroundColor: '#0F141C',
  },
  topBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 20, 28, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flexShrink: 1,
    alignItems: 'center',
    backgroundColor: '#1E2638',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: radius.lg,
    padding: 2,
  },
  modePill: {
    minHeight: 48,
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radius.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm + 6,
  },
  modePillActive: {
    backgroundColor: colors.primary,
  },
  modeDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.onSurface,
  },
  modeText: {
    ...typography.bodyMd,
    color: '#CBD5E1',
  },
  modeTextActive: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '500',
  },
  viewport: {
    flex: 1,
  },
  watermarkCard: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: radius.lg,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    gap: spacing.xs,
  },
  watermarkRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  watermarkGps: {
    flexDirection: 'row',
    flexShrink: 1,
    alignItems: 'center',
    gap: spacing.xs,
  },
  watermarkGpsText: {
    ...typography.caption,
    flexShrink: 1,
    color: colors.warning,
  },
  rtkBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.4)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    marginLeft: spacing.sm,
    color: '#6EE7B7',
    ...typography.caption,
    overflow: 'hidden',
  },
  watermarkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watermarkMetaText: {
    ...typography.caption,
    flexShrink: 1,
    color: '#CBD5E1',
  },
  thumbsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  thumbPending: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#64748B',
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
  },
  thumbFilled: {
    borderStyle: 'solid',
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  thumbCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCheckGreen: {
    backgroundColor: colors.success,
  },
  thumbCheckGold: {
    backgroundColor: colors.primary,
  },
  thumbCheckPending: {
    backgroundColor: colors.secondary,
  },
  thumbLabelGreen: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    color: colors.surface,
    backgroundColor: 'rgba(4, 120, 87, 0.8)',
    borderRadius: radius.sm,
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  thumbLabelGold: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    color: colors.onSurface,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  thumbLabelPending: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    color: '#CBD5E1',
    marginTop: 2,
  },
  readyBlock: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  readyCount: {
    ...typography.bodyMd,
    color: colors.surface,
  },
  readyOk: {
    ...typography.caption,
    color: '#86EFAC',
  },
  readyWaiting: {
    ...typography.caption,
    color: colors.warning,
  },
  sideControl: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideControlPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sideControlDisabled: {
    opacity: 0.45,
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetHint: {
    ...typography.bodyMd,
    color: '#555F71',
    textAlign: 'left',
  },
});
