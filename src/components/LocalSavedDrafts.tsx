import { useEffect, useState } from 'react';
import { ActivityIndicator, BackHandler, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { colors, spacing, typography } from '../design-tokens';
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
      <Text style={styles.title}>Bản nháp đã lưu</Text>
      <Text style={styles.caption}>Trên thiết bị · Chưa xác thực kết nối</Text>
    </View>
    <FlatList data={rows} keyExtractor={row => row.key} contentContainerStyle={styles.content}
      ListHeaderComponent={<Text style={styles.notice}>Chỉ xem bản nháp của phiên đã lưu. Kết nối lại để kiểm tra phân công, đối soát và tiếp tục gửi.</Text>}
      ListEmptyComponent={loading ? <ActivityIndicator color={colors.primary}/> :
        <Text accessibilityLiveRegion="polite" style={styles.body}>{error
          ? 'Chưa đọc được bản lưu. Dữ liệu vẫn được giữ trên máy.'
          : 'Không đọc thấy bản nháp khớp phiên này. Dữ liệu phiên cũ vẫn được giữ, cần kết nối lại để kiểm tra.'}</Text>}
      renderItem={({item}) => <View style={styles.card}>
        <Text style={styles.reference}>{role === 'REPAIR_CREW' ? 'Nhiệm vụ' : 'Nháp phản ánh'} {item.reference}</Text>
        {item.description ? <Text style={styles.body}>{item.description}</Text> : null}
        <Text style={styles.body}>{item.photoCount} ảnh{role === 'REPAIR_CREW' ? ` · ${item.measurementCount} số đo` : ''}</Text>
        <Text style={styles.caption}>{item.hasCommand ? 'Có lệnh đã lưu · Cần đối soát khi kết nối lại' : 'Bản nháp cục bộ · Chưa gửi'}</Text>
        <Text style={styles.caption}>Đã lưu {new Date(item.updatedAt).toLocaleString('vi-VN')}</Text>
      </View>}/>
    <View style={styles.footer}><Button variant="secondary" title="Quay lại kết nối" onPress={onClose}/></View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: {flex: 1, width: '100%', backgroundColor: colors.surface},
  header: {padding: spacing.md, gap: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border},
  title: {...typography.titleMd, color: colors.neutral},
  body: {...typography.bodyMd, color: colors.secondary},
  caption: {...typography.caption, color: colors.secondary},
  reference: {...typography.labelLg, color: colors.neutral},
  content: {padding: spacing.md, gap: spacing.md},
  notice: {...typography.bodyMd, color: colors.secondary, backgroundColor: colors.surfaceAlt, padding: spacing.md, borderRadius: 8},
  card: {padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: 12},
  footer: {padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border},
});
