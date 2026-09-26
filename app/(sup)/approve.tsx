import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { Card } from '../../src/components/Card';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { defectTypeLabel, type DefectTypeCode } from '../../src/constants/defect-types';

interface ApprovalDossier {
  id: string;
  code: string;
  batchCode: string;
  road: string;
  risk: 'RỦI RO CAO' | 'TRUNG BÌNH' | 'THẤP';
  defectCode: DefectTypeCode;
  pmName: string;
  method: string;
  deadline: string;
  measurements: { label: string; value: string }[];
  media: {
    photoTitle: string;
    photoSub: string;
    videoTitle: string;
    videoSub: string;
  };
  pmTime: string;
  pmQuote: string;
}

const DOSSIERS: Record<string, ApprovalDossier> = {
  '#DF-0231': {
    id: '1',
    code: '#DF-0231',
    batchCode: '#REQ-045',
    road: 'Tuyến ĐH.05 — Cầu Bà Lát (Km01+850)',
    risk: 'RỦI RO CAO',
    defectCode: 'POTH_DEEP',
    pmName: 'PM Nguyễn Thùy Lan',
    method: 'Cắt viền tấm, đục tẩy tạo nhám, quét dính bám SikaLatex, đổ bù bê tông xi măng mác 300',
    deadline: 'Trong 3 ngày',
    measurements: [
      { label: 'Độ sâu ổ gà', value: '~6.8cm' },
      { label: 'Diện tích xử lý', value: '14.5 m²' },
    ],
    media: {
      photoTitle: 'Ảnh đo thước nivo',
      photoSub: 'Độ sâu hố 6.8cm',
      videoTitle: 'Video flycam 4K',
      videoSub: 'Thời lượng 01:24',
    },
    pmTime: 'Hôm qua 15:40',
    pmQuote:
      '“Ổ gà sâu phát triển nhanh sau đợt mưa lớn do nước đọng tích tụ tại khe tấm. Đã xác minh thực địa sáng nay, cần cắt viền tấm và đục tẩy toàn bộ diện tích trước khi hư hại lan xuống lớp móng bê tông lót bên dưới.”',
  },
  '#DF-0229': {
    id: '2',
    code: '#DF-0229',
    batchCode: '#REQ-044',
    road: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km02+180)',
    risk: 'TRUNG BÌNH',
    defectCode: 'EDGE_BRK',
    pmName: 'PM Trần Văn Nam',
    method: 'Đục tẩy tạo nhám, quét dính bám SikaLatex, đổ bù bê tông xi măng mác 300',
    deadline: 'Trong 5 ngày',
    measurements: [
      { label: 'Độ mở khe co giãn', value: '~3.2cm' },
      { label: 'Chiều dài vỡ mép tấm', value: '8.5 m' },
    ],
    media: {
      photoTitle: 'Ảnh vỡ mép tấm',
      photoSub: 'Bong tróc khe co giãn',
      videoTitle: 'Video flycam quét khe',
      videoSub: 'Thời lượng 00:58',
    },
    pmTime: 'Hôm nay 08:30',
    pmQuote:
      '“Khe co giãn phía mố cầu bờ Nam có dấu hiệu xô lệch kết hợp vỡ mép tấm bê tông sau đợt ngập lũ. Cần đục tẩy vệ sinh và đổ bù lại bằng bê tông xi măng mác 300 trước kỳ bảo trì định kỳ tháng 11.”',
  },
  '#DF-0219': {
    id: '3',
    code: '#DF-0219',
    batchCode: '#REQ-042',
    road: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km01+200)',
    risk: 'RỦI RO CAO',
    defectCode: 'SHLD_EROS',
    pmName: 'PM Lê Minh Tuấn',
    method: 'Gia cố mái taluy bằng đá hộc kết hợp quét dính bám Aside',
    deadline: 'Trong 7 ngày',
    measurements: [
      { label: 'Chiều rộng vệt xói lở', value: '~4.5m' },
      { label: 'Diện tích xử lý', value: '10.2 m²' },
    ],
    media: {
      photoTitle: 'Ảnh hiện trạng vai đường',
      photoSub: 'Xói lở lớp đất vai',
      videoTitle: 'Video flycam 4K',
      videoSub: 'Thời lượng 01:10',
    },
    pmTime: '2 ngày trước',
    pmQuote:
      '“Vai đường xói lở sâu khoảng 4.5m, lớp đất bị cuốn trôi sau đợt mưa lớn. Cần gia cố mái taluy bằng đá hộc và quét dính bám Aside trước khi sạt lở lan xuống taluy đào.”',
  },
  '#DF-0220': {
    id: '4',
    code: '#DF-0220',
    batchCode: '#REQ-041',
    road: 'Tuyến ĐH.05 — Tân Kiên (Km03+100)',
    risk: 'RỦI RO CAO',
    defectCode: 'SLAB_CRK',
    pmName: 'PM Trần Thế Hùng',
    method: 'Cắt viền tấm, đục tẩy tạo nhám, quét dính bám SikaLatex, đổ bù bê tông xi măng mác 300',
    deadline: 'Trong 5 ngày',
    measurements: [
      { label: 'Bề rộng khe nứt', value: '~5.0mm' },
      { label: 'Chiều dài đoạn nứt', value: '22.0 m' },
    ],
    media: {
      photoTitle: 'Ảnh nứt tấm bê tông',
      photoSub: 'Thước đo vết nứt 5mm',
      videoTitle: 'Video flycam quét mặt đường',
      videoSub: 'Thời lượng 01:45',
    },
    pmTime: '3 ngày trước',
    pmQuote:
      '“Mạng vết nứt chân chim kéo dài trên tấm bê tông nông thôn dày 18-22cm. Đề nghị cắt viền tấm, đục tẩy tạo nhám, quét dính bám SikaLatex và đổ bù bằng bê tông xi măng mác 300.”',
  },
  '#DF-0215': {
    id: '5',
    code: '#DF-0215',
    batchCode: '#REQ-039',
    road: 'Tuyến ĐH.05 — Vĩnh Lộc B (Km01+450)',
    risk: 'THẤP',
    defectCode: 'DEPR_POND',
    pmName: 'PM Nguyễn Thùy Lan',
    method: 'Đào bỏ phần nền lún, đục tẩy tạo nhám, quét dính bám Aside, đổ bù bê tông xi măng mác 300',
    deadline: 'Trong 7 ngày',
    measurements: [
      { label: 'Độ lún nền so với cốt', value: '~4.2cm' },
      { label: 'Diện tích cần đào thay', value: '6.5 m²' },
    ],
    media: {
      photoTitle: 'Ảnh đo cao độ nền',
      photoSub: 'Lún nền 4.2cm so với mặt đường',
      videoTitle: 'Video rà soát nền đường',
      videoSub: 'Thời lượng 00:45',
    },
    pmTime: '4 ngày trước',
    pmQuote:
      '“Nền đường lún võng do nước đọng tích tụ, gây tiếng ồn và nguy cơ va chạm cho xe máy. Cần đào bỏ phần nền lún, đục tẩy tạo nhám, quét dính bám Aside và đổ bù bằng bê tông xi măng mác 300.”',
  },
  '#DF-0210': {
    id: '6',
    code: '#DF-0210',
    batchCode: '#REQ-038',
    road: 'Tuyến ĐH.05 — Tân Kiên (Km03+100)',
    risk: 'THẤP',
    defectCode: 'SHLD_EROS',
    pmName: 'PM Lê Minh Tuấn',
    method: 'Gia cố vai đường bằng đá hộc, quét dính bám Aside và tưới nhũ tương dính bám',
    deadline: 'Trong 7 ngày',
    measurements: [
      { label: 'Chiều rộng vệt xói lở', value: '~1.8m' },
      { label: 'Chiều dài đoạn sửa', value: '18.0 m' },
    ],
    media: {
      photoTitle: 'Ảnh xói lở vai đường',
      photoSub: 'Rạn nứt bề mặt vai',
      videoTitle: 'Video flycam 4K',
      videoSub: 'Thời lượng 01:05',
    },
    pmTime: '5 ngày trước',
    pmQuote:
      '“Vai đường xói lở lan rộng do mưa rửa dòng, đá hộc nền đã lộ ra. Cần gia cố lại vai bằng đá hộc, quét dính bám Aside và tưới nhũ tương dính bám trước mùa mưa.”',
  },
};

