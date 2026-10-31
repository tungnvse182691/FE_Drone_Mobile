import { ReporterHeader } from '../../src/components/ReporterHeader';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../src/components/Button';
import { Card } from '../../src/components/Card';
import { colors, spacing, typography } from '../../src/design-tokens';
import { REPORTER_HOME } from '../../src/constants/routes';

export default function ReporterFeedbackScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ReporterHeader title="Đánh giá phản ánh" />
      <View style={styles.centered}>
        <Card style={styles.card}>
          <MaterialIcons name="construction" size={48} color={colors.brandGold} />
          <Text style={[typography.titleMd, styles.title]}>Đánh giá chưa khả dụng</Text>
          <Text style={[typography.bodyMd, styles.body]}>
            Hệ thống chưa mở chức năng đánh giá chất lượng xử lý cho người dân. Vui lòng quay lại sau.
          </Text>
          <Button variant="primary" title="Về trang chủ" onPress={() => router.replace(REPORTER_HOME)} />
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceAlt },
  centered: { flex: 1, justifyContent: 'center', padding: spacing.screenMargin },
  card: { alignItems: 'center', gap: spacing.md },
  title: { color: colors.onSurface, textAlign: 'center' },
  body: { color: colors.secondary, textAlign: 'center' },
});
