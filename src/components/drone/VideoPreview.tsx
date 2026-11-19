import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { OperatorVideoLease } from '../../api/operatorVideoCache';
import { spacing, typography } from '../../design-tokens';

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** One immutable, authorized local file per mount. Native controls handle play/seek/fullscreen. */
export function VideoPreview({ lease, expanded = false, immersive = false }: { lease: OperatorVideoLease; expanded?: boolean; immersive?: boolean }) {
  const player = useVideoPlayer({ uri: lease.videoUri }, instance => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.5;
    instance.staysActiveInBackground = false;
  }, { seekBackwardIncrement: 5, seekForwardIncrement: 5 });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const loaded = useEvent(player, 'sourceLoad');
  const progress = useEvent(player, 'timeUpdate');
  const duration = loaded?.duration ?? player.duration;
  const currentTime = progress?.currentTime ?? player.currentTime;
  const [firstFrame, setFirstFrame] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const wasReady = useRef(false);

  useEffect(() => lease.attachPlayer(() => {
    player.pause();
    // Clearing a source does not load an iOS asset. Synchronous detach is required
    // here: replaceAsync could still hold the file when dispose starts deletion.
    player.replace(null, true);
  }), [lease, player]);

  useEffect(() => {
    if (status === 'readyToPlay') wasReady.current = true;
    // Seeking can temporarily re-enter loading, including at the end of a file.
    // That is not an initial decoder failure for an already playable source.
    if (wasReady.current || status === 'error') return;
    const timer = setTimeout(() => setTimedOut(true), 20000);
    return () => clearTimeout(timer);
  }, [status]);
  useEffect(() => {
    if (status === 'error' || timedOut) player.pause();
  }, [player, status, timedOut]);

  const failed = status === 'error' || Boolean(error) || timedOut;
  return <View style={{ gap: spacing.sm, ...(immersive ? { flex: 1 } : {}) }}>
    {failed ? <Text accessibilityRole="alert" style={[typography.bodyMd, expanded && { padding: spacing.md,  backgroundColor: '#FFFFFF', color: '#1A1D20' }]}>
      {timedOut ? 'Video đã tải nhưng thiết bị chưa đọc được dữ liệu để phát.' : 'Video đã tải nhưng trình phát của thiết bị không giải mã được tệp. Định dạng có thể không được hỗ trợ hoặc tệp không hợp lệ.'}
      {' Đóng video rồi mở lại để thử; nếu vẫn lỗi, cần bản xem H.264 tương thích với thiết bị.'}
    </Text> : <>
      <VideoView player={player} style={immersive ? { flex: 1, minHeight: 160, backgroundColor: '#000000' } : expanded ? { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000000' } : { height: 240 }} contentFit="contain" nativeControls
        fullscreenOptions={{ enable: !expanded }} allowsPictureInPicture={false}
        onFirstFrameRender={() => setFirstFrame(true)} />
      {!immersive ? <Text accessibilityLiveRegion="polite" style={[typography.caption, expanded && { paddingHorizontal: spacing.md, paddingBottom: spacing.md }]}>
        {status === 'readyToPlay'
          ? `${isPlaying ? 'Đang phát' : 'Đã sẵn sàng · Nhấn phát trên video'} · ${time(currentTime)} / ${time(duration)}${firstFrame ? ' · Đã hiển thị hình' : ''}`
          : 'Đã tải tệp · Đang kiểm tra khả năng phát trên thiết bị…'}
      </Text> : null}
    </>}
  </View>;
}
