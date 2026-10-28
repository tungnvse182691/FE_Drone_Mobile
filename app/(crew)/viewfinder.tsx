import React, { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { CameraCapturedPicture } from 'expo-camera';
import * as DocumentPicker from 'expo-document-picker';
import { ViewFinder, type Coords } from '../../src/components/ViewFinder';
import { Button } from '../../src/components/Button';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { CrewTaskBoundary, useCrewIdentity } from './tasks';
import { fieldCapabilityBlock, type CrewTask } from '../../src/api/crewApi';
import { currentFieldContext, openFieldRuntime, loadFieldDraft, captureFieldPhoto, fieldDraftPending, fieldErrorMessage, type FieldDraft } from '../../src/api/crewFieldDraft';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

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
  return <CrewTaskBoundary operational={false}>{task => <CrewViewfinderScreenContent task={task} />}</CrewTaskBoundary>;
}
function CrewViewfinderScreenContent({ task }: { task: CrewTask }) {
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const initialMode: ViewfinderMode = params.mode === 'AFTER' ? 'after' : 'before';

  const [mode, setMode] = useState<ViewfinderMode>(initialMode);
  const [flashOn, setFlashOn] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [coords, setCoords] = useState<Coords | null>(null);

  const { user, scope } = useCrewIdentity();
  const [draft, setDraft] = useState<FieldDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [ready, setReady] = useState(false);
  const [postRepairCapture,setPostRepairCapture]=useState(false);
  const normalAfter=mode==='after'&&task.detail?.mode==='NORMAL';
  const afterBlocked=normalAfter&&(!draft?.repairClaim||!postRepairCapture);
  const activeRef=useRef(false);
  useFocusEffect(useCallback(() => {
    let active=true;activeRef.current=true;setReady(false);
    const context=currentFieldContext(task.projectId,task.id);
    if (context) void openFieldRuntime(context).then(runtime=>loadFieldDraft(context,runtime)).then(value=>{if(active){setDraft(value);setReady(true);}}).catch(error=>{if(active)setNotice(fieldErrorMessage(error));});
    return ()=>{active=false;activeRef.current=false;};
  },[task.id,task.projectId,scope]));
  const block = !user || !scope || !task.detail ? 'Phiên Crew không hợp lệ.' : fieldCapabilityBlock(task.detail,task.etag??'',user.id,'capture');
  const beforeReady = !!draft?.captures.some(c=>c.purpose==='BEFORE');
  const afterReady = !!draft?.captures.some(c=>c.purpose==='AFTER');
  const photoCount = draft?.captures.length??0;
  const previewDate = new Date();
  const gpsText = coords ? `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}` : 'Chưa có GPS quan sát';
  const savePhoto = async (uri: string, mediaType: string, camera: boolean) => {
    if (!activeRef.current || busy || block || afterBlocked || !ready || !draft || draft.command) return;
    const context=currentFieldContext(task.projectId,task.id);if(!context)return;
    setBusy(true);
    try {
      const value=await captureFieldPhoto(context,uri,mode==='after'?'AFTER':mode==='measurement'?'MEASUREMENT':'BEFORE',mediaType,coords,camera,normalAfter&&postRepairCapture);
      if(!activeRef.current||currentFieldContext(task.projectId,task.id)?.scope!==context.scope)return;
      setDraft(value);setNotice('Đã lưu ảnh vào nháp riêng của nhiệm vụ; chưa upload hoặc gửi hồ sơ.');
    } catch(error) {if(activeRef.current&&currentFieldContext(task.projectId,task.id)?.scope===context.scope)setNotice(fieldErrorMessage(error));}
    finally {if(activeRef.current&&currentFieldContext(task.projectId,task.id)?.scope===context.scope)setBusy(false);}
  };
  const handleCapture = (photo: CameraCapturedPicture) => {void savePhoto(photo.uri,'image/jpeg',true);};
  if (block) return <SafeAreaView><Text>{block}</Text><Button variant="secondary" title="Quay lại" onPress={()=>router.back()} /></SafeAreaView>;

  const watermark = (
    <View style={styles.watermarkCard} pointerEvents="none">
      <View style={styles.watermarkRow}>
        <View style={styles.watermarkGps}>
          <MaterialIcons name="location-on" size={14} color={colors.warning} />
          <Text style={[typography.labelSm, styles.watermarkGpsText]}>{gpsText}</Text>
        </View>
        <Text style={styles.rtkBadge}>{coords ? 'GPS OK' : 'GPS…'}</Text>
      </View>
      <View style={styles.watermarkMeta}>
        <MaterialIcons name="description" size={13} color="#94A3B8" />
        <Text style={[typography.caption, styles.watermarkMetaText]}>
          {task.wo_code || 'Chưa có mã WO'}
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
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        await savePhoto(res.assets[0].uri,res.assets[0].mimeType ?? '',false);
      }
    } catch { setNotice('Không chọn được ảnh. Vui lòng thử lại.'); }
  };

  const galleryButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Chọn ảnh từ thiết bị"
      disabled={normalAfter}
      onPress={handlePickGallery}
      style={({ pressed }) => [styles.sideControl, pressed && styles.sideControlPressed]}
    >
      <MaterialIcons name="photo-library" size={20} color={colors.surface} />
    </Pressable>
  );

  const switchButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Đổi camera trước/sau"
      onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
      style={({ pressed }) => [styles.sideControl, pressed && styles.sideControlPressed]}
    >
      <MaterialIcons name="flip-camera-android" size={20} color={colors.surface} />
    </Pressable>
  );

  const handleConfirm = () => {
    router.push({pathname:'/(crew)/field-review',params:{id:task.id,projectId:task.projectId}});
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}>
          <MaterialIcons name="close" size={20} color={colors.surface} />
        </Pressable>

        <View style={styles.modePills}>
          {MODES.filter(item=>item.key!=='after'||task.detail?.purpose==='PostRepair').map((item) => {
            const active = item.key === mode;
            return (
              <Pressable
                key={item.key}
                onPress={() => {setMode(item.key);setPostRepairCapture(false);}}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.modePill, active && styles.modePillActive]}
              >
                {active && <View style={styles.modeDot} />}
                <Text style={[typography.labelLg, active ? styles.modeTextActive : styles.modeText]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.rightActions}>
          <Pressable
            onPress={() => setFlashOn((value) => !value)}
            accessibilityRole="button"
            accessibilityState={{ selected: flashOn }}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          >
            <MaterialIcons name={flashOn ? 'flash-on' : 'flash-off'} size={19} color={colors.surface} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Đổi camera trước/sau"
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
          >
            <MaterialIcons name="flip-camera-android" size={19} color={colors.surface} />
          </Pressable>
        </View>
      </View>

      {normalAfter?<View style={{padding:spacing.sm}}>
        <Text>{draft?.repairClaim?'Ảnh AFTER phải được chụp trực tiếp sau biên nhận kết thúc thi công.':'Cần kết thúc thi công và lập hồ sơ từ chi tiết nhiệm vụ trước khi chụp AFTER.'}</Text>
        <Button variant="secondary" title={postRepairCapture?'Đã xác nhận chụp hiện trạng sau sửa':'Tôi xác nhận đang chụp hiện trạng sau sửa'} disabled={!draft?.repairClaim||busy||!!draft.command} onPress={()=>setPostRepairCapture(v=>!v)}/>
      </View>:null}
      <View style={styles.viewport}>
        <ViewFinder
          disabled={busy||!ready||!!draft?.command||afterBlocked}
          onCapture={handleCapture}
          onCoordsChange={setCoords}
          defectType={task.defect_type_code ? defectTypeLabel(task.defect_type_code) : 'Chưa có phân loại từ máy chủ'}
          showGridGuide
          showReticle
          flashMode={flashOn ? 'on' : 'off'}
          facing={facing}
          watermarkContent={watermark}
          hudItems={thumbs}
          leftControl={galleryButton}
          rightControl={switchButton}
        />
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.sheetHeaderRow}>
          <View style={styles.sheetTitleRow}>
            <View style={[styles.sheetDot, mode === 'after' && styles.sheetDotGold]} />
            <Text style={[typography.labelLg, styles.sheetTitle]}>
              {task.wo_code || 'Chưa có mã WO'}
            </Text>
            <Text style={[typography.labelLg, styles.sheetDivider]}>|</Text>
            <Text style={[typography.labelLg, styles.sheetSub]}>
              {task.defect_type_code ? defectTypeLabel(task.defect_type_code) : 'Chưa có phân loại từ máy chủ'} {task.chainage}
            </Text>
          </View>
          <Text style={[typography.caption, styles.sheetFiles]}>
            {beforeReady ? 'Đã có ảnh nháp hiện trạng' : 'Chưa có ảnh hiện trạng'}
          </Text>
        </View>

        <Button variant="primary" title="Đo kiểm & Hồ sơ FIELD" disabled={busy || !ready} onPress={handleConfirm} />

        <Text style={[typography.caption, styles.sheetHint]}>
          {notice || 'Chỉ lưu tọa độ camera quan sát được. Ảnh thư viện không được gán GPS hoặc thời gian chụp mới.'}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F141C',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(15, 20, 28, 0.9)',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 6,
  },
  iconButton: {
    width: 36,
    height: 36,
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
    alignItems: 'center',
    backgroundColor: '#1E2638',
    borderWidth: 1,
    borderColor: 'rgba(51, 65, 85, 0.6)',
    borderRadius: radius.full,
    padding: 2,
  },
  modePill: {
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
    color: '#CBD5E1',
  },
  modeTextActive: {
    color: colors.onSurface,
    fontWeight: '700',
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  watermarkGps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  watermarkGpsText: {
    color: colors.warning,
    fontWeight: '700',
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
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    overflow: 'hidden',
    textTransform: 'uppercase',
  },
  watermarkMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watermarkMetaText: {
    color: '#CBD5E1',
  },
  thumbsRow: {
    flexDirection: 'row',
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
    alignItems: 'flex-end',
  },
  readyCount: {
    color: colors.surface,
  },
  readyOk: {
    color: colors.success,
  },
  readyWaiting: {
    color: colors.warning,
  },
  sideControl: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideControlPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    marginRight: 2,
  },
  sheetDotGold: {
    backgroundColor: colors.primary,
  },
  sheetTitle: {
    color: colors.neutral,
  },
  sheetDivider: {
    color: '#CBD5E1',
  },
  sheetSub: {
    color: '#555F71',
    fontWeight: '400',
  },
  sheetFiles: {
    color: '#555F71',
  },
  sheetHint: {
    color: '#555F71',
    textAlign: 'center',
  },
});
