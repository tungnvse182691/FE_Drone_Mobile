import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { colors, spacing, typography } from '../design-tokens';
import { useAuthStore } from '../store/auth';
import { loadLocalOperatorTasks, type LocalOperatorTask } from '../offline/operatorLocalTasks';
import { operatorTaskDisplayCode, operatorTaskStatusLabel } from '../api/operator-task-view';

/** Isolated read-only surface: no role routes, API calls, command recovery or dispatch. */
export function OperatorLocalTasks({ onClose }: { onClose: () => void }) {
  const owner = useAuthStore(s => s.user);
  const [tasks, setTasks] = useState<LocalOperatorTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => subscription.remove();
  }, [onClose]);
  useEffect(() => {
    let active = true;
    const unsubscribe = useAuthStore.subscribe(() => {
      active = false;
      setTasks([]);
      onClose();
    });
    void (async () => {
      try {
        const scope = await useAuthStore.getState().operatorLocalReadScope();
        if (!scope) throw Error('local_session_unavailable');
        const rows = await loadLocalOperatorTasks(scope, () => active);
        if (active) setTasks(rows);
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; unsubscribe(); };
  }, [owner, onClose]);
  return <SafeAreaView style={styles.root}>
    <View style={styles.header}>
      <Text style={typography.titleLg}>Nhiệm vụ đã tải</Text>
      <Text style={styles.description}>Bản lưu trên máy · Chỉ xem</Text>
    </View>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={styles.description}>Kết nối lại để cập nhật phân công và tiếp tục gửi dữ liệu.</Text>
      {loading ? <ActivityIndicator color={colors.primary} /> : null}
      {error ? <Text style={styles.description}>Chưa đọc được bản lưu của tài khoản này. Dữ liệu vẫn được giữ trên máy.</Text> : null}
      {!loading && !error && !tasks.length ? <Text style={styles.description}>Chưa có nhiệm vụ đã tải cho phiên đăng nhập này.</Text> : null}
      {tasks.map(task => <View key={task.id} style={styles.card}>
        <Text style={typography.labelLg}>Nhiệm vụ {operatorTaskDisplayCode(task.id)}</Text>
        <Text style={styles.description}>{operatorTaskStatusLabel(task.status)}</Text>
        <Text style={styles.description}>{task.segmentCount} đoạn khảo sát</Text>
        <Text style={styles.caption}>Đã tải: {new Date(task.cachedAt).toLocaleString('vi-VN')}</Text>
      </View>)}
    </ScrollView>
    <View style={styles.footer}><Button variant="primary" title="Quay lại kết nối" onPress={onClose} /></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', backgroundColor: colors.surface },
  header: { padding: spacing.lg, gap: spacing.xs },
  content: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  description: { ...typography.bodyMd, color: colors.secondary },
  caption: { ...typography.caption, color: colors.secondary },
  card: { padding: spacing.md, gap: spacing.xs, backgroundColor: colors.surfaceAlt, borderRadius: 16 },
  footer: { padding: spacing.lg },
});
