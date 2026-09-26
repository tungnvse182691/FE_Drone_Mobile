import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';

interface RequestDetailData {
  code: string;
  roadTitle: string;
  location: string;
  statusText: string;
  length: string;
  altitude: string;
  overlap: string;
  format: string;
  coordinates: string;
  corridorTitle: string;
  roadName: string;
  targetPoint: string;
  pmName: string;
  instructionTime: string;
  instructionQuote: string;
  priority: string;
}

const REQUEST_DETAILS: Record<string, RequestDetailData> = {
  '#REQ-KS-089': {
    code: '#REQ-KS-089',
    roadTitle: 'Tuyến ĐH.05 - Tân Kiên (Km03+100)',
    location: 'Km03+000 - Km03+300, Tân Kiên, Bình Chánh, TP.HCM',
    statusText: 'MỚI TIẾP NHẬN',
    length: '3.5 km',
    altitude: '45 m (AGL)',
    overlap: '80% / 70%',
    format: '4K 60fps + RTK',
    coordinates: '10.7667° N, 106.7000° E',
    corridorTitle: 'ĐOẠN TÂN KIÊN - TUYẾN ĐH.05',
    roadName: 'Tân Kiên (Km03+000 - Km03+300)',
    targetPoint: 'Xói lở vai đường mép taluy âm',
    pmName: 'Trần Hoàng Quân (PM)',
    instructionTime: 'Hôm nay, 08:30',
    instructionQuote:
      '“Khảo sát đoạn từ Km03+000 đến Km03+300. Chú ý quét kỹ khu vực mép taluy âm đang có dấu hiệu xói lở vai đường sau mưa lớn. Cần bay ở độ cao 45m và quét ảnh 4K RGB kết hợp mô hình độ cao số DSM (ODM) 2 lượt.”',
    priority: 'Khẩn cấp',
  },
  '#REQ-KS-090': {
    code: '#REQ-KS-090',
    roadTitle: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200 - Km02+500)',
    location: 'Km01+200 - Km02+500, Vĩnh Lộc B, Bình Chánh, TP.HCM',
    statusText: 'MỚI TIẾP NHẬN',
    length: '2.4 km',
    altitude: '35 m (AGL)',
    overlap: '85% / 75%',
    format: '4K 60fps + RTK',
    coordinates: '10.7333° N, 106.6833° E',
    corridorTitle: 'ĐOẠN VĨNH LỘC B - TUYẾN ĐH.05',
    roadName: 'Vĩnh Lộc B (Km01+200 - Km02+500)',
    targetPoint: 'Ổ gà sâu & nứt tấm bê tông nông thôn',
    pmName: 'Nguyễn Thùy Lan (PM)',
    instructionTime: 'Hôm nay, 07:45',
    instructionQuote:
      '“Lưu lượng xe tải trọng nặng di chuyển đông, bay dọc theo tim dải phân cách giữa, đảm bảo độ cao an toàn tối thiểu 35m tránh đường dây điện trung thế.”',
    priority: 'Ưu tiên cao',
  },
  '#REQ-KS-088': {
    code: '#REQ-KS-088',
    roadTitle: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    location: 'Km01+600 - Km02+100, Cầu Bà Lát, Bình Chánh, TP.HCM',
    statusText: 'MỚI TIẾP NHẬN',
    length: '4.0 km',
    altitude: '50 m (AGL)',
    overlap: '80% / 70%',
    format: '4K 60fps + RTK',
    coordinates: '10.7833° N, 106.7333° E',
    corridorTitle: 'ĐOẠN CẦU BÀ LÁT - TUYẾN ĐH.05',
    roadName: 'Cầu Bà Lát (Km01+600 - Km02+100)',
    targetPoint: 'Vỡ mép tấm & khe co giãn cầu cạn',
    pmName: 'Nguyễn Thùy Lan (PM)',
    instructionTime: 'Hôm qua, 16:15',
    instructionQuote:
      '“Quét ảnh trực giao 3D độ phân giải cao phục vụ đo lường tiến độ và xuất mô hình bề mặt DSM (OpenDroneMap/ODM). Kiểm tra kỹ 2 mố dầm tiếp giáp bờ kênh.”',
    priority: 'Tiêu chuẩn',
  },
  '#REQ-KS-087': {
    code: '#REQ-KS-087',
    roadTitle: 'Tuyến ĐH.05 - Ngã ba Tân Kiên (Km03+100)',
    location: 'Km02+900 - Km03+200, Tân Kiên, Bình Chánh, TP.HCM',
    statusText: 'ĐANG THỰC HIỆN',
    length: '5.2 km',
    altitude: '45 m (AGL)',
    overlap: '80% / 70%',
    format: '4K 60fps + RTK',
    coordinates: '10.7700° N, 106.7050° E',
    corridorTitle: 'NÚT GIAO NGÃ BA TÂN KIÊN',
    roadName: 'Ngã ba Tân Kiên (Km03+100)',
    targetPoint: 'Đoạn lề taluy dương',
    pmName: 'Trần Văn Nam (PM)',
    instructionTime: 'Hôm nay, 06:30',
    instructionQuote:
      '“Bay quét toàn bộ nút giao hình hoa thị, chú ý điểm tiếp giáp tuyến ĐH.05 và trạm thu phát.”',
    priority: 'Đang bay',
  },
  '#REQ-KS-085': {
    code: '#REQ-KS-085',
    roadTitle: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km02+180)',
    location: 'Km02+000 - Km02+400, Vĩnh Lộc B, Bình Chánh, TP.HCM',
    statusText: 'ĐÃ HOÀN THÀNH BAY',
    length: '3.1 km',
    altitude: '40 m (AGL)',
    overlap: '80% / 70%',
    format: '4K 60fps + RTK',
    coordinates: '10.7400° N, 106.6900° E',
    corridorTitle: 'ĐOẠN VĨNH LỘC B Km02+180',
    roadName: 'Vĩnh Lộc B (Km02+000 - Km02+400)',
    targetPoint: 'Bản mặt cầu & khe lún đầu cầu',
    pmName: 'Lê Minh Tuấn (PM)',
    instructionTime: '20/10/2023, 14:00',
    instructionQuote:
      '“Khảo sát định kỳ hiện trạng lún sụt đầu cầu Suối Cả trước mùa mưa bão. Tệp video và ảnh trực giao đã được nạp an toàn.”',
    priority: 'Hoàn thành',
  },
};

