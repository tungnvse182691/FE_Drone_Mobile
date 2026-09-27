import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
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
  sensor: string;
  postProcess: string;
  droneModel: string;
  coordinates: string;
  corridorTitle: string;
  roadName: string;
  targetPoint: string;
  pmName: string;
  instructionTime: string;
  instructionQuote: string;
  priority: string;
  accessPoint: {
    name: string;
    terrain: string;
    wgs84Coord: string;
    lat: number;
    lng: number;
  };
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
    sensor: 'Camera 4K RGB 60fps + RTK độ chính xác cm',
    postProcess: 'Tái dựng mô hình độ cao số DSM bằng OpenDroneMap (ODM)',
    droneModel: 'M350-HH-02 (DJI Matrice 350 RTK)',
    coordinates: '10.7412° B, 106.5524° Đ',
    corridorTitle: 'ĐOẠN TÂN KIÊN - TUYẾN ĐH.05',
    roadName: 'Tân Kiên (Km03+000 - Km03+300)',
    targetPoint: 'Xói lở vai đường mép taluy âm',
    pmName: 'Trần Hoàng Quân (PM)',
    instructionTime: 'Hôm nay, 08:30',
    instructionQuote:
      '“Khảo sát đoạn từ Km03+000 đến Km03+300. Chú ý quét kỹ khu vực mép taluy âm đang có dấu hiệu xói lở vai đường sau mưa lớn. Cần bay ở độ cao 45m và quét ảnh 4K RGB kết hợp mô hình độ cao số DSM (ODM) 2 lượt.”',
    priority: 'Khẩn cấp',
    accessPoint: {
      name: 'Bãi đất trống Km01+850 - Cầu Bà Lát, Bình Chánh',
      terrain: 'Mặt bằng phẳng, không vướng đường điện cao thế, bán kính an toàn 15m',
      wgs84Coord: '10.7412° B, 106.5524° Đ',
      lat: 10.7412,
      lng: 106.5524,
    },
  },
  '#REQ-KS-090': {
    code: '#REQ-KS-090',
    roadTitle: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km01+200 - Km02+500)',
    location: 'Km01+200 - Km02+500, Vĩnh Lộc B, Bình Chánh, TP.HCM',
    statusText: 'MỚI TIẾP NHẬN',
    length: '2.4 km',
    altitude: '45 m (AGL)',
    overlap: '80% / 70%',
    format: '4K 60fps + RTK',
    sensor: 'Camera 4K RGB 60fps + RTK độ chính xác cm',
    postProcess: 'Tái dựng mô hình độ cao số DSM bằng OpenDroneMap (ODM)',
    droneModel: 'M350-HH-02 (DJI Matrice 350 RTK)',
    coordinates: '10.7333° B, 106.6833° Đ',
    corridorTitle: 'ĐOẠN VĨNH LỘC B - TUYẾN ĐH.05',
    roadName: 'Vĩnh Lộc B (Km01+200 - Km02+500)',
    targetPoint: 'Ổ gà sâu & nứt tấm bê tông nông thôn',
    pmName: 'Nguyễn Thùy Lan (PM)',
    instructionTime: 'Hôm nay, 07:45',
    instructionQuote:
      '“Lưu lượng xe tải trọng nặng di chuyển đông, bay dọc theo tim dải phân cách giữa, đảm bảo độ cao an toàn 45m tránh đường dây điện trung thế.”',
    priority: 'Ưu tiên cao',
    accessPoint: {
      name: 'Sân bê tông UBND xã Vĩnh Lộc B, Bình Chánh',
      terrain: 'Mặt bằng phẳng, tầm nhìn thoáng, không vướng vật cản, bán kính an toàn 20m',
      wgs84Coord: '10.7333° B, 106.6833° Đ',
      lat: 10.7333,
      lng: 106.6833,
    },
  },
  '#REQ-KS-088': {
    code: '#REQ-KS-088',
    roadTitle: 'Tuyến ĐH.05 - Cầu Bà Lát (Km01+850)',
    location: 'Km01+600 - Km02+100, Cầu Bà Lát, Bình Chánh, TP.HCM',
    statusText: 'MỚI TIẾP NHẬN',
    length: '4.0 km',
    altitude: '45 m (AGL)',
    overlap: '80% / 70%',
    format: '4K 60fps + RTK',
    sensor: 'Camera 4K RGB 60fps + RTK độ chính xác cm',
    postProcess: 'Tái dựng mô hình độ cao số DSM bằng OpenDroneMap (ODM)',
    droneModel: 'Mavic3E-HH-01 (DJI Mavic 3 Enterprise)',
    coordinates: '10.7833° B, 106.7333° Đ',
    corridorTitle: 'ĐOẠN CẦU BÀ LÁT - TUYẾN ĐH.05',
    roadName: 'Cầu Bà Lát (Km01+600 - Km02+100)',
    targetPoint: 'Vỡ mép tấm & khe co giãn cầu cạn',
    pmName: 'Nguyễn Thùy Lan (PM)',
    instructionTime: 'Hôm qua, 16:15',
    instructionQuote:
      '“Quét ảnh trực giao 3D độ phân giải cao phục vụ đo lường tiến độ và xuất mô hình bề mặt DSM (OpenDroneMap/ODM). Kiểm tra kỹ 2 mố dầm tiếp giáp bờ kênh.”',
    priority: 'Tiêu chuẩn',
    accessPoint: {
      name: 'Bãi đất trống Km01+850 - Cầu Bà Lát, Bình Chánh',
      terrain: 'Mặt bằng phẳng, không vướng đường điện cao thế, bán kính an toàn 15m',
      wgs84Coord: '10.7833° B, 106.7333° Đ',
      lat: 10.7833,
      lng: 106.7333,
    },
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
    sensor: 'Camera 4K RGB 60fps + RTK độ chính xác cm',
    postProcess: 'Tái dựng mô hình độ cao số DSM bằng OpenDroneMap (ODM)',
    droneModel: 'M350-HH-02 (DJI Matrice 350 RTK)',
    coordinates: '10.7700° B, 106.7050° Đ',
    corridorTitle: 'NÚT GIAO NGÃ BA TÂN KIÊN',
    roadName: 'Ngã ba Tân Kiên (Km03+100)',
    targetPoint: 'Đoạn lề taluy dương',
    pmName: 'Trần Văn Nam (PM)',
    instructionTime: 'Hôm nay, 06:30',
    instructionQuote:
      '“Bay quét toàn bộ nút giao hình hoa thị, chú ý điểm tiếp giáp tuyến ĐH.05 và trạm thu phát.”',
    priority: 'Đang bay',
    accessPoint: {
      name: 'Điểm tập kết hành lang an toàn Km03+050 - Tân Kiên',
      terrain: 'Khu đất dự phòng cách tim đường 12m, không có cáp viễn thông chăng ngang',
      wgs84Coord: '10.7700° B, 106.7050° Đ',
      lat: 10.7700,
      lng: 106.7050,
    },
  },
  '#REQ-KS-085': {
    code: '#REQ-KS-085',
    roadTitle: 'Tuyến ĐH.05 - Vĩnh Lộc B (Km02+180)',
    location: 'Km02+000 - Km02+400, Vĩnh Lộc B, Bình Chánh, TP.HCM',
    statusText: 'ĐÃ HOÀN THÀNH BAY',
    length: '3.1 km',
    altitude: '45 m (AGL)',
    overlap: '80% / 70%',
    format: '4K 60fps + RTK',
    sensor: 'Camera 4K RGB 60fps + RTK độ chính xác cm',
    postProcess: 'Tái dựng mô hình độ cao số DSM bằng OpenDroneMap (ODM)',
    droneModel: 'Mavic3E-HH-01 (DJI Mavic 3 Enterprise)',
    coordinates: '10.7400° B, 106.6900° Đ',
    corridorTitle: 'ĐOẠN VĨNH LỘC B Km02+180',
    roadName: 'Vĩnh Lộc B (Km02+000 - Km02+400)',
    targetPoint: 'Bản mặt cầu & khe lún đầu cầu',
    pmName: 'Lê Minh Tuấn (PM)',
    instructionTime: '20/10/2023, 14:00',
    instructionQuote:
      '“Khảo sát định kỳ hiện trạng lún sụt đầu cầu Suối Cả trước mùa mưa bão. Tệp video và ảnh trực giao đã được nạp an toàn.”',
    priority: 'Hoàn thành',
    accessPoint: {
      name: 'Khu đất trống đầu cống hộp Km02+180 - Vĩnh Lộc B',
      terrain: 'Mặt bằng phẳng, nền đất đầm chặt, bán kính an toàn 18m',
      wgs84Coord: '10.7400° B, 106.6900° Đ',
      lat: 10.7400,
      lng: 106.6900,
    },
  },
};

