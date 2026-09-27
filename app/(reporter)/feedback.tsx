import React, { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { InputField } from '../../src/components/InputField';
import { StarRating } from '../../src/components/StarRating';
import { colors, spacing, typography } from '../../src/design-tokens';
import { defectTypeLabel } from '../../src/constants/defect-types';
import { getReportByTracking, submitFeedback } from '../../src/api/mock/reporter';
import { REPORTER_HOME } from '../../src/constants/routes';
import { ReporterReport } from '../../src/types/domain';
import { ReporterReportStatus } from '../../src/types/enums';

export default function ReporterFeedbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const code = params.code ?? '';

  const [report, setReport] = useState<ReporterReport | null>(null);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await getReportByTracking(code);
        if (mounted) {
          setReport(result.report);
        }
      } catch {
        if (mounted) {
          setError('Không tải được thông tin phản ánh.');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [code]);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError('Vui lòng chọn mức độ hài lòng từ 1 đến 5 sao.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await submitFeedback(code, rating, notes);
      setDone(true);
    } catch (err) {
      setError(
        (err as Error).message === 'REPORT_NOT_FOUND'
          ? 'Không tìm thấy phản ánh với mã này.'
          : 'Không thể gửi đánh giá. Vui lòng thử lại.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <View style={styles.centered}>
          <Card style={styles.doneCard}>
            <MaterialIcons name="check-circle" size={48} color={colors.success} />
            <Text style={[typography.titleMd, styles.doneTitle]}>Cảm ơn bạn đã đánh giá</Text>
            <Text style={[typography.bodyMd, styles.doneBody]}>
              Ý kiến của bạn giúp chúng tôi nâng cao chất lượng bảo hành đường bộ.
            </Text>
            <Button
              variant="primary"
              title="Về trang chủ"
              onPress={() => router.replace(REPORTER_HOME)}
            />
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[typography.titleLg, styles.title]}>Đánh giá kết quả xử lý</Text>
          <Text style={[typography.caption, styles.subtitle]}>
            Phản ánh <Text style={styles.code}>{code}</Text> đã được nghiệm thu. Bạn đánh giá mức độ
            hài lòng với kết quả xử lý.
          </Text>

          {report ? (
            <Card style={styles.summaryCard}>
              {report.defect_type ? (
                <View style={styles.metaRow}>
                  <MaterialIcons name="category" size={16} color={colors.secondary} />
                  <Text style={[typography.bodyMd, styles.metaText]}>
                    {defectTypeLabel(report.defect_type)}
                  </Text>
                </View>
              ) : null}
              {report.route_hint ? (
                <View style={styles.metaRow}>
                  <MaterialIcons name="place" size={16} color={colors.secondary} />
                  <Text style={[typography.bodyMd, styles.metaText]}>{report.route_hint}</Text>
                </View>
              ) : null}
              {report.photo_uris.length > 0 ? (
                <View style={styles.photoRow}>
                  {report.photo_uris.map((uri, index) => (
                    <Image key={`${uri}-${index}`} source={{ uri }} style={styles.photo} />
                  ))}
                </View>
              ) : null}
            </Card>
          ) : null}

          <Card style={styles.ratingCard}>
            <Text style={[typography.labelLg, styles.ratingLabel]}>Mức độ hài lòng</Text>
            <StarRating value={rating} onChange={setRating} size={44} />
            <Text style={[typography.caption, styles.ratingHint]}>
              {rating === 0
                ? 'Chưa đánh giá'
                : rating <= 2
                  ? 'Chưa hài lòng — chúng tôi sẽ tiếp tục xử lý'
                  : rating <= 3
                    ? 'Ổn — cần cải thiện thêm'
                    : 'Hài lòng với kết quả xử lý'}
            </Text>
          </Card>

          <InputField
            label="Ý kiến của bạn (không bắt buộc)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Góp ý thêm về chất lượng, thời gian xử lý..."
            multiline
            testID="feedback-notes"
          />

          {error ? (
            <View style={styles.errorRow}>
              <MaterialIcons name="error-outline" size={16} color={colors.error} />
              <Text style={[typography.caption, styles.error]}>{error}</Text>
            </View>
          ) : null}

          <Button
            variant="primary"
            title="Gửi đánh giá"
            onPress={handleSubmit}
            loading={loading}
            disabled={rating < 1}
          />
          {report && report.status !== ReporterReportStatus.COMPLETED ? (
            <Text style={[typography.caption, styles.hint]}>
              Hệ thống ghi nhận đánh giá và gửi phản hồi tới Ban Quản lý dự án.
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceAlt },
  flex: { flex: 1 },
  content: { padding: spacing.screenMargin, paddingBottom: spacing.xl, gap: spacing.sm },
  centered: { flex: 1, justifyContent: 'center', padding: spacing.screenMargin },
  doneCard: { alignItems: 'center', gap: spacing.md },
  doneTitle: { color: colors.onSurface, textAlign: 'center' },
  doneBody: { color: colors.secondary, textAlign: 'center' },
  title: { color: colors.brandGold },
  subtitle: { color: colors.secondary, marginBottom: spacing.sm },
  code: { color: colors.brandGold },
  summaryCard: { gap: spacing.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  metaText: { color: colors.secondary, flex: 1 },
  photoRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  photo: { width: 72, height: 72, borderRadius: spacing.sm, backgroundColor: colors.surfaceAlt },
  ratingCard: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  ratingLabel: { color: colors.secondary },
  ratingHint: { color: colors.secondary, textAlign: 'center' },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  error: { color: colors.error, flex: 1 },
  hint: { color: colors.secondary, textAlign: 'center' },
});
