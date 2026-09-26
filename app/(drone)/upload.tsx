import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

const UPLOAD_CONFIGS: Record<
  string,
  {
    code: string;
    road: string;
    videoName: string;
    videoSize: string;
    srtName: string;
    srtSize: string;
    sha256: string;
    gpsCoord: string;
    gpsAddress: string;
  }
> = {
  '#REQ-KS-089': {
    code: '#REQ-KS-089',
    road: 'Tuyến ĐH.05 - Tân Kiên (Km03+100)',
    videoName: 'DJI_0482_SURVEY_DH05.MP4',
    videoSize: '184.2 MB',
    srtName: 'DJI_0482_SURVEY_DH05.SRT',
    srtSize: '420 KB',
    sha256: '7f8a3c4b92d1...e4b1 (Khớp 100%, toàn vẹn)',
    gpsCoord: '10.7667° B, 106.7000° Đ (Sai số ±1.2m)',
    gpsAddress: 'Tuyến ĐH.05, Tân Kiên, Huyện Bình Chánh, TP. Hồ Chí Minh',
  },
  '#REQ-KS-090': {
    code: '#REQ-KS-090',
    road: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200 - Km02+500)',
    videoName: 'DJI_0490_SURVEY_DH05.MP4',
    videoSize: '195.4 MB',
    srtName: 'DJI_0490_SURVEY_DH05.SRT',
    srtSize: '380 KB',
    sha256: '9b2c3d4e5f6a...77c2 (Khớp 100%, toàn vẹn)',
    gpsCoord: '10.7333° B, 106.6833° Đ (Sai số ±1.1m)',
    gpsAddress: 'Vĩnh Lộc B, Huyện Bình Chánh, TP. Hồ Chí Minh',
  },
  '#REQ-KS-088': {
    code: '#REQ-KS-088',
    road: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    videoName: 'DJI_0488_SURVEY_DH05.MP4',
    videoSize: '210.0 MB',
    srtName: 'DJI_0488_SURVEY_DH05.SRT',
    srtSize: '512 KB',
    sha256: '4a5b6c7d8e9f...12a4 (Khớp 100%, toàn vẹn)',
    gpsCoord: '10.7833° B, 106.7333° Đ (Sai số ±0.9m)',
    gpsAddress: 'Cầu Bà Lát, Bình Chánh, TP. Hồ Chí Minh',
  },
  '#REQ-KS-087': {
    code: '#REQ-KS-087',
    road: 'Tuyến ĐH.05 - Ngã ba Tân Kiên (Km03+100)',
    videoName: 'DJI_0487_SURVEY_DH05.MP4',
    videoSize: '240.5 MB',
    srtName: 'DJI_0487_SURVEY_DH05.SRT',
    srtSize: '620 KB',
    sha256: '1e2f3a4b5c6d...99b0 (Khớp 100%, toàn vẹn)',
    gpsCoord: '10.7700° B, 106.7050° Đ (Sai số ±1.4m)',
    gpsAddress: 'Ngã ba Tân Kiên, Tuyến ĐH.05, Bình Chánh, TP. Hồ Chí Minh',
  },
  '#REQ-KS-085': {
    code: '#REQ-KS-085',
    road: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km02+180)',
    videoName: 'DJI_0485_SURVEY_DH05.MP4',
    videoSize: '165.8 MB',
    srtName: 'DJI_0485_SURVEY_DH05.SRT',
    srtSize: '310 KB',
    sha256: '3c4d5e6f7a8b...44d9 (Khớp 100%, toàn vẹn)',
    gpsCoord: '10.7400° B, 106.6900° Đ (Sai số ±1.0m)',
    gpsAddress: 'Vĩnh Lộc B Km02+180, Bình Chánh, TP. Hồ Chí Minh',
  },
};