export default function DroneRequestDetailScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = params.code && REQUEST_DETAILS[params.code] ? params.code : '#REQ-KS-089';
  const [selectedCode, setSelectedCode] = useState<string>(initialCode);
  const [isAccepted, setIsAccepted] = useState(false);
  const [accepting, setAccepting] = useState(false);
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

  const handleOpenGoogleMaps = () => {
    // US-40, BR-38: Dẫn đường WGS84 tới Điểm tiếp cận cất/hạ cánh (Access Point)
    const url = `https://www.google.com/maps/dir/?api=1&destination=${current.accessPoint.lat},${current.accessPoint.lng}`;
    Linking.openURL(url).catch((err) => {
      console.warn('Could not open Google Maps', err);
    });
  };

  const handleAcceptTask = () => {
    setAccepting(true);
    // Giả lập POST /api/v1/survey-tasks/{taskId}/accept (Header: Idempotency-Key, If-Match)
    setTimeout(() => {
      setAccepting(false);
      setIsAccepted(true);
      router.push({
        pathname: '/(drone)/upload',
        params: { code: current.code },
      });
    }, 600);
  };

  const handleSendRejection = () => {
    setRejectionSent(true);
    setTimeout(() => {
      setRejectModalVisible(false);
      router.push('/(drone)/requests');
    }, 800);
  };

  const handleShareTask = async () => {
    try {
      await Share.share({
        message: `Nhiệm vụ bay khảo sát ${current.code}: ${current.roadTitle} (${current.location}). Thiết bị: ${current.droneModel}. Tọa độ WGS84: ${current.accessPoint.wgs84Coord}`,
      });
    } catch {
      // ignore
    }
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
          <Text style={[typography.caption, styles.topBarSub]}>Chi tiết nhiệm vụ bay</Text>
        </View>

        <Pressable
          style={styles.circleIconButton}
          onPress={handleShareTask}
          accessibilityRole="button"
          accessibilityLabel="Chia sẻ nhiệm vụ bay"
        >
          <MaterialIcons name="share" size={18} color={colors.secondary} />
        </Pressable>
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
            <Text style={[typography.labelSm, styles.statusPillText]}>{isAccepted ? 'ĐÃ TIẾP NHẬN' : current.statusText}</Text>
          </View>
        </View>

        <View style={styles.locationDivider}>
          <MaterialIcons name="location-on" size={18} color={colors.primary} />
          <Text style={[typography.bodyMd, styles.locationFull]}>{current.location}</Text>
        </View>
      </Card>

      {/* Access Point Information Card (BR-38 & US-40) */}
      <Card style={styles.accessPointCard}>
        <View style={styles.accessPointHeader}>
          <View style={styles.accessPointHeaderLeft}>
            <MaterialIcons name="flight-takeoff" size={18} color={colors.primary} />
            <Text style={[typography.labelSm, styles.accessPointHeaderTitle]}>
              ĐIỂM TIẾP CẬN CẤT-HẠ CÁNH (ACCESS POINT)
            </Text>
          </View>
          <View style={styles.wgs84Badge}>
            <Text style={styles.wgs84BadgeText}>WGS84</Text>
          </View>
        </View>

        <View style={styles.accessPointBody}>
          <Text style={[typography.titleMd, styles.accessPointName]}>
            {current.accessPoint.name}
          </Text>

          <View style={styles.accessPointDetailRow}>
            <MaterialIcons name="landscape" size={16} color={colors.secondary} />
            <Text style={[typography.caption, styles.accessPointDesc]}>
              {current.accessPoint.terrain}
            </Text>
          </View>

          <View style={styles.accessPointDetailRow}>
            <MaterialIcons name="my-location" size={16} color={colors.primary} />
            <Text style={[typography.caption, styles.accessPointCoord]}>
              Tọa độ WGS84: <Text style={styles.boldCoord}>{current.accessPoint.wgs84Coord}</Text>
            </Text>
          </View>
        </View>

        {/* Nút CTA Dẫn đường đến Điểm tiếp cận */}
        <Pressable
          style={styles.navMapButton}
          onPress={handleOpenGoogleMaps}
          accessibilityRole="button"
        >
          <MaterialIcons name="near-me" size={18} color={colors.primary} />
          <Text style={[typography.labelLg, styles.navMapButtonText]}>
            Dẫn đường đến Điểm tiếp cận (Google Maps)
          </Text>
        </Pressable>
      </Card>

      {/* Flight Parameters Card */}
      <Card style={styles.paramCard}>
        <View style={styles.paramCardHeader}>
          <MaterialIcons name="settings" size={18} color={colors.primary} />
          <Text style={[typography.labelSm, styles.paramHeaderTitle]}>
            THÔNG SỐ KỸ THUẬT BAY (PM CẤU HÌNH)
          </Text>
        </View>

        <View style={styles.paramGrid}>
          <View style={styles.paramItem}>
            <Text style={[typography.caption, styles.paramLabel]}>Thiết bị bay chỉ định</Text>
            <Text style={[typography.caption, styles.paramValue]}>{current.droneModel}</Text>
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
            <Text style={[typography.caption, styles.paramLabel]}>Chiều dài tuyến</Text>
            <Text style={[typography.bodyMd, styles.paramValue]}>{current.length}</Text>
          </View>
        </View>

        <View style={styles.techDetailBox}>
          <View style={styles.techRow}>
            <MaterialIcons name="videocam" size={16} color={colors.primary} />
            <Text style={[typography.caption, styles.techText]}>
              Cảm biến: <Text style={styles.techBold}>{current.sensor}</Text>
            </Text>
          </View>

          <View style={styles.techRow}>
            <MaterialIcons name="layers" size={16} color={colors.primary} />
            <Text style={[typography.caption, styles.techText]}>
              Xử lý hậu kỳ: <Text style={styles.techBold}>{current.postProcess}</Text>
            </Text>
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

          <Pressable style={styles.mapsLinkOverlay} onPress={handleOpenGoogleMaps}>
            <MaterialIcons name="navigation" size={16} color={colors.primary} />
            <Text style={styles.mapsLinkText}>Mở Google Maps WGS84</Text>
          </Pressable>
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
          title={isAccepted ? `Tiếp tục nạp dữ liệu (${current.code})` : `Chấp nhận nhiệm vụ & Bắt đầu bay (${current.code})`}
          loading={accepting}
          onPress={handleAcceptTask}
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
          Xác thực mã băm SHA-256 dữ liệu và đồng bộ ngoại tuyến theo TCVN 10380:2014
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
                Từ chối nhiệm vụ bay {current.code}
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
                <Text style={styles.successBannerText}>Đã gửi lý do từ chối về PM!</Text>
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
  accessPointCard: {
    marginBottom: spacing.sm,
    backgroundColor: '#FBFBFA',
    borderWidth: 1,
    borderColor: colors.border,
  },
  accessPointHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  accessPointHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  accessPointHeaderTitle: {
    color: colors.secondary,
    fontWeight: '700',
  },
  wgs84Badge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  wgs84BadgeText: {
    color: colors.info,
    fontSize: 10,
    fontWeight: 'bold',
  },
  accessPointBody: {
    gap: 4,
    marginVertical: spacing.xs,
  },
  accessPointName: {
    color: colors.neutral,
    fontWeight: '700',
  },
  accessPointDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accessPointDesc: {
    color: colors.secondary,
    flex: 1,
  },
  accessPointCoord: {
    color: colors.secondary,
    flex: 1,
  },
  boldCoord: {
    fontWeight: '700',
    color: colors.neutral,
    fontFamily: 'Roboto',
  },
  navMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    marginTop: spacing.xs,
  },
  navMapButtonText: {
    color: colors.neutral,
    fontWeight: '600',
    fontSize: 13,
  },
  techDetailBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    marginTop: spacing.xs,
    gap: 6,
  },
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  techText: {
    color: colors.secondary,
    flex: 1,
  },
  techBold: {
    fontWeight: '600',
    color: colors.neutral,
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