export default function DroneRequestDetailScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = params.code && REQUEST_DETAILS[params.code] ? params.code : '#REQ-KS-089';
  const [selectedCode, setSelectedCode] = useState<string>(initialCode);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState(
    'Thời tiết mưa giông giật cấp 6, không đảm bảo an toàn bay theo quy chuẩn.'
  );
  const [rejectionSent, setRejectionSent] = useState(false);

  useEffect(() => {
    if (params.code && REQUEST_DETAILS[params.code]) {
      setSelectedCode(params.code);
    }
  }, [params.code]);

  const current = REQUEST_DETAILS[selectedCode] ?? REQUEST_DETAILS['#REQ-KS-089'];

  const handleConfirmStart = () => {
    router.push({
      pathname: '/(drone)/upload',
      params: { code: current.code },
    });
  };

  const handleSendRejection = () => {
    setRejectionSent(true);
    setTimeout(() => {
      setRejectModalVisible(false);
      router.push('/(drone)/requests');
    }, 800);
  };

  return (
    <SafeAreaScreen scroll>
      {/* Top Bar with Back Button */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.circleIconButton}
          onPress={() => router.push('/(drone)/requests')}
          accessibilityRole="button"
        >
          <MaterialIcons name="arrow-back" size={20} color={colors.secondary} />
        </Pressable>

        <View style={styles.topBarCenter}>
          <Text style={[typography.titleMd, styles.topBarCode]}>{current.code}</Text>
          <Text style={[typography.caption, styles.topBarSub]}>Chi tiết yêu cầu bay</Text>
        </View>

        <View style={styles.circleIconButton}>
          <MaterialIcons name="share" size={18} color={colors.secondary} />
        </View>
      </View>

      {/* Task Switcher Chips */}
      <View style={styles.selectorBar}>
        <Text style={[typography.labelSm, styles.selectorTitle]}>CHỌN YÊU CẦU BAY KHÁC:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectorScroll}>
          {Object.values(REQUEST_DETAILS).map((item) => {
            const isSelected = item.code === selectedCode;
            return (
              <Pressable
                key={item.code}
                style={[styles.taskChip, isSelected && styles.taskChipActive]}
                onPress={() => setSelectedCode(item.code)}
              >
                <Text style={[styles.taskChipCode, isSelected && styles.taskChipCodeActive]}>
                  {item.code}
                </Text>
                <Text style={[styles.taskChipRoad, isSelected && styles.taskChipRoadActive]} numberOfLines={1}>
                  {item.roadTitle.split('-')[0].trim()}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Target Road Overview Card */}
      <Card style={styles.headerCard}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerTextGroup}>
            <Text style={[typography.caption, styles.codeLabel]}>MÃ YÊU CẦU: {current.code}</Text>
            <Text style={[typography.titleLg, styles.roadTitle]}>{current.roadTitle}</Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={[typography.labelSm, styles.statusPillText]}>{current.statusText}</Text>
          </View>
        </View>

        <View style={styles.locationDivider}>
          <MaterialIcons name="location-on" size={18} color={colors.primary} />
          <Text style={[typography.bodyMd, styles.locationFull]}>{current.location}</Text>
        </View>
      </Card>

      {/* Flight Parameters Card */}
      <Card style={styles.paramCard}>
        <View style={styles.paramCardHeader}>
          <MaterialIcons name="settings" size={18} color={colors.primary} />
          <Text style={[typography.labelSm, styles.paramHeaderTitle]}>THÔNG SỐ KỸ THUẬT BAY (PM CẤU HÌNH)</Text>
        </View>

        <View style={styles.paramGrid}>
          <View style={styles.paramItem}>
            <Text style={[typography.caption, styles.paramLabel]}>Chiều dài tuyến</Text>
            <Text style={[typography.bodyMd, styles.paramValue]}>{current.length}</Text>
          </View>

          <View style={styles.paramItem}>
            <Text style={[typography.caption, styles.paramLabel]}>Độ cao bay cố định</Text>
            <Text style={[typography.bodyMd, styles.paramValue]}>{current.altitude}</Text>
          </View>

          <View style={styles.paramItem}>
            <Text style={[typography.caption, styles.paramLabel]}>Độ phủ ảnh (dọc/ngang)</Text>
            <Text style={[typography.bodyMd, styles.paramValue]}>{current.overlap}</Text>
          </View>

          <View style={styles.paramItem}>
            <Text style={[typography.caption, styles.paramLabel]}>Định dạng dữ liệu</Text>
            <Text style={[typography.bodyMd, styles.paramValue]}>{current.format}</Text>
          </View>
        </View>
      </Card>

      {/* Map Corridor Visualization Simulation */}
      <Card style={styles.mapCard}>
        <View style={styles.mapHeader}>
          <View style={styles.mapHeaderLeft}>
            <MaterialIcons name="map" size={16} color={colors.primary} />
            <Text style={[typography.labelSm, styles.mapHeaderTitle]}>RANH GIỚI HÀNH LANG BAY GIS</Text>
          </View>
          <Text style={[typography.caption, styles.gpsCoord]}>{current.coordinates}</Text>
        </View>

        <View style={styles.mapVisualContainer}>
          {/* Simulated Map Background */}
          <View style={styles.simulatedRiver}>
            <Text style={styles.riverLabel}>{current.corridorTitle}</Text>
          </View>

          <View style={styles.simulatedRoad}>
            <View style={styles.roadStripe} />
            <Text style={styles.roadNameLabel}>{current.roadName}</Text>
          </View>

          {/* Survey Target Point Pin */}
          <View style={styles.pinTarget}>
            <View style={styles.pinCallout}>
              <View style={styles.pinDot} />
              <Text style={styles.pinText}>{current.targetPoint}</Text>
            </View>
            <View style={styles.pinIconWrap}>
              <MaterialIcons name="place" size={24} color={colors.error} />
            </View>
          </View>

          <View style={styles.mapsLinkOverlay}>
            <MaterialIcons name="navigation" size={16} color={colors.primary} />
            <Text style={styles.mapsLinkText}>Mở Google Maps</Text>
          </View>
        </View>
      </Card>

      {/* PM Instructions Card */}
      <Card style={styles.instructionCard}>
        <View style={styles.instructionHeader}>
          <View style={styles.instructionHeaderLeft}>
            <MaterialIcons name="account-circle" size={18} color={colors.primary} />
            <Text style={[typography.labelSm, styles.instructionTitle]}>CHỈ ĐẠO TỪ PROJECT MANAGER</Text>
          </View>
          <Text style={[typography.caption, styles.instructionTime]}>{current.instructionTime}</Text>
        </View>

        <View style={styles.quoteBox}>
          <Text style={[typography.bodyMd, styles.quoteText]}>{current.instructionQuote}</Text>
        </View>

        <View style={styles.instructionFooter}>
          <View style={styles.senderGroup}>
            <View style={styles.onlineDot} />
            <Text style={[typography.caption, styles.senderName]}>
              Người gửi: <Text style={styles.boldText}>{current.pmName}</Text>
            </Text>
          </View>
          <View style={styles.priorityPill}>
            <Text style={styles.priorityText}>{current.priority}</Text>
          </View>
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actionContainer}>
        <Button
          variant="primary"
          title={`Bắt đầu bay & Nạp dữ liệu (${current.code})`}
          onPress={handleConfirmStart}
        />

        <Pressable
          style={styles.rejectButton}
          onPress={() => setRejectModalVisible(true)}
          accessibilityRole="button"
        >
          <MaterialIcons name="cancel" size={18} color={colors.error} />
          <Text style={[typography.labelLg, styles.rejectButtonText]}>
            Từ chối nhiệm vụ (KS03)
          </Text>
        </Pressable>

        <Text style={[typography.caption, styles.syncFootnote]}>
          Hệ thống sẽ đồng bộ nhật ký hiện trường ngay khi có kết nối mạng
        </Text>
      </View>

      {/* Modal Reject KS03 */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <MaterialIcons name="warning" size={24} color={colors.error} />
              </View>
              <Text style={[typography.titleMd, styles.modalTitle]}>
                Từ chối nhiệm vụ bay #REQ-KS-089
              </Text>
            </View>

            <Text style={[typography.bodyMd, styles.modalDesc]}>
              Theo quy trình KS03, phi công cần nhập lý do bất khả kháng (thời tiết mưa gió, vùng cấm bay, lỗi thiết bị) để gửi PM điều phối người khác:
            </Text>

            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Nhập chi tiết lý do từ chối..."
              placeholderTextColor={colors.secondary}
            />

            {rejectionSent && (
              <View style={styles.successBanner}>
                <MaterialIcons name="check-circle" size={16} color={colors.success} />
                <Text style={styles.successBannerText}>Đã gửi lý do từ chối về PM Quân!</Text>
              </View>
            )}

            <View style={styles.modalButtonRow}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={[typography.labelSm, styles.modalCancelText]}>Hủy</Text>
              </Pressable>

              <Pressable style={styles.modalConfirmBtn} onPress={handleSendRejection}>
                <Text style={[typography.labelSm, styles.modalConfirmText]}>Gửi từ chối</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  topBarCode: {
    color: colors.brandGold,
    fontWeight: '700',
  },
  topBarSub: {
    color: colors.secondary,
  },
  selectorBar: {
    marginBottom: spacing.sm,
  },
  selectorTitle: {
    color: colors.secondary,
    marginBottom: 6,
  },
  selectorScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  taskChip: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 110,
    gap: 2,
  },
  taskChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFDF7',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  taskChipCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.neutral,
  },
  taskChipCodeActive: {
    color: colors.primaryDark,
  },
  taskChipRoad: {
    fontSize: 10,
    color: colors.secondary,
  },
  taskChipRoadActive: {
    color: colors.neutral,
    fontWeight: '500',
  },
  headerCard: {
    marginBottom: spacing.sm,
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextGroup: {
    flex: 1,
    marginRight: spacing.sm,
  },
  codeLabel: {
    color: colors.secondary,
    fontWeight: '600',
  },
  roadTitle: {
    color: colors.neutral,
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusPillText: {
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
  },
  locationDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
  },
  locationFull: {
    color: colors.secondary,
    flex: 1,
  },
  paramCard: {
    marginBottom: spacing.sm,
  },
  paramCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  paramHeaderTitle: {
    color: colors.secondary,
  },
  paramGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  paramItem: {
    width: '48%',
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  paramLabel: {
    color: colors.secondary,
  },
  paramValue: {
    color: colors.neutral,
    fontWeight: '700',
    marginTop: 2,
  },
  mapCard: {
    marginBottom: spacing.sm,
    padding: 0,
    overflow: 'hidden',
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapHeaderTitle: {
    color: colors.secondary,
  },
  gpsCoord: {
    color: colors.secondary,
    fontFamily: 'Roboto',
  },
  mapVisualContainer: {
    height: 180,
    backgroundColor: '#E8ECEF',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  simulatedRiver: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: '#D2E3F0',
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  riverLabel: {
    fontSize: 10,
    color: '#7C9DB8',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  simulatedRoad: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    height: 36,
    backgroundColor: '#FCE8B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roadStripe: {
    position: 'absolute',
    height: 4,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
  },
  roadNameLabel: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.sm,
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.neutral,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pinTarget: {
    position: 'absolute',
    top: 25,
    alignItems: 'center',
  },
  pinCallout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.neutral,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    marginBottom: 2,
  },
  pinDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  pinText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  pinIconWrap: {
    marginTop: -4,
  },
  mapsLinkOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapsLinkText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.neutral,
  },
  instructionCard: {
    marginBottom: spacing.md,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  instructionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  instructionTitle: {
    color: colors.secondary,
  },
  instructionTime: {
    color: colors.secondary,
  },
  quoteBox: {
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
    marginVertical: spacing.xs,
  },
  quoteText: {
    color: colors.neutral,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
    fontStyle: 'normal',
  },
  instructionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  senderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success,
  },
  senderName: {
    color: colors.secondary,
  },
  priorityPill: {
    backgroundColor: '#FDECEC',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  priorityText: {
    color: colors.error,
    fontSize: 10,
    fontWeight: '700',
  },
  actionContainer: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
  },
  rejectButtonText: {
    color: colors.error,
    fontWeight: '700',
  },
  syncFootnote: {
    textAlign: 'center',
    color: colors.secondary,
    marginTop: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: '#FDECEC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: colors.neutral,
    flex: 1,
  },
  modalDesc: {
    color: colors.secondary,
    lineHeight: 18,
    fontSize: 13,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    textAlignVertical: 'top',
    minHeight: 80,
    color: colors.neutral,
    backgroundColor: colors.surfaceAlt,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E9F7EC',
    padding: 8,
    borderRadius: radius.sm,
  },
  successBannerText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: 'bold',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  modalCancelText: {
    color: colors.secondary,
  },
  modalConfirmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    backgroundColor: colors.error,
  },
  modalConfirmText: {
    color: colors.surface,
    fontWeight: 'bold',
  },
});
