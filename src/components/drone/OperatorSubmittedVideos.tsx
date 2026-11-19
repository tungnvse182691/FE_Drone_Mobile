import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { VideoPreview } from './VideoPreview';
import { requestVideoOrientation } from './videoOrientation';
import { useAuthStore } from '../../store/auth';
import { operatorDatasetScope } from '../../api/droneDatasetWorkflow';
import { listOperatorVideos, operatorVideoError, readOperatorVideos, type OperatorDatasetPage, type OperatorVideoSource } from '../../api/operatorVideoReadback';
import { downloadOperatorVideo, type OperatorVideoLease } from '../../api/operatorVideoCache';
import { Button } from '../Button';
import { Card } from '../Card';
import { colors, radius, spacing, typography } from '../../design-tokens';
import { operatorAppearance } from './appearance';

export function OperatorSubmittedVideos({ taskId, projectId }: { taskId: string; projectId: string }) {
  useAuthStore(s => s.token); useAuthStore(s => s.user); useAuthStore(s => s.status);
  const scope = operatorDatasetScope();
  return scope ? <SubmittedVideos key={JSON.stringify([scope, taskId, projectId])} scope={scope} taskId={taskId} projectId={projectId} /> : null;
}
function SubmittedVideos({ scope, taskId, projectId }: { scope: string; taskId: string; projectId: string }) {
  const [page, setPage] = useState<OperatorDatasetPage | null>(null), [error, setError] = useState('');
  const [selected, setSelected] = useState<{ id: string; videos: OperatorVideoSource[]; telemetryStatus: string } | null>(null);
  const [preview, setPreview] = useState<OperatorVideoLease | null>(null), [progress, setProgress] = useState(0), [busy, setBusy] = useState(false);
  const [previewLabel, setPreviewLabel] = useState('');
  const [immersive, setImmersive] = useState(false);
  const [orientationError, setOrientationError] = useState('');
  useEffect(() => {
    if (!preview) return;
    let current = true;
    void requestVideoOrientation(immersive).catch(() => {
      if (current) {
        setOrientationError('Thiết bị chưa chuyển được hướng màn hình. Bạn vẫn có thể xem video và thử phóng to lại.');
        setImmersive(false);
      }
    });
    return () => {
      current = false;
      void requestVideoOrientation(false).catch(() => undefined);
    };
  }, [preview, immersive]);
  const alive = useRef(false), serial = useRef(0), lock = useRef(false), lease = useRef<OperatorVideoLease | null>(null);
  const abort = useRef<AbortController | null>(null);
  const cleanup = useRef<Promise<void>>(Promise.resolve());
  const sessionInvalid = useRef(false);
  const active = () => alive.current && operatorDatasetScope() === scope;
  const stopPreview = () => {
    abort.current?.abort(); abort.current = null;
    const prior = lease.current; lease.current = null;
    setPreview(null);
    setImmersive(false);
    cleanup.current = cleanup.current.then(() => prior?.dispose()).then(() => undefined).catch(() => undefined);
    return cleanup.current;
  };
  useFocusEffect(useCallback(() => {
    alive.current = !sessionInvalid.current;
    const invalidate = () => { serial.current++; stopPreview(); setPage(null); setSelected(null); setBusy(false); };
    const unsubscribe = useAuthStore.subscribe(() => { if (operatorDatasetScope() !== scope) { sessionInvalid.current = true; alive.current = false; invalidate(); } });
    const app = AppState.addEventListener('change', state => { if (state !== 'active') { alive.current = false; invalidate(); } else { alive.current = !sessionInvalid.current; } });
    return () => { alive.current = false; invalidate(); unsubscribe(); app.remove(); };
  }, [scope, taskId, projectId]));
  const run = async (operation: (isCurrent: () => boolean) => Promise<void>) => {
    if (lock.current || !active()) return;
    lock.current = true; setBusy(true); setError('');
    const generation = ++serial.current;
    const current = () => active() && serial.current === generation;
    try { await operation(current); }
    catch (e) { if (current()) { stopPreview(); setPage(null); setSelected(null); setError(operatorVideoError(e)); } }
    finally { lock.current = false; if (current()) setBusy(false); }
  };
  const load = (more = false) => run(async current => {
    stopPreview(); setSelected(null);
    const next = await listOperatorVideos(scope, taskId, projectId, more ? page?.nextCursor : undefined);
    if (current()) setPage(old => ({ items: more && old ? [...old.items, ...next.items.filter(row => !old.items.some(prior => prior.id === row.id))] : next.items, nextCursor: next.nextCursor }));
  });
  const select = (id: string) => run(async current => {
    stopPreview(); setSelected(null);
    const detail = await readOperatorVideos(scope, taskId, projectId, id);
    if (current()) setSelected({ id, videos: detail.videos, telemetryStatus: detail.dataset.telemetryStatus });
  });
  const play = (fileId: string) => run(async current => {
    if (!selected || Platform.OS === 'web') { setError('Chức năng phát video hiện dành cho ứng dụng Android/iPhone.'); return; }
    await stopPreview();
    if (!current()) return;
    setProgress(0);
    const controller = new AbortController(); abort.current = controller;
    const next = await downloadOperatorVideo(scope, taskId, projectId, selected.id, fileId, controller.signal, percent => { if (current()) setProgress(percent); });
    if (!current()) { await next.dispose(); return; }
    const index = selected.videos.findIndex(file => file.fileId === fileId);
    const file = selected.videos[index];
    setPreviewLabel(file ? `Video ${index + 1} · ${(file.sizeBytes / 1024 ** 2).toFixed(1)} MB` : 'Video đã gửi');
    setOrientationError('');
    lease.current = next; setPreview(next);
  });
  // A local preview is not an offline authorization grant. Periodically recheck the server;
  // network loss/denial closes it. Fresh open always downloads through Bearer authorization.
  useFocusEffect(useCallback(() => {
    if (!preview || !selected) return;
    let stopped = false, reading = false;
    const timer = setInterval(() => {
      if (reading) return; reading = true;
      void readOperatorVideos(scope, taskId, projectId, selected.id).catch(e => {
        if (!stopped && active()) { stopPreview(); setSelected(null); setPage(null); setError(operatorVideoError(e)); }
      }).finally(() => { reading = false; });
    }, 30000);
    return () => { stopped = true; clearInterval(timer); };
  }, [scope, taskId, projectId, preview, selected]));
  return <Card style={styles.section}>
    <View style={styles.sectionHeading}><MaterialIcons name="video-library" size={22} color={colors.secondary}/><Text style={[typography.titleMd, styles.sectionTitle]}>Video đã gửi</Text>
    <Button style={styles.readAction} icon={<MaterialIcons name="refresh" size={20} color={colors.secondary}/>} variant="secondary" title={page ? 'Làm mới video đã gửi' : 'Xem video đã gửi'} onPress={() => void load()} disabled={busy} loading={busy} />
    </View>
    {error ? <Text accessibilityRole="alert" style={typography.bodyMd}>{error}</Text> : null}
    {page?.items.length === 0 ? <Text style={typography.bodyMd}>Nhiệm vụ chưa có bộ dữ liệu đã nộp.</Text> : null}
    {page?.items.map((row, index) => <Button key={row.id} style={[styles.submission, selected?.id === row.id && styles.selectedSubmission]} icon={<MaterialIcons name={selected?.id === row.id ? "check-circle-outline" : "chevron-right"} size={22} color={colors.secondary}/>} variant="secondary" title={`Lần nộp ${row.versionNo ?? index + 1}${row.submittedAt ? ` · ${new Date(row.submittedAt).toLocaleDateString('vi-VN')}` : ''}`} onPress={() => void select(row.id)} disabled={busy} />)}
    {page?.nextCursor ? <Button variant="secondary" title="Xem thêm lần nộp" disabled={busy} onPress={() => void load(true)} /> : null}
    {selected ? <View style={styles.fileList}>
      {selected.videos.length === 0 ? <Text>Chưa có tệp video trong bộ dữ liệu.</Text> : selected.videos.map((file, index) => <Button key={file.fileId} style={styles.videoAction} icon={<MaterialIcons name="play-circle-outline" size={24} color={colors.neutral}/>} variant="secondary" title={`Mở video ${index + 1} · ${(file.sizeBytes / 1024 ** 2).toFixed(1)} MB`} onPress={() => void play(file.fileId)} disabled={busy} />)}
    </View> : null}
    {busy && abort.current ? <View style={{ gap: spacing.sm }}><Text>Đang tải bản xem tạm: {progress}%</Text><Button title="Hủy tải bản xem" variant="secondary" onPress={() => abort.current?.abort()} /></View> : null}
    {preview ? <Modal visible presentationStyle="fullScreen" supportedOrientations={['portrait', 'landscape-left', 'landscape-right']} animationType="none" onRequestClose={() => void stopPreview()}>
      <SafeAreaProvider>
      <SafeAreaView style={[styles.viewer, immersive && { backgroundColor: '#000000' }]}>
        <View style={[styles.viewerHeader, immersive && styles.viewerDarkHeader]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Đóng video, quay lại chi tiết nhiệm vụ"
            onPress={() => void stopPreview()} android_ripple={{ color: operatorAppearance.border }}
            style={({ pressed }) => [styles.viewerBack, immersive && styles.viewerDarkButton, pressed && { opacity: 0.7 }]}>
            <MaterialIcons name="arrow-back" size={24} color={immersive ? '#FFFFFF' : '#192D40'} />
          </Pressable>
          <View style={styles.viewerHeading}>
            {!immersive ? <>
            <Text accessibilityRole="header" style={[typography.titleMd, styles.viewerTitle]}>Xem video</Text>
            </> : null}
          </View>
        </View>
        {orientationError ? <Text accessibilityRole="alert" style={[typography.bodyMd, { padding: spacing.md }]}>{orientationError}</Text> : null}
        <View testID="operator-video-frame" style={[styles.videoFrame, immersive && { flex: 1 }]}>
          <VideoPreview key={preview.videoUri} lease={preview} expanded immersive={immersive} />
          <Pressable accessibilityRole="button" accessibilityLabel={immersive ? 'Thoát toàn màn hình' : 'Xem toàn màn hình'}
            onPress={() => { setOrientationError(''); setImmersive(value => !value); }} android_ripple={{ color: operatorAppearance.border }}
            style={({ pressed }) => [styles.viewerExpand, pressed && { opacity: 0.7 }]}>
            <View pointerEvents="none" style={styles.viewerExpandSurface}>
              <MaterialIcons name={immersive ? 'fullscreen-exit' : 'fullscreen'} size={24} color="#FFFFFF" />
            </View>
          </Pressable>
        </View>
        {!immersive ? <Text style={[typography.bodyMd, styles.viewerMetadata]}>{previewLabel}</Text> : null}
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal> : null}
  </Card>;
}

const styles = StyleSheet.create({
  viewer: { flex: 1, backgroundColor: colors.surfaceAlt },
  viewerHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  viewerDarkHeader: { backgroundColor: '#000000', borderBottomWidth: 0, paddingVertical: spacing.xs },
  viewerDarkButton: { backgroundColor: 'transparent', borderWidth: 0 },
  viewerBack: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  viewerHeading: { flex: 1, minWidth: 0, gap: spacing.xs },
  viewerTitle: { color: '#192D40', lineHeight: 24 },
  viewerMetadata: { color: '#526170', paddingHorizontal: 16, paddingVertical: 12, fontVariant: ['tabular-nums'] },
  videoFrame: { position: 'relative', minHeight: 0 },
  viewerExpand: { position: 'absolute', top: 4, right: 4, width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full, overflow: 'hidden' },
  viewerExpandSurface: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.48)' },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  sectionTitle: { color: '#192D40', flexGrow: 1, lineHeight: 24 },
  submission: { alignItems: 'flex-start', borderColor: colors.border, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg },
  selectedSubmission: { borderColor: operatorAppearance.border, backgroundColor: operatorAppearance.pressed },
  fileList: { gap: spacing.sm, paddingHorizontal: spacing.sm, paddingBottom: spacing.sm },
  videoAction: { alignItems: 'flex-start', borderColor: '#DCE2E7', backgroundColor: '#F3F5F6', borderRadius: 12 },
  section: { gap: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#DCE2E7', borderRadius: 16 },
  title: { color: colors.neutral },
  readAction: { alignSelf: 'flex-start', minHeight: 48, maxWidth: '100%', borderColor: '#DCE2E7', backgroundColor: '#F3F5F6', borderRadius: 12 },
});
