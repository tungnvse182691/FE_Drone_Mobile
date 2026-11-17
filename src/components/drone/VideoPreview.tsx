import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { OperatorVideoLease } from '../../api/operatorVideoCache';
import { spacing, typography } from '../../design-tokens';

const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** One immutable, authorized local file per mount. Native controls handle play/seek/fullscreen. */
export function VideoPreview({ lease }: { lease: OperatorVideoLease }) {
  const player = useVideoPlayer({ uri: lease.videoUri }, instance => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.5;
    instance.staysActiveInBackground = false;
  });
  const { status, error } = useEvent(player, 'statusChange', { status: player.status });
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const loaded = useEvent(player, 'sourceLoad');
  const progress = useEvent(player, 'timeUpdate');
  const duration = loaded?.duration ?? player.duration;
  const currentTime = progress?.currentTime ?? player.currentTime;
  const [firstFrame, setFirstFrame] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => lease.attachPlayer(() => {
    player.pause();
    // Clearing a source does not load an iOS asset. Synchronous detach is required
    // here: replaceAsync could still hold the file when dispose starts deletion.
    player.replace(null, true);
  }), [lease, player]);

  useEffect(() => {
    if (status === 'readyToPlay' || status === 'error') return;
    const timer = setTimeout(() => setTimedOut(true), 20000);
    return () => clearTimeout(timer);
  }, [status]);
  useEffect(() => {
    if (status === 'error' || timedOut) player.pause();
  }, [player, status, timedOut]);

  const failed = status === 'error' || Boolean(error) || timedOut;
  return <View style={{ gap: spacing.sm }}>
    {failed ? <Text accessibilityRole="alert" style={typography.bodyMd}>
      {timedOut ? 'Video đã tải nhưng thiết bị chưa đọc được dữ liệu để phát.' : 'Video đã tải nhưng trình phát của thiết bị không giải mã được tệp. Định dạng có thể không được hỗ trợ hoặc tệp không hợp lệ.'}
      {' Đóng video rồi mở lại để thử; nếu vẫn lỗi, cần bản xem H.264 tương thích với thiết bị.'}
    </Text> : <>
      <VideoView player={player} style={{ height: 240 }} contentFit="contain" nativeControls
        fullscreenOptions={{ enable: true }} allowsPictureInPicture={false}
        onFirstFrameRender={() => setFirstFrame(true)} />
      <Text accessibilityLiveRegion="polite" style={typography.caption}>
        {status === 'readyToPlay'
          ? `${isPlaying ? 'Đang phát' : 'Đã sẵn sàng · Nhấn phát trên video'} · ${time(currentTime)} / ${time(duration)}${firstFrame ? ' · Đã hiển thị hình' : ''}`
          : 'Đã tải tệp · Đang kiểm tra khả năng phát trên thiết bị…'}
      </Text>
    </>}
  </View>;
}
