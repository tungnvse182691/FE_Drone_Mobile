import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, radius, spacing, typography } from '../design-tokens';
import { useAuthStore } from '../store/auth';
import { loadLocalDraftSummaries, type LocalDraftReadIdentity, type LocalDraftSummary } from '../offline/localDraftRead';

/** An isolated local inspection surface. Does not mount role routes or dispatch. */
export function LocalSavedDrafts({ role, onClose }: {role: LocalDraftReadIdentity['role']; onClose: () => void}) {
  const owner = useAuthStore(state => state.user);
  const [rows, setRows] = useState<LocalDraftSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    const unsubscribe = useAuthStore.subscribe(() => { active = false; setRows([]); onClose(); });
    const back = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    void (async () => {
      try {
        const identity = await useAuthStore.getState().localDraftReadIdentity(role);
        if (!identity || !active) throw Error('local_session_changed');
        const saved = await loadLocalDraftSummaries(identity, () => active);
        if (active) setRows(saved);
      } catch { if (active) setError(true); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; unsubscribe(); back.remove(); };
  }, [role, owner, onClose]);
  return <SafeAreaView style={styles.root}>
    <View style={styles.header}>
      <View style={styles.localLabel}>
        <MaterialIcons name="phone-android" size={16} color={colors.secondary} importantForAccessibility="no" />
        <Text style={styles.caption}>Chỉ xem trên thiết bị</Text>
      </View>
      <Text accessibilityRole="header" style={styles.title}>Bản nháp đã lưu</Text>
      <Text style={styles.body}>Kết nối lại để kiểm tra và tiếp tục gửi.</Text>
    </View>
    <FlatList data={rows} keyExtractor={row => row.key} contentContainerStyle={styles.content}
      ListEmptyComponent={<View style={styles.empty} accessibilityLiveRegion="polite">
        {loading ? <ActivityIndicator color={colors.brandGold} /> :
          <View style={styles.stateIcon}>
            <MaterialIcons name={error ? 'error-outline' : 'drafts'} size={28} color={colors.secondary} importantForAccessibility="no" />
          </View>}
        <Text style={styles.stateTitle}>{loading ? 'Đang đọc bản nháp' : error
          ? 'Chưa đọc được bản lưu' : 'Chưa tìm thấy bản nháp của phiên này'}</Text>
        <Text style={styles.body}>{loading ? 'Đang kiểm tra dữ liệu trên thiết bị.' : error
          ? 'Dữ liệu vẫn được giữ trên máy. Quay lại kết nối để thử lại.'
          : 'Dữ liệu phiên cũ vẫn được giữ trên máy. Kết nối lại để kiểm tra.'}</Text>
      </View>}
      ListFooterComponent={<View style={styles.footer}>
        <Text style={styles.caption}>Cần xác thực phiên trước khi gửi dữ liệu.</Text>
        <Button variant="secondary" title="Quay lại kết nối" onPress={onClose}
          icon={<MaterialIcons name="arrow-back" size={20} color={colors.secondary} importantForAccessibility="no" />} />
      </View>}
      renderItem={({item}) => <View style={styles.card}>
        <Text style={styles.reference}>{role === 'REPAIR_CREW' ? 'Nhiệm vụ' : 'Nháp phản ánh'} {item.reference}</Text>
        {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
        <Text style={styles.body}>{item.photoCount} ảnh{role === 'REPAIR_CREW' ? ` · ${item.measurementCount} số đo` : ''}</Text>
        <Text style={styles.caption}>{item.hasCommand ? 'Có lệnh đã lưu · Cần đối soát khi kết nối lại' : 'Bản nháp cục bộ · Chưa gửi'}</Text>
        <Text style={styles.caption}>Đã lưu {new Date(item.updatedAt).toLocaleString('vi-VN')}</Text>
      </View>}/>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: {flex: 1, width: '100%', backgroundColor: colors.surfaceAlt},
  header: {padding: spacing.lg, paddingBottom: spacing.sm, gap: spacing.sm},
  localLabel: {flexDirection: 'row', alignItems: 'center', gap: spacing.xs},
  title: {...typography.titleLg, color: colors.neutral},
  body: {...typography.bodyMd, color: colors.secondary},
  caption: {...typography.caption, color: colors.secondary},
  reference: {...typography.labelLg, color: colors.neutral},
  content: {padding: spacing.lg, gap: spacing.md},
  empty: {padding: spacing.lg, gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border},
  stateIcon: {alignSelf: 'flex-start', marginBottom: spacing.sm},
  stateTitle: {...typography.titleMd, color: colors.neutral},
  card: {padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 12},
  footer: {gap: spacing.md, paddingTop: spacing.sm},
});