export default function SupervisorApproveScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const initialCode = params.code && DOSSIERS[params.code] ? params.code : '#DF-0231';
  const [selectedCode, setSelectedCode] = useState<string>(initialCode);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>(params.code ? 'detail' : 'list');
  const [filterRisk, setFilterRisk] = useState<'all' | 'high' | 'other'>('all');
  const [note, setNote] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (params.code && DOSSIERS[params.code]) {
      setSelectedCode(params.code);
      setViewMode('detail');
    }
  }, [params.code]);

  const currentDossier = DOSSIERS[selectedCode] ?? DOSSIERS['#DF-0231'];

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const handleApprove = () => {
    setLoading(true);
    showToast(`Đang ký duyệt phương án kỹ thuật cho đợt sửa ${currentDossier.batchCode}...`);
    setTimeout(() => {
      setLoading(false);
      router.push('/(sup)/signoff');
    }, 800);
  };

  const handleReject = () => {
    if (!note.trim()) {
      showToast('⚠️ Vui lòng nhập lý do từ chối vào ô ghi chú (Quy tắc SC07)!');
      return;
    }
    showToast(`Đã từ chối và trả hồ sơ ${currentDossier.batchCode} cho ${currentDossier.pmName} bổ sung.`);
    setTimeout(() => {
      setViewMode('list');
    }, 1000);
  };

  const filteredDossiers = Object.values(DOSSIERS).filter((d) => {
    if (filterRisk === 'high') return d.risk === 'RỦI RO CAO';
    if (filterRisk === 'other') return d.risk !== 'RỦI RO CAO';
    return true;
  });

  return (
    <SafeAreaScreen scroll>
      {/* Toast Alert */}
      {toastMsg && (
        <View style={styles.toast}>
          <MaterialIcons name="info" size={18} color={colors.surface} />
          <Text style={styles.toastText}>{toastMsg}</Text>
        </View>
      )}

      {viewMode === 'list' ? (
        /* ==================== VIEW 1: DANH SÁCH CHỜ PHÊ DUYỆT ==================== */
        <View style={styles.listViewContainer}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <Pressable
              style={styles.circleIconButton}
              onPress={() => router.push('/(sup)/home')}
              accessibilityRole="button"
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.secondary} />
            </Pressable>

            <View style={styles.topBarCenter}>
              <Text style={[typography.titleMd, styles.topBarTitle]}>
                Danh sách chờ phê duyệt
              </Text>
              <Text style={[typography.caption, styles.topBarSub]}>
                {Object.keys(DOSSIERS).length} đợt sửa chữa cần thẩm định
              </Text>
            </View>

            <View style={styles.circleIconButton}>
              <MaterialIcons name="filter-list" size={18} color={colors.primary} />
            </View>
          </View>

          {/* Filter Chips */}
          <View style={styles.filterRow}>
            <Pressable
              style={[styles.filterChip, filterRisk === 'all' && styles.filterChipActive]}
              onPress={() => setFilterRisk('all')}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterRisk === 'all' && styles.filterChipTextActive,
                ]}
              >
                Tất cả ({Object.keys(DOSSIERS).length})
              </Text>
            </Pressable>

            <Pressable
              style={[styles.filterChip, filterRisk === 'high' && styles.filterChipActive]}
              onPress={() => setFilterRisk('high')}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterRisk === 'high' && styles.filterChipTextActive,
                ]}
              >
                Rủi ro cao (3)
              </Text>
            </Pressable>

            <Pressable
              style={[styles.filterChip, filterRisk === 'other' && styles.filterChipActive]}
              onPress={() => setFilterRisk('other')}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.filterChipText,
                  filterRisk === 'other' && styles.filterChipTextActive,
                ]}
              >
                Vừa & Thấp (3)
              </Text>
            </Pressable>
          </View>

          {/* Dossiers List */}
          <View style={styles.listWrap}>
            {filteredDossiers.map((item) => (
              <Pressable
                key={item.code}
                onPress={() => {
                  setSelectedCode(item.code);
                  setViewMode('detail');
                }}
                accessibilityRole="button"
              >
                <Card style={styles.listCardItem}>
                  <View style={styles.listCardHeader}>
                    <View style={styles.listCardCodeWrap}>
                      <Text style={styles.listCardCode}>{item.code}</Text>
                      <Text style={[typography.caption, styles.listCardBatch]}>
                        • Đợt: {item.batchCode}
                      </Text>
                    </View>

                    <Chip
                      variant={
                        item.risk === 'RỦI RO CAO'
                          ? 'severity-high'
                          : item.risk === 'TRUNG BÌNH'
                          ? 'severity-medium'
                          : 'severity-low'
                      }
                      label={item.risk}
                    />
                  </View>

                  <Text style={[typography.titleMd, styles.listCardRoad]}>{item.road}</Text>
                  <Text style={[typography.bodyMd, styles.listCardDefect]}>
                    {item.defectCode} — {defectTypeLabel(item.defectCode)}
                  </Text>

                  <View style={styles.listCardMeta}>
                    <View style={styles.listPmWrap}>
                      <MaterialIcons name="account-circle" size={16} color={colors.secondary} />
                      <Text style={[typography.caption, styles.listPmName]}>
                        {item.pmName}
                      </Text>
                    </View>
                    <Text style={[typography.caption, styles.listPmTime]}>{item.pmTime}</Text>
                  </View>

                  <View style={styles.listCardFooter}>
                    <View style={styles.listInfoCol}>
                      <Text style={[typography.caption, styles.listInfoLabel]}>
                        Phương án kỹ thuật
                      </Text>
                      <Text style={[typography.caption, styles.listInfoValue]}>{item.method}</Text>
                      <Text style={[typography.caption, styles.listInfoLabel]}>
                        Thời hạn: {item.deadline}
                      </Text>
                    </View>

                    <View style={styles.listInspectBtn}>
                      <Text style={styles.listInspectText}>Thẩm định chi tiết →</Text>
                    </View>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        /* ==================== VIEW 2: CHI TIẾT THẨM ĐỊNH HỒ SƠ ==================== */
        <View>
          {/* Top Bar with Back Button (Back to List) */}
          <View style={styles.topBar}>
            <Pressable
              style={styles.circleIconButton}
              onPress={() => setViewMode('list')}
              accessibilityRole="button"
            >
              <MaterialIcons name="arrow-back" size={20} color={colors.secondary} />
            </Pressable>

            <View style={styles.topBarCenter}>
              <Text style={[typography.titleMd, styles.topBarTitle]}>
                Thẩm định {currentDossier.code}
              </Text>
              <Text style={[typography.caption, styles.topBarSub]}>
                Hồ sơ đợt: {currentDossier.batchCode} • Ban Giám sát
              </Text>
            </View>

            <Pressable
              style={styles.circleIconButton}
              onPress={() => setViewMode('list')}
              accessibilityRole="button"
            >
              <MaterialIcons name="view-list" size={18} color={colors.primary} />
            </Pressable>
          </View>

          {/* Dossier Selection Carousel / Switcher */}
          <View style={styles.selectorContainer}>
            <View style={styles.selectorHeader}>
              <Text style={[typography.labelSm, styles.selectorHeaderTitle]}>
                CHỌN HỒ SƠ CẦN THẨM ĐỊNH ({Object.keys(DOSSIERS).length})
              </Text>
              <Pressable onPress={() => setViewMode('list')} accessibilityRole="button">
                <Text style={[typography.caption, styles.selectorHint]}>Xem danh sách</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectorScroll}
            >
              {Object.values(DOSSIERS).map((dossier) => {
                const isSelected = dossier.code === selectedCode;
                const isHighRisk = dossier.risk === 'RỦI RO CAO';

                return (
                  <Pressable
                    key={dossier.code}
                    style={[
                      styles.selectorChip,
                      isSelected && styles.selectorChipActive,
                    ]}
                    onPress={() => setSelectedCode(dossier.code)}
                    accessibilityRole="button"
                  >
                    <View style={styles.selectorChipTop}>
                      <Text
                        style={[
                          styles.selectorChipCode,
                          isSelected && styles.selectorChipCodeActive,
                        ]}
                      >
                        {dossier.code}
                      </Text>
                      <View
                        style={[
                          styles.miniDot,
                          {
                            backgroundColor:
                              dossier.risk === 'RỦI RO CAO'
                                ? colors.error
                                : dossier.risk === 'TRUNG BÌNH'
                                ? colors.warning
                                : colors.success,
                          },
                        ]}
                      />
                    </View>

                    <Text
                      style={[
                        styles.selectorChipRoad,
                        isSelected && styles.selectorChipRoadActive,
                      ]}
                      numberOfLines={1}
                    >
                      {dossier.road.split('—')[0]?.trim()}
                    </Text>

                    <Text
                      style={[
                        styles.selectorChipDeadline,
                        isSelected && styles.selectorChipDeadlineActive,
                      ]}
                    >
                      {dossier.deadline}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Section: Project Overview Card */}
          <Card style={styles.dossierCard}>
            <View style={styles.dossierTop}>
              <View style={styles.roadInfo}>
                <Text style={[typography.caption, styles.roadLabel]}>
                  ĐOẠN ĐƯỜNG BẢO HÀNH
                </Text>
                <Text style={[typography.titleMd, styles.roadName]}>
                  {currentDossier.road}
                </Text>
              </View>
              <View
                style={[
                  styles.riskBadge,
                  {
                    backgroundColor:
                      currentDossier.risk === 'RỦI RO CAO'
                        ? '#FDECEC'
                        : currentDossier.risk === 'TRUNG BÌNH'
                        ? '#FEF3E2'
                        : '#E9F7EC',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.riskBadgeText,
                    {
                      color:
                        currentDossier.risk === 'RỦI RO CAO'
                          ? colors.error
                          : currentDossier.risk === 'TRUNG BÌNH'
                          ? colors.warning
                          : colors.success,
                    },
                  ]}
                >
                  {currentDossier.risk}
                </Text>
              </View>
            </View>

            <View style={styles.dossierGrid}>
              <View style={styles.gridItem}>
                <Text style={[typography.caption, styles.gridLabel]}>Loại khiếm khuyết</Text>
                <Text style={[typography.bodyMd, styles.gridValue]}>
                  {currentDossier.defectCode} — {defectTypeLabel(currentDossier.defectCode)}
                </Text>
              </View>

              <View style={styles.gridItem}>
                <Text style={[typography.caption, styles.gridLabel]}>Người lập hồ sơ</Text>
                <Text style={[typography.bodyMd, styles.gridValue]}>
                  {currentDossier.pmName}
                </Text>
              </View>
            </View>

            {/* Method & Measurements highlight */}
            <View style={styles.methodSection}>
              <View style={styles.listInfoCol}>
                <Text style={[typography.caption, styles.methodLabel]}>
                  Phương án kỹ thuật đề xuất:
                </Text>
                <Text style={[typography.labelLg, styles.methodValue]}>
                  {currentDossier.method}
                </Text>
                <Text style={[typography.caption, styles.methodLabel]}>
                  Thời hạn thực hiện: {currentDossier.deadline}
                </Text>
              </View>

              <View style={styles.measurementsBox}>
                {currentDossier.measurements.map((m, idx) => (
                  <Text key={idx} style={[typography.caption, styles.measureText]}>
                    {m.label}: <Text style={styles.boldText}>{m.value}</Text>
                  </Text>
                ))}
              </View>
            </View>
          </Card>

          {/* Field Media Proofs (Wireframe: Photo + Video) */}
          <Card style={styles.mediaCard}>
            <View style={styles.mediaHeader}>
              <Text style={[typography.labelSm, styles.mediaSectionTitle]}>
                HÌNH ẢNH & VIDEO HIỆN TRƯỜNG ({currentDossier.code})
              </Text>
            </View>

            <View style={styles.mediaRow}>
              {/* Photo Thumbnail */}
              <View style={styles.mediaBox}>
                <View style={styles.mediaPlaceholderPhoto}>
                  <MaterialIcons name="photo-camera" size={28} color={colors.primary} />
                  <Text style={styles.mediaLabel}>{currentDossier.media.photoTitle}</Text>
                  <Text style={styles.mediaSubLabel}>{currentDossier.media.photoSub}</Text>
                </View>
              </View>

              {/* Video Thumbnail */}
              <View style={styles.mediaBox}>
                <View style={styles.mediaPlaceholderVideo}>
                  <MaterialIcons name="videocam" size={28} color={colors.info} />
                  <Text style={styles.mediaLabel}>{currentDossier.media.videoTitle}</Text>
                  <Text style={styles.mediaSubLabel}>{currentDossier.media.videoSub}</Text>
                </View>
              </View>
            </View>
          </Card>

          {/* PM Verification Notes */}
          <Card style={styles.pmNoteCard}>
            <View style={styles.pmNoteHeader}>
              <View style={styles.pmSenderGroup}>
                <MaterialIcons name="chat" size={16} color={colors.primary} />
                <Text style={[typography.labelSm, styles.pmSenderName]}>
                  Ý KIẾN THẨM ĐỊNH CỦA {currentDossier.pmName.toUpperCase()}
                </Text>
              </View>
              <Text style={[typography.caption, styles.pmNoteTime]}>{currentDossier.pmTime}</Text>
            </View>

            <Text style={[typography.bodyMd, styles.pmQuote]}>{currentDossier.pmQuote}</Text>
          </Card>

          {/* Supervisor Approval Note Input */}
          <View style={styles.inputContainer}>
            <Text style={[typography.labelSm, styles.inputLabel]}>
              GHI CHÚ PHÊ DUYỆT (TÙY CHỌN)
            </Text>
            <TextInput
              style={styles.textInput}
              multiline
              numberOfLines={2}
              value={note}
              onChangeText={setNote}
              placeholder="Nhập chỉ đạo kỹ thuật hoặc lưu ý cho đội thi công..."
              placeholderTextColor={colors.secondary}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <Pressable
              style={styles.rejectBtn}
              onPress={handleReject}
              accessibilityRole="button"
            >
              <MaterialIcons name="close" size={18} color={colors.error} />
              <Text style={[typography.labelLg, styles.rejectBtnText]}>Từ chối</Text>
            </Pressable>

            <View style={styles.approveBtnWrap}>
              <Button
                variant="primary"
                title={`Phê duyệt (${currentDossier.code})`}
                loading={loading}
                onPress={handleApprove}
              />
            </View>
          </View>
        </View>
      )}
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
    fontWeight: 'bold',
  },
  topBarSub: {
    color: colors.secondary,
  },
  toast: {
    backgroundColor: colors.neutral,
    padding: spacing.sm,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  toastText: {
    color: colors.surface,
    fontSize: 12,
    flex: 1,
  },
  selectorContainer: {
    marginBottom: spacing.sm,
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  selectorHeaderTitle: {
    color: colors.secondary,
  },
  selectorHint: {
    color: colors.primaryDark,
    fontSize: 11,
  },
  selectorScroll: {
    gap: spacing.xs,
    paddingVertical: 2,
  },
  selectorChip: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 125,
    gap: 2,
  },
  selectorChipActive: {
    borderColor: colors.primary,
    backgroundColor: '#FFFDF7',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectorChipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorChipCode: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  selectorChipCodeActive: {
    color: colors.primaryDark,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectorChipRoad: {
    color: colors.secondary,
    fontSize: 10,
  },
  selectorChipRoadActive: {
    color: colors.neutral,
    fontWeight: '500',
  },
  selectorChipDeadline: {
    color: colors.primary,
    fontWeight: 'bold',
    fontSize: 11,
    marginTop: 2,
  },
  selectorChipDeadlineActive: {
    color: colors.primaryDark,
  },
  dossierCard: {
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  dossierTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roadInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  roadLabel: {
    color: colors.secondary,
  },
  roadName: {
    color: colors.neutral,
    marginTop: 2,
  },
  riskBadge: {
    backgroundColor: '#FDECEC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  riskBadgeText: {
    color: colors.error,
    fontSize: 10,
    fontWeight: 'bold',
  },
  dossierGrid: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  gridItem: {
    flex: 1,
  },
  gridLabel: {
    color: colors.secondary,
  },
  gridValue: {
    color: colors.neutral,
    fontWeight: '600',
    marginTop: 2,
  },
  methodSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  methodLabel: {
    color: colors.secondary,
  },
  methodValue: {
    color: colors.primary,
    marginTop: 2,
  },
  measurementsBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  measureText: {
    color: colors.secondary,
  },
  boldText: {
    fontWeight: 'bold',
    color: colors.neutral,
  },
  mediaCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  mediaHeader: {
    marginBottom: 4,
  },
  mediaSectionTitle: {
    color: colors.secondary,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mediaBox: {
    flex: 1,
    height: 100,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  mediaPlaceholderPhoto: {
    flex: 1,
    backgroundColor: '#FEF3E2',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  mediaPlaceholderVideo: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: colors.info,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  mediaLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.neutral,
  },
  mediaSubLabel: {
    fontSize: 10,
    color: colors.secondary,
  },
  pmNoteCard: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  pmNoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pmSenderGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pmSenderName: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  pmNoteTime: {
    color: colors.secondary,
  },
  pmQuote: {
    color: colors.secondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    color: colors.secondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
    color: colors.neutral,
    minHeight: 64,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    minHeight: 48,
  },
  rejectBtnText: {
    color: colors.error,
    fontWeight: 'bold',
  },
  approveBtnWrap: {
    flex: 2,
  },
  listViewContainer: {
    paddingBottom: spacing.xl,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: {
    backgroundColor: '#FEF9E7',
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  filterChipTextActive: {
    color: colors.primaryDark,
    fontWeight: 'bold',
  },
  listWrap: {
    gap: spacing.sm,
  },
  listCardItem: {
    marginBottom: spacing.xs,
    gap: 6,
  },
  listCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  listCardCodeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listCardCode: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primaryDark,
  },
  listCardBatch: {
    color: colors.secondary,
  },
  listCardRoad: {
    color: colors.neutral,
    fontWeight: 'bold',
  },
  listCardDefect: {
    color: colors.secondary,
    fontSize: 13,
  },
  listCardMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    marginTop: 2,
  },
  listPmWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listPmName: {
    color: colors.neutral,
    fontWeight: '600',
  },
  listPmTime: {
    color: colors.secondary,
  },
  listCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    marginTop: 4,
  },
  listInfoLabel: {
    color: colors.secondary,
  },
  listInfoValue: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  listInfoCol: {
    flex: 1,
    paddingRight: spacing.sm,
  },
  listInspectBtn: {
    backgroundColor: '#FEF9E7',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  listInspectText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
});
