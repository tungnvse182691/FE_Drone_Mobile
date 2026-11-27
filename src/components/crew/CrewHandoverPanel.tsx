import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clipboard, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../design-tokens';
import { Card } from '../Card';
import { Button } from '../Button';
import { CrewPressable as Pressable } from './CrewMotion';
import { isCrewResourceId, listCrewProjectsReal } from '../../api/crewApi';
import { openOfflineJournal, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { inspectOfflineDevice } from '../../api/crewOfflineDevice';
import {
  listOfflineCollection,
  type OfflineGrantSummary,
} from '../../api/crewOfflineWorkflow';
import {
  exportPublicRecipientCard,
  handoverErrorMessage,
  inspectAndOpenHandoverPackage,
  parsePublicRecipientCard,
  prepareHandoverImport,
  prepareHandoverPackageExport,
  sendHandoverImportIntent,
  sendHandoverPackageExport,
  type HandoverOpenedPackage,
} from '../../api/crewOfflineHandover';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';

function batchTitle(record: OfflineJournalRecord): string {
  try {
    const parsed = JSON.parse(record.body) as { operations?: { kind?: string; taskId?: string }[] };
    const ops = parsed.operations ?? [];
    const first = ops[0];
    const shortTask = first?.taskId && isCrewResourceId(first.taskId) ? first.taskId.slice(0, 8) : 'task';
    return `${ops.length} thao tác · ${first?.kind ?? 'OFFLINE'} (${shortTask})`;
  } catch {
    return `Gói ký (${record.id.slice(0, 8)})`;
  }
}

export function CrewHandoverPanel({ identity, refreshSignal = 0 }: { identity: QueueIdentity; refreshSignal?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<{ id: string; label: string }[]>([]);
  const [batches, setBatches] = useState<OfflineJournalRecord[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [publicCardJson, setPublicCardJson] = useState('');
  const [senderSigningKey, setSenderSigningKey] = useState('');
  const [recipientCardInput, setRecipientCardInput] = useState('');
  const [exportedPackageId, setExportedPackageId] = useState('');
  const [grants, setGrants] = useState<OfflineGrantSummary[]>([]);
  const [packageIdInput, setPackageIdInput] = useState('');
  const [grantIdInput, setGrantIdInput] = useState('');
  const [trustedSenderInput, setTrustedSenderInput] = useState('');
  const [localEnvelopeInput, setLocalEnvelopeInput] = useState('');
  const [openedPackage, setOpenedPackage] = useState<HandoverOpenedPackage | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const mounted = useRef(true);
  const running = useRef(false);
  const sequence = useRef(0);

  const loadLocal = useCallback(async () => {
    if (!sameQueueIdentity(identity)) return;
    const seq = ++sequence.current;
    try {
      const rows = await (await openOfflineJournal(identity)).list();
      if (!mounted.current || seq !== sequence.current || !sameQueueIdentity(identity)) return;
      const batchRows = rows.filter(
        (r) =>
          r.proof.kind === 'signed-field-batch' &&
          r.identity.actor === identity.actor &&
          sameQueueIdentity(r.identity, identity),
      );
      setBatches(batchRows);
      if (batchRows.length > 0 && !batchRows.some((b) => b.id === selectedBatchId)) {
        setSelectedBatchId(batchRows[batchRows.length - 1].id);
      }

      const knownIds = new Set<string>(rows.map((r) => r.projectId).filter((id) => isCrewResourceId(id)));
      const list = Array.from(knownIds).map((id) => ({ id, label: `Dự án ${id.slice(0, 8)}` }));
      try {
        const apiProjects = await listCrewProjectsReal({ limit: 25 });
        for (const p of apiProjects.items ?? []) {
          if (isCrewResourceId(p.projectId) && !knownIds.has(p.projectId)) {
            knownIds.add(p.projectId);
            list.push({ id: p.projectId, label: p.name ? `${p.name} (${p.projectId.slice(0, 8)})` : `Dự án ${p.projectId.slice(0, 8)}` });
          } else if (p.name) {
            const existing = list.find((x) => x.id === p.projectId);
            if (existing) existing.label = `${p.name} (${p.projectId.slice(0, 8)})`;
          }
        }
      } catch {
        /* Offline or unavailable: keep journal project IDs without failing render. */
      }
      if (!mounted.current || seq !== sequence.current || !sameQueueIdentity(identity)) return;
      setProjects(list);
      if (!projectId && list.length > 0) {
        setProjectId(list[0].id);
      }
    } catch {
      /* Preserve existing view on transient read failure. */
    }
  }, [identity, projectId, selectedBatchId]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (refreshSignal > 0) void loadLocal();
  }, [loadLocal, refreshSignal]);

  useFocusEffect(
    useCallback(() => {
      void loadLocal();
    }, [loadLocal]),
  );

  if (!sameQueueIdentity(identity)) return null;

  const runAction = async (fn: () => Promise<void>) => {
    if (running.current || !sameQueueIdentity(identity)) return;
    running.current = true;
    setBusy(true);
    setErrorMessage('');
    setStatusMessage('');
    const seq = ++sequence.current;
    try {
      await fn();
    } catch (error) {
      if (mounted.current && seq === sequence.current && sameQueueIdentity(identity)) {
        setErrorMessage(handoverErrorMessage(error));
      }
    } finally {
      running.current = false;
      if (mounted.current && sameQueueIdentity(identity)) {
        setBusy(false);
      }
    }
  };

  const handleExportPublicCard = () =>
    void runAction(async () => {
      if (!isCrewResourceId(projectId)) {
        throw Error('offline_project_source_required');
      }
      const json = await exportPublicRecipientCard(identity, projectId);
      const parsed = parsePublicRecipientCard(json);
      if (!mounted.current || !sameQueueIdentity(identity)) return;
      setPublicCardJson(json);
      setSenderSigningKey(parsed.signingPublicKey);
      setStatusMessage('Đã tạo thẻ thiết bị công khai (không chứa khóa bí mật).');
    });

  const handleExportPackage = () =>
    void runAction(async () => {
      const targetBatch = batches.find((b) => b.id === selectedBatchId);
      if (!targetBatch) throw Error('handover_source_batch_invalid');
      const card = parsePublicRecipientCard(recipientCardInput.trim());
      const prepared = await prepareHandoverPackageExport(identity, targetBatch.projectId, targetBatch, [card]);
      const reconciled = await sendHandoverPackageExport(prepared, identity, [card]);
      const pkgId = String(reconciled.proof.packageId ?? '');
      const probe = await inspectOfflineDevice(identity);
      const cardSelf = await exportPublicRecipientCard(identity, targetBatch.projectId);
      const selfParsed = parsePublicRecipientCard(cardSelf);
      if (!mounted.current || !sameQueueIdentity(identity)) return;
      setExportedPackageId(pkgId);
      setSenderSigningKey(selfParsed.signingPublicKey);
      if (probe.deviceId) {
        setStatusMessage(`Đã đóng gói & xuất gói bàn giao ${pkgId.slice(0, 8)} lên máy chủ.`);
      }
    });

  const handleDiscoverGrants = () =>
    void runAction(async () => {
      if (!isCrewResourceId(projectId)) throw Error('offline_project_source_required');
      const page = await listOfflineCollection<OfflineGrantSummary>(identity, projectId, 'grants', { limit: 25 });
      if (!mounted.current || !sameQueueIdentity(identity)) return;
      setGrants(page.items);
      const active = page.items.find((g) => !g.revokedAt && Date.parse(g.expiresAt) > Date.now());
      if (active) {
        setGrantIdInput(active.id);
        setPackageIdInput(active.packageId);
      }
      setStatusMessage(
        page.items.length > 0
          ? `Tìm thấy ${page.items.length} ủy quyền bàn giao trong dự án.`
          : 'Chưa có ủy quyền bàn giao nào trong dự án.',
      );
    });

  const handleInspectPackage = () =>
    void runAction(async () => {
      if (!isCrewResourceId(projectId)) throw Error('offline_project_source_required');
      const opened = await inspectAndOpenHandoverPackage(
        identity,
        projectId,
        packageIdInput.trim(),
        grantIdInput.trim(),
        trustedSenderInput.trim(),
        localEnvelopeInput.trim() || undefined,
      );
      if (!mounted.current || !sameQueueIdentity(identity)) return;
      setOpenedPackage(opened);
      setStatusMessage(
        `Đã giải mã & xác minh ${opened.operations.length} thao tác hợp lệ từ tác giả gốc ${opened.packageDetail.originalActorId.slice(0, 8)}.`,
      );
    });

  const handleImportPackage = () =>
    void runAction(async () => {
      if (!openedPackage) throw Error('handover_package_mismatch');
      const prepared = await prepareHandoverImport(identity, openedPackage.projectId, openedPackage);
      const result = await sendHandoverImportIntent(prepared, identity);
      if (!mounted.current || !sameQueueIdentity(identity)) return;
      if (result.phase === 'RECONCILED') {
        setStatusMessage(
          `Đã nhập bàn giao thành công (${result.verifiedItems?.length ?? openedPackage.operations.length} thao tác đã đối soát).`,
        );
      } else if (result.terminalItems?.length) {
        setStatusMessage('Có thao tác bị từ chối khi đối soát nhập bàn giao; dữ liệu được giữ để kiểm tra.');
      } else {
        setStatusMessage('Đã gửi nhập bàn giao; còn thao tác chờ xác minh hoặc bổ sung.');
      }
      if(result.phase==='RECONCILED'||result.terminalItems?.length)setOpenedPackage(null);
    });

  return (
    <Card style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Bàn giao dữ liệu mã hóa"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((v) => !v)}
        style={styles.headerToggle}
      >
        <View style={styles.headerTextWrap}>
          <Text style={[typography.titleMd, styles.headerTitle]}>Bàn giao dữ liệu mã hóa (42A)</Text>
          <Text style={styles.caption}>Xuất gói mã hóa đầu cuối &amp; nhập gói theo ủy quyền giám sát viên</Text>
        </View>
        <MaterialIcons name={expanded ? 'expand-less' : 'expand-more'} size={22} color={colors.secondary} />
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          {errorMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {errorMessage}
            </Text>
          ) : null}
          {statusMessage && !errorMessage ? (
            <Text accessibilityLiveRegion="polite" style={styles.status}>
              {statusMessage}
            </Text>
          ) : null}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Dự án &amp; Thẻ thiết bị công khai</Text>
            {projects.length > 0 ? (
              <View style={styles.chipRow}>
                {projects.map((p) => {
                  const active = p.id === projectId;
                  return (
                    <Pressable
                      key={p.id}
                      accessibilityRole="button"
                      onPress={() => setProjectId(p.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <TextInput
              accessibilityLabel="Mã dự án bàn giao"
              placeholder="UUID dự án (nếu chưa có trong danh sách)"
              value={projectId}
              onChangeText={setProjectId}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Button title="Tạo thẻ thiết bị công khai" variant="secondary" disabled={busy} onPress={handleExportPublicCard} />
            {publicCardJson ? (
              <View style={styles.infoBox}>
                <Text style={styles.caption} numberOfLines={3}>
                  {publicCardJson}
                </Text>
                <View style={styles.actionRow}>
                  <Button
                    title="Sao chép thẻ thiết bị"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => {
                      Clipboard.setString(publicCardJson);
                      setStatusMessage('Đã sao chép thẻ thiết bị công khai.');
                    }}
                  />
                  <Button
                    title="Chia sẻ thẻ"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => void Share.share({ message: publicCardJson })}
                  />
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Xuất gói mã hóa cho đồng nghiệp</Text>
            {batches.length === 0 ? (
              <Text style={styles.caption}>Chưa có gói thao tác đã ký trên thiết bị để xuất bàn giao.</Text>
            ) : (
              <View style={styles.chipRow}>
                {batches.map((b) => {
                  const active = b.id === selectedBatchId;
                  return (
                    <Pressable
                      key={b.id}
                      accessibilityRole="button"
                      onPress={() => setSelectedBatchId(b.id)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{batchTitle(b)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <TextInput
              accessibilityLabel="Thẻ thiết bị người nhận"
              placeholder="Dán JSON thẻ thiết bị công khai của người nhận"
              value={recipientCardInput}
              onChangeText={setRecipientCardInput}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.multiline]}
            />
            <Button
              title="Dán thẻ từ bộ nhớ tạm"
              variant="secondary"
              disabled={busy}
              onPress={async () => {
                const raw = (await Clipboard.getString()).trim();
                if (raw) {
                  setRecipientCardInput(raw);
                  setStatusMessage('Đã dán thẻ thiết bị từ bộ nhớ tạm.');
                }
              }}
            />
            <Button
              title="Đóng gói & Xuất bàn giao"
              variant="secondary"
              disabled={busy || batches.length === 0}
              onPress={handleExportPackage}
            />
            {exportedPackageId ? (
              <View style={styles.infoBox}>
                <Text style={styles.caption}>Mã gói: {exportedPackageId}</Text>
                <View style={styles.actionRow}>
                  <Button
                    title="Sao chép mã gói"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => {
                      Clipboard.setString(exportedPackageId);
                      setStatusMessage('Đã sao chép mã gói bàn giao.');
                    }}
                  />
                  {senderSigningKey ? (
                    <Button
                      title="Sao chép khóa ký nguồn"
                      variant="secondary"
                      disabled={busy}
                      onPress={() => {
                        Clipboard.setString(senderSigningKey);
                        setStatusMessage('Đã sao chép khóa ký công khai nguồn.');
                      }}
                    />
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Nhận &amp; Nhập gói bàn giao</Text>
            <Button title="Tải ủy quyền từ máy chủ" variant="secondary" disabled={busy} onPress={handleDiscoverGrants} />
            {grants.length > 0 ? (
              <View style={styles.chipRow}>
                {grants.map((g) => {
                  const active = g.id === grantIdInput;
                  const state = g.revokedAt ? 'Đã thu hồi' : Date.parse(g.expiresAt) <= Date.now() ? 'Hết hạn' : 'Còn hiệu lực';
                  return (
                    <Pressable
                      key={g.id}
                      accessibilityRole="button"
                      onPress={() => {
                        setGrantIdInput(g.id);
                        setPackageIdInput(g.packageId);
                      }}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {g.id.slice(0, 8)} · {state}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <TextInput
              accessibilityLabel="Mã gói bàn giao"
              placeholder="Mã gói (packageId UUID)"
              value={packageIdInput}
              onChangeText={setPackageIdInput}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Mã ủy quyền bàn giao"
              placeholder="Mã ủy quyền (grantId UUID)"
              value={grantIdInput}
              onChangeText={setGrantIdInput}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              accessibilityLabel="Khóa ký công khai để đối chiếu"
              placeholder="Khóa ký công khai để đối chiếu (tùy chọn)"
              value={trustedSenderInput}
              onChangeText={setTrustedSenderInput}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Button
              title="Dán khóa ký nguồn"
              variant="secondary"
              disabled={busy}
              onPress={async () => {
                const raw = (await Clipboard.getString()).trim();
                if (raw) {
                  setTrustedSenderInput(raw);
                  setStatusMessage('Đã dán khóa ký công khai nguồn.');
                }
              }}
            />
            <TextInput
              accessibilityLabel="Dữ liệu gói mã hóa cục bộ (tuỳ chọn)"
              placeholder="JSON gói mã hóa cục bộ (tuỳ chọn, bỏ trống để lấy từ máy chủ)"
              value={localEnvelopeInput}
              onChangeText={setLocalEnvelopeInput}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, styles.multiline]}
            />
            <Button title="Giải mã & Kiểm tra gói" variant="secondary" disabled={busy} onPress={handleInspectPackage} />
            {openedPackage ? (
              <View style={styles.infoBox}>
                <Text style={styles.caption}>
                  Tác giả gốc: {openedPackage.packageDetail.originalActorId} · {openedPackage.operations.length} thao tác · Hạn ủy quyền:{' '}
                  {new Date(openedPackage.grantDetail.expiresAt).toLocaleString('vi-VN')}
                </Text>
                <Button title="Ký xác nhận & Nhập bàn giao" variant="primary" disabled={busy} onPress={handleImportPackage} />
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: '#DCE2E7', borderRadius: radius.lg, marginBottom: spacing.md, gap: spacing.sm },
  headerToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, gap: spacing.sm },
  headerTextWrap: { flex: 1, gap: 2 },
  headerTitle: { color: '#192D40', fontSize: 16, lineHeight: 22 },
  caption: { ...typography.caption, color: colors.secondary },
  body: { gap: spacing.md, borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm },
  section: { gap: spacing.xs },
  sectionTitle: { ...typography.labelLg, color: '#192D40' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: '#192D40',
    backgroundColor: '#FFFFFF',
    minHeight: 44,
    ...typography.caption,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: colors.surfaceAlt,
  },
  chipActive: { borderColor: colors.brandGold, backgroundColor: '#FEF9E7' },
  chipText: { ...typography.caption, color: colors.secondary },
  chipTextActive: { color: '#6B5219', fontWeight: '600' },
  infoBox: { gap: spacing.xs, backgroundColor: colors.surfaceAlt, padding: spacing.sm, borderRadius: radius.md },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  error: { ...typography.caption, color: colors.error },
  status: { ...typography.caption, color: colors.success },
});
