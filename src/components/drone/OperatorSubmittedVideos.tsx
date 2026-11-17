import React, { useCallback, useRef, useState } from 'react';
import { AppState, Platform, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { VideoPreview } from './VideoPreview';
import { useAuthStore } from '../../store/auth';
import { operatorDatasetScope } from '../../api/droneDatasetWorkflow';
import { listOperatorVideos, operatorVideoError, readOperatorVideos, type OperatorDatasetPage, type OperatorVideoSource } from '../../api/operatorVideoReadback';
import { downloadOperatorVideo, type OperatorVideoLease } from '../../api/operatorVideoCache';
import { Button } from '../Button';
import { Card } from '../Card';
import { spacing, typography } from '../../design-tokens';

export function OperatorSubmittedVideos({ taskId, projectId }: { taskId: string; projectId: string }) {
  useAuthStore(s => s.token); useAuthStore(s => s.user); useAuthStore(s => s.status);
  const scope = operatorDatasetScope();
  return scope ? <SubmittedVideos key={JSON.stringify([scope, taskId, projectId])} scope={scope} taskId={taskId} projectId={projectId} /> : null;
}
function SubmittedVideos({ scope, taskId, projectId }: { scope: string; taskId: string; projectId: string }) {
  const [page, setPage] = useState<OperatorDatasetPage | null>(null), [error, setError] = useState('');
  const [selected, setSelected] = useState<{ id: string; videos: OperatorVideoSource[]; telemetryStatus: string } | null>(null);
  const [preview, setPreview] = useState<OperatorVideoLease | null>(null), [progress, setProgress] = useState(0), [busy, setBusy] = useState(false);
  const alive = useRef(false), serial = useRef(0), lock = useRef(false), lease = useRef<OperatorVideoLease | null>(null);
  const abort = useRef<AbortController | null>(null);
  const cleanup = useRef<Promise<void>>(Promise.resolve());
  const sessionInvalid = useRef(false);
  const active = () => alive.current && operatorDatasetScope() === scope;
  const stopPreview = () => {
    abort.current?.abort(); abort.current = null;
    const prior = lease.current; lease.current = null;
    setPreview(null);
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
  return <Card style={{ gap: spacing.sm, marginBottom: spacing.md }}>
    <Text style={typography.titleMd}>Video đã gửi</Text>
    <Button variant="secondary" title={page ? 'Làm mới video đã gửi' : 'Xem video đã gửi'} onPress={() => void load()} disabled={busy} loading={busy} />
    {error ? <Text accessibilityRole="alert" style={typography.bodyMd}>{error}</Text> : null}
    {page?.items.length === 0 ? <Text style={typography.bodyMd}>Nhiệm vụ chưa có bộ dữ liệu đã nộp.</Text> : null}
    {page?.items.map((row, index) => <Button key={row.id} variant="secondary" title={`Lần nộp ${row.versionNo ?? index + 1}${row.submittedAt ? ` · ${new Date(row.submittedAt).toLocaleDateString('vi-VN')}` : ''}`} onPress={() => void select(row.id)} disabled={busy} />)}
    {page?.nextCursor ? <Button variant="secondary" title="Xem thêm lần nộp" disabled={busy} onPress={() => void load(true)} /> : null}
    {selected ? <View style={{ gap: spacing.sm }}>
      <Text style={typography.caption}>{selected.telemetryStatus === 'MISSING' ? 'Không kèm SRT/GPS. Video vẫn đã được nộp.' : 'Dữ liệu GPS được máy chủ kiểm tra riêng.'}</Text>
      {selected.videos.length === 0 ? <Text>Chưa có tệp video trong bộ dữ liệu.</Text> : selected.videos.map((file, index) => <Button key={file.fileId} variant="secondary" title={`Mở video ${index + 1} · ${(file.sizeBytes / 1024 ** 2).toFixed(1)} MB`} onPress={() => void play(file.fileId)} disabled={busy} />)}
    </View> : null}
    {busy && abort.current ? <View style={{ gap: spacing.sm }}><Text>Đang tải bản xem tạm: {progress}%</Text><Button title="Hủy tải bản xem" variant="secondary" onPress={() => abort.current?.abort()} /></View> : null}
    {preview ? <>
      <VideoPreview key={preview.videoUri} lease={preview} />
      <Button title="Đóng video" variant="secondary" onPress={stopPreview} />
    </> : null}
  </Card>;
}