export default function DroneUploadScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = params.code && UPLOAD_CONFIGS[params.code] ? params.code : '#REQ-KS-089';
  const [selectedCode, setSelectedCode] = useState<string>(initialCode);
  const [note, setNote] = useState('');
  const [onlineMode, setOnlineMode] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.code && UPLOAD_CONFIGS[params.code]) {
      setSelectedCode(params.code);
    }
  }, [params.code]);

  const config = UPLOAD_CONFIGS[selectedCode] ?? UPLOAD_CONFIGS['#REQ-KS-089'];

  const handleUpload = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push({
        pathname: '/(drone)/log',
        params: { code: config.code },
      });
    }, 600);
  };

  return (
    <SafeAreaScreen scroll>
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.circleIconButton}
          onPress={() =>
            router.push({
              pathname: '/(drone)/request-detail',
              params: { code: config.code },
            })
          }
          accessibilityRole="button"
        >
          <Ionicons name="arrow-back" size={20} color={colors.secondary} />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={[typography.titleMd, styles.topBarTitle]}>Tải video khảo sát</Text>
        </View>

        <View style={styles.codeRightWrap}>
          <Text style={[typography.caption, styles.displayCodeText]}>
            Mã: {config.code === '#REQ-KS-089' ? 'KS-741' : config.code === '#REQ-KS-090' ? 'KS-104' : config.code === '#REQ-KS-088' ? 'KS-VD3' : config.code.replace('#REQ-', '')}
          </Text>
        </View>
      </View>

      {/* Flight Request Switcher Chips */}
      <View style={styles.selectorBar}>
        <Text style={[typography.labelSm, styles.selectorTitle]}>CHỌN YÊU CẦU ĐỂ NẠP THẺ:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorScroll}
        >
          {Object.values(UPLOAD_CONFIGS).map((item) => {
            const isSelected = item.code === selectedCode;
            return (
              <Pressable
                key={item.code}
                style={[styles.selectorChip, isSelected && styles.selectorChipActive]}
                onPress={() => setSelectedCode(item.code)}
              >
                <Text
                  style={[
                    styles.selectorChipText,
                    isSelected && styles.selectorChipTextActive,
                  ]}
                >
                  {item.code}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Context Tag / Target Road */}
      <Card style={styles.contextCard}>
        <View style={styles.contextLeft}>
          <View style={styles.contextIcon}>
            <Ionicons name="airplane" size={20} color={colors.primary} />
          </View>
          <View>
            <Text style={[typography.caption, styles.contextLabel]}>MỤC TIÊU KHẢO SÁT</Text>
            <Text style={[typography.titleMd, styles.contextTitle]}>{config.road}</Text>
          </View>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>Đang thực hiện</Text>
        </View>
      </Card>

      {/* Section Header: File status */}
      <View style={styles.fileSectionHeader}>
        <Text style={[typography.labelSm, styles.videoSectionLabel]}>TỆP VIDEO KHẢO SÁT</Text>
        <View style={styles.statusSelectRow}>
          <Text style={styles.unselectedText}>Chưa chọn</Text>
          <Text style={styles.dividerText}> | </Text>
          <Text style={styles.selectedFileTag}>Đã chọn video</Text>
        </View>
      </View>

      {/* Video Preview Card (Figma Image 2) */}
      <Card style={styles.videoCard}>
        <View style={styles.videoFrame}>
          <View style={styles.resolutionTag}>
            <Text style={styles.resolutionText}>4K 60FPS • DRONE #02</Text>
          </View>

          {/* Delete / remove button on top right */}
          <Pressable
            style={styles.closeVideoBtn}
            onPress={() => router.push('/(drone)/requests')}
            accessibilityRole="button"
          >
            <Ionicons name="close" size={16} color={colors.neutral} />
          </Pressable>

          <View style={styles.playButtonOverlay}>
            <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.7)" />
          </View>

          <View style={styles.durationPill}>
            <Ionicons name="time-outline" size={13} color={colors.surface} />
            <Text style={styles.durationText}>02:45</Text>
          </View>
        </View>

        <View style={styles.fileDetails}>
          <View style={styles.fileRow}>
            <View style={styles.fileNameGroup}>
              <Ionicons name="film-outline" size={16} color={colors.primary} />
              <Text style={[typography.bodyMd, styles.fileName]}>{config.videoName}</Text>
            </View>
            <Text style={[typography.caption, styles.fileSize]}>{config.videoSize}</Text>
          </View>
        </View>
      </Card>

      {/* GPS Location Field */}
      <Card style={styles.gpsCard}>
        <View style={styles.gpsIconBox}>
          <Ionicons name="location" size={20} color={colors.success} />
        </View>
        <View style={styles.gpsInfo}>
          <View style={styles.gpsTopRow}>
            <Text style={[typography.caption, styles.gpsLabel]}>TỌA ĐỘ GPS TỰ ĐỘNG</Text>
            <View style={styles.matchedBadge}>
              <Text style={styles.matchedText}>Khớp vị trí</Text>
            </View>
          </View>
          <Text style={[typography.bodyMd, styles.gpsCoord]}>
            {config.gpsCoord}
          </Text>
          <Text style={[typography.caption, styles.gpsAddress]}>
            {config.gpsAddress}
          </Text>
        </View>
      </Card>

      {/* Optional Note Field */}
      <View style={styles.noteContainer}>
        <Text style={[typography.labelLg, styles.noteLabel]}>
          Ghi chú <Text style={styles.noteOptional}>(không bắt buộc)</Text>
        </Text>
        <TextInput
          style={styles.noteInput}
          multiline
          numberOfLines={3}
          value={note}
          onChangeText={setNote}
          placeholder="Ghi nhận điều kiện thời tiết, chướng ngại vật hoặc hiện trạng sạt lở bề mặt..."
          placeholderTextColor={colors.secondary}
        />
      </View>

      {/* Network Mode Card */}
      <Card style={styles.networkCard}>
        <View style={styles.networkTitleGroup}>
          <Ionicons name="wifi-outline" size={18} color={colors.primary} />
          <Text style={[typography.bodyMd, styles.networkTitle]}>
            Chế độ kết nối hiện trường:
          </Text>
        </View>

        <View style={styles.networkToggleRow}>
          <Pressable
            style={[styles.toggleBtn, onlineMode && styles.toggleBtnActive]}
            onPress={() => setOnlineMode(true)}
          >
            <View style={[styles.networkDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.toggleText, onlineMode && styles.toggleTextActive]}>
              Trực tuyến
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleBtn, !onlineMode && styles.toggleBtnActive]}
            onPress={() => setOnlineMode(false)}
          >
            <View style={[styles.networkDot, { backgroundColor: colors.warning }]} />
            <Text style={[typography.caption, !onlineMode && styles.toggleTextActive]}>
              Ngoại tuyến
            </Text>
          </Pressable>
        </View>
      </Card>

      {/* Action CTA Button: Gửi video */}
      <View style={styles.actionSection}>
        <Button
          variant="primary"
          title="☁ Gửi video"
          loading={loading}
          onPress={handleUpload}
        />
      </View>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  circleIconButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: {
    alignItems: 'center',
  },
  topBarTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  topBarCode: {
    color: colors.brandGold,
    fontWeight: '700',
  },
  topBarSub: {
    color: colors.secondary,
  },
  codeRightWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  displayCodeText: {
    color: colors.secondary,
    fontWeight: '600',
  },
  fileSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
    marginTop: spacing.xs,
  },
  statusSelectRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unselectedText: {
    fontSize: 11,
    color: colors.secondary,
  },
  dividerText: {
    fontSize: 11,
    color: colors.border,
  },
  closeVideoBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  contextLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  contextIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: '#FEF3E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextLabel: {
    color: colors.secondary,
  },
  contextTitle: {
    color: colors.neutral,
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#FEF3E2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusBadgeText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: 'bold',
  },
  videoCard: {
    marginBottom: spacing.sm,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  videoSectionLabel: {
    color: colors.secondary,
  },
  selectedFileTag: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  videoFrame: {
    height: 180,
    backgroundColor: '#18181B',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: spacing.xs,
  },
  resolutionTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  resolutionText: {
    color: '#FCD34D',
    fontSize: 10,
    fontWeight: 'bold',
  },
  playButtonOverlay: {
    width: 50,
    height: 50,
    borderRadius: radius.full,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '600',
  },
  fileDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    gap: 6,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fileNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  fileName: {
    color: colors.neutral,
    fontFamily: 'Roboto',
    fontSize: 13,
  },
  fileSize: {
    color: colors.secondary,
  },
  checksumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E9F7EC',
    padding: 6,
    borderRadius: radius.sm,
    marginTop: 2,
  },
  checksumText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '500',
  },
  gpsCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  gpsIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: '#E9F7EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  gpsInfo: {
    flex: 1,
  },
  gpsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsLabel: {
    color: colors.secondary,
  },
  matchedBadge: {
    backgroundColor: '#E9F7EC',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  matchedText: {
    color: colors.success,
    fontSize: 10,
    fontWeight: 'bold',
  },
  gpsCoord: {
    color: colors.neutral,
    fontWeight: 'bold',
    fontFamily: 'Roboto',
    marginTop: 2,
  },
  gpsAddress: {
    color: colors.secondary,
    marginTop: 2,
  },
  noteContainer: {
    marginBottom: spacing.sm,
  },
  noteLabel: {
    color: colors.secondary,
    marginBottom: 4,
  },
  noteOptional: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: 'normal',
  },
  noteInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    minHeight: 64,
    color: colors.neutral,
    textAlignVertical: 'top',
  },
  networkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  networkTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  networkTitle: {
    color: colors.neutral,
  },
  networkToggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  toggleBtnActive: {
    backgroundColor: colors.surface,
  },
  networkDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  toggleText: {
    fontSize: 11,
    color: colors.secondary,
  },
  toggleTextActive: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  actionSection: {
    marginBottom: spacing.xl,
  },
  selectorBar: {
    marginBottom: spacing.sm,
  },
  selectorTitle: {
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  selectorScroll: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingBottom: 2,
  },
  selectorChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectorChipActive: {
    backgroundColor: '#FEF9E7',
    borderColor: colors.primary,
  },
  selectorChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  selectorChipTextActive: {
    color: colors.primaryDark,
  },
});
