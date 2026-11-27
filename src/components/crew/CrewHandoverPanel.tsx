import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clipboard, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../../design-tokens';
import { Card } from '../Card';
import { Button } from '../Button';
import { CrewPressable as Pressable } from './CrewMotion';
import { isCrewResourceId, listCrewProjectsReal } from '../../api/crewApi';
import { openOfflineJournal, sameOfflinePartition, type OfflineJournalRecord } from '../../api/crewOfflineJournal';
import { listOfflineCollection, type OfflineGrantSummary } from '../../api/crewOfflineWorkflow';
import {
  exportPublicRecipientCard,
  handoverErrorMessage,
  inspectAndOpenHandoverPackage,
  listHandoverSourceBatches,
  parsePublicRecipientCard,
  prepareHandoverImport,
  prepareHandoverPackageExport,
  sendHandoverImportIntent,
  sendHandoverPackageExport,
  type HandoverOpenedPackage,
  type OfflinePublicRecipientCard,
} from '../../api/crewOfflineHandover';
import { sameQueueIdentity, type QueueIdentity } from '../../offline/upload-queue';
import { publishCrewHandoverChange } from '../../store/crewHandoverRefresh';

type Direction = 'send' | 'receive';
type GrantSelection = { packageId: string; grantId: string };
const activeWrites = new Set<string>();
const grantIsActive = (grant: OfflineGrantSummary) => !grant.revokedAt && Date.parse(grant.expiresAt) > Date.now();
const formatDate = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('vi-VN') : '';

function batchOperations(record: OfflineJournalRecord) {
  try {
    const { operations } = JSON.parse(record.body) as {
      operations?: { snapshotId?: string; claimedFinishedAt?: string; fieldStart?: { claimedAt?: string } }[];
    };
    return Array.isArray(operations) ? operations : [];
  } catch { return []; }
}

function batchDate(record: OfflineJournalRecord) {
  const times = batchOperations(record).flatMap(operation => [operation.claimedFinishedAt, operation.fieldStart?.claimedAt])
    .map(value => Date.parse(value ?? '')).filter(Number.isFinite);
  return times.length ? formatDate(new Date(Math.max(...times)).toISOString()) : undefined;
}

function batchTitle(record: OfflineJournalRecord, rows: OfflineJournalRecord[]) {
  const operations = batchOperations(record);
  const codes = new Set<string>();
  for (const operation of operations) {
    const source = rows.find(row => row.projectId === record.projectId && row.proof.kind === 'snapshot' &&
      (row.receipt as { id?: string })?.id === operation.snapshotId);
    const snapshot = (source?.receipt as { snapshot?: { taskCode?: string; instructions?: string } })?.snapshot;
    const code = snapshot?.taskCode || snapshot?.instructions?.match(/^([A-Z0-9][A-Z0-9_-]{2,24}):/)?.[1];
    if (code) codes.add(code);
  }
  return `${[...codes].join(', ') || 'Hồ sơ hiện trường'} · ${operations.length} thao tác`;
}

function retainedExport(rows: OfflineJournalRecord[], identity: QueueIdentity, batch: OfflineJournalRecord, card: OfflinePublicRecipientCard) {
  return rows.find(row => {
    if (!sameOfflinePartition(row.identity, identity) || row.projectId !== batch.projectId || row.proof.kind !== 'handover-export' ||
        row.proof.sourceBatchIntentId !== batch.id) return false;
    const wraps = (JSON.parse(row.body) as { package?: { recipients?: { actorId: string; deviceId: string; recipientKeyFingerprint: string }[] } }).package?.recipients;
    return wraps?.length === 1 && wraps[0].actorId === card.actorId && wraps[0].deviceId === card.deviceId &&
      wraps[0].recipientKeyFingerprint === card.keyFingerprint;
  });
}

export function CrewHandoverPanel({ identity, onSupportInputFocus }: { identity: QueueIdentity; onSupportInputFocus: () => void }) {
  const [direction, setDirection] = useState<Direction | null>(null);
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState<{ id: string; label: string }[]>([]);
  const [projectPicker, setProjectPicker] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [manualProject, setManualProject] = useState('');
  const [rows, setRows] = useState<OfflineJournalRecord[]>([]);
  const [batches, setBatches] = useState<OfflineJournalRecord[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [showAllBatches, setShowAllBatches] = useState(false);
  const [publicCardJson, setPublicCardJson] = useState('');
  const [recipientCard, setRecipientCard] = useState<OfflinePublicRecipientCard | null>(null);
  const [exported, setExported] = useState<OfflineJournalRecord | null>(null);
  const [grants, setGrants] = useState<OfflineGrantSummary[] | null>(null);
  const [grantCursor, setGrantCursor] = useState<string | null>(null);
  const [selection, setSelection] = useState<GrantSelection | null>(null);
  const [packageIdInput, setPackageIdInput] = useState('');
  const [grantIdInput, setGrantIdInput] = useState('');
  const [openedPackage, setOpenedPackage] = useState<HandoverOpenedPackage | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);
  const focused = useRef(false);
  const running = useRef(false);
  const sequence = useRef(0);

  const loadLocal = useCallback(async () => {
    const seq = ++sequence.current;
    const active = () => focused.current && seq === sequence.current && sameQueueIdentity(identity);
    setLoading(true);
    setErrorMessage('');
    try {
      const local = await (await openOfflineJournal(identity)).list();
      if (!active()) return;
      const labels = new Map<string, string>();
      for (const row of local) {
        if (isCrewResourceId(row.projectId) && sameOfflinePartition(row.identity, identity) && !labels.has(row.projectId)) {
          labels.set(row.projectId, `Dự án đã lưu ${labels.size + 1}`);
        }
      }
      const [source, availableProjects] = await Promise.allSettled([
        local.some(row => row.proof.kind === 'signed-field-batch') ? listHandoverSourceBatches(identity, local) : Promise.resolve([]),
        listCrewProjectsReal({ limit: 25 }),
      ]);
      if (!active()) return;
      if (availableProjects.status === 'fulfilled') {
        for (const project of availableProjects.value.items ?? []) {
          if (isCrewResourceId(project.projectId)) labels.set(project.projectId, project.name?.trim() || labels.get(project.projectId) || `Dự án ${labels.size + 1}`);
        }
      }
      if (source.status === 'fulfilled') setBatches(source.value);
      else {
        setBatches([]);
        setErrorMessage('Chưa đọc được hồ sơ đã ký trên thiết bị. Hãy tải lại danh sách.');
      }
      const list = Array.from(labels, ([id, label]) => ({ id, label }));
      setRows(local);
      setProjects(list);
      setProjectId(previous => previous || (list.length === 1 ? list[0].id : ''));
      if (!list.length && availableProjects.status === 'rejected') setErrorMessage('Chưa tải được danh sách dự án. Hãy kiểm tra kết nối rồi thử lại.');
    } catch {
      if (active()) setErrorMessage('Chưa đọc được dữ liệu bàn giao trên thiết bị. Hãy tải lại.');
    } finally {
      if (active()) setLoading(false);
    }
  }, [identity]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    if (!running.current) void loadLocal();
    return () => { focused.current = false; sequence.current++; };
  }, [loadLocal]));

  if (identity.role !== 'REPAIR_CREW' || !sameQueueIdentity(identity)) return null;

  const sessionActive = () => sameQueueIdentity(identity);
  const active = () => mounted.current && sessionActive();
  const reset = () => {
    setSelectedBatchId('');
    setShowAllBatches(false);
    setRecipientCard(null);
    setPublicCardJson('');
    setExported(null);
    setGrants(null);
    setGrantCursor(null);
    setSelection(null);
    setPackageIdInput('');
    setGrantIdInput('');
    setOpenedPackage(null);
    setStatusMessage('');
    setErrorMessage('');
    setAdvanced(false);
  };
  const selectProject = (id: string) => {
    if (running.current || !active()) return;
    if (id !== projectId) reset();
    setProjectId(id);
    setManualProject('');
    setProjectPicker(false);
  };
  const selectDirection = (next: Direction) => {
    if (running.current || !active()) return;
    reset();
    setDirection(next);
  };
  const selectGrant = (next: GrantSelection | null) => {
    setSelection(next);
    setOpenedPackage(null);
    setStatusMessage('');
    setErrorMessage('');
  };
  const runAction = async (fn: () => Promise<void>, write = false) => {
    if (running.current || loading || !active()) return;
    const writeScope = JSON.stringify([identity.environment, identity.actor, identity.partition]);
    if (write && activeWrites.has(writeScope)) {
      setErrorMessage('Thiết bị đang xử lý một hồ sơ bàn giao. Vui lòng chờ rồi thử lại.');
      return;
    }
    if (write) activeWrites.add(writeScope);
    running.current = true;
    setBusy(true);
    setErrorMessage('');
    setStatusMessage('');
    try { await fn(); }
    catch (error) { if (active()) setErrorMessage(handoverErrorMessage(error)); }
    finally {
      if (write) {
        activeWrites.delete(writeScope);
        publishCrewHandoverChange(identity);
      }
      running.current = false;
      if (active()) setBusy(false);
    }
  };

  const handlePasteCard = () => void runAction(async () => {
    const raw = await Clipboard.getString();
    if (!active()) return;
    setRecipientCard(null);
    setExported(null);
    setRecipientCard(parsePublicRecipientCard(raw.trim()));
  });
  const handleExportPackage = () => void runAction(async () => {
    const batch = batches.find(row => row.id === selectedBatchId && row.projectId === projectId);
    if (!batch || !recipientCard) return;
    const local = await (await openOfflineJournal(identity)).list();
    if (!sessionActive()) return;
    const currentlyEligible = await listHandoverSourceBatches(identity, local);
    if (!sessionActive()) return;
    if (!currentlyEligible.some(row => row.id === batch.id)) throw Error('handover_source_batch_invalid');
    const prepared = retainedExport(local, identity, batch, recipientCard) ??
      await prepareHandoverPackageExport(identity, projectId, batch, [recipientCard]);
    if (!sessionActive()) return;
    const result = await sendHandoverPackageExport(prepared, identity, [recipientCard]);
    if (!active()) return;
    setExported(result);
    setStatusMessage('Đã lưu gói mã hóa lên máy chủ. Giám sát viên cấp ủy quyền để người nhận truy cập.');
  }, true);
  const handleCard = () => void runAction(async () => {
    const json = await exportPublicRecipientCard(identity, projectId);
    if (active()) setPublicCardJson(json);
  });
  const handleDiscoverGrants = (cursor?: string) => void runAction(async () => {
    if (!cursor) {
      setGrants(null);
      setGrantCursor(null);
    }
    selectGrant(null);
    // This read-only preflight verifies registration, session and the installed key pair.
    await exportPublicRecipientCard(identity, projectId);
    if (!active()) return;
    const page = await listOfflineCollection<OfflineGrantSummary>(identity, projectId, 'grants', { limit: 25, cursor });
    if (!active()) return;
    const validated = page.items.filter(item => item.projectId === projectId && isCrewResourceId(item.id) && isCrewResourceId(item.packageId));
    setGrants(previous => cursor ? [...new Map([...(previous ?? []), ...validated].map(item => [item.id, item])).values()] : validated);
    setGrantCursor(page.nextCursor);
  });
  const handleInspectPackage = (selected: GrantSelection) => void runAction(async () => {
    setOpenedPackage(null);
    const opened = await inspectAndOpenHandoverPackage(identity, projectId, selected.packageId, selected.grantId, '');
    if (!active()) return;
    const local = await (await openOfflineJournal(identity)).list();
    if (!active()) return;
    const existing = local.find(row => row.projectId === projectId && row.proof.kind === 'handover-import' &&
      row.proof.packageId === opened.packageDetail.id && row.proof.grantId === opened.grantDetail.id &&
      row.proof.registrationId === opened.localRegistrationId && row.proof.payloadHash === opened.packageDetail.payloadHash);
    if (existing?.phase === 'RECONCILED') setStatusMessage(`Máy chủ đã xác nhận ${existing.verifiedItems?.length ?? 0} thao tác trong gói này.`);
    else if (existing?.terminalItems?.length) setStatusMessage('Gói đã nhập có thao tác bị từ chối. Xem trạng thái trong màn Đồng bộ.');
    else setOpenedPackage(opened);
  });
  const handleImportPackage = () => void runAction(async () => {
    if (!openedPackage || openedPackage.projectId !== projectId || !grantIsActive(openedPackage.grantDetail)) return;
    const prepared = await prepareHandoverImport(identity, projectId, openedPackage);
    if (!sessionActive()) return;
    const result = await sendHandoverImportIntent(prepared, identity);
    if (!active()) return;
    if (result.phase === 'RECONCILED') {
      setStatusMessage(`Máy chủ đã xác nhận ${result.verifiedItems?.length ?? 0} thao tác trong gói bàn giao.`);
      setOpenedPackage(null);
    } else if (result.terminalItems?.length) {
      setStatusMessage('Có thao tác bị từ chối khi đối soát. Hồ sơ vẫn được giữ trên thiết bị.');
      setOpenedPackage(null);
    } else setStatusMessage('Đã gửi hồ sơ. Một số thao tác còn chờ xác minh hoặc bổ sung ảnh.');
  }, true);

  const projectBatches = batches.filter(batch => batch.projectId === projectId).reverse();
  const visibleBatches = showAllBatches ? projectBatches : projectBatches.slice(0, 4);
  const selectedBatch = projectBatches.find(batch => batch.id === selectedBatchId);
  const projectLabel = projects.find(project => project.id === projectId)?.label;
  const disabled = loading || busy;
  const selectedGrant = grants?.find(grant => grant.id === selection?.grantId && grant.packageId === selection.packageId);
  const openedActive = openedPackage && grantIsActive(openedPackage.grantDetail);
  const copy = (value: string, message: string) => {
    if (!active() || !value || disabled) return;
    Clipboard.setString(value);
    setStatusMessage(message);
  };
  const changeRecoveryCode = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setOpenedPackage(null);
  };

  return (
    <View style={styles.page}>
      <Card style={styles.card}>
        <Text style={styles.title}>Bàn giao hồ sơ đã ký</Text>
        <Text style={styles.caption}>Gói hồ sơ được mã hóa. Khi nhập, hệ thống vẫn ghi nhận người lập hồ sơ gốc.</Text>
        <View style={styles.choices}>
          <Choice label="Gửi hồ sơ" selected={direction === 'send'} disabled={disabled} onPress={() => selectDirection('send')} />
          <Choice label="Nhận hồ sơ" selected={direction === 'receive'} disabled={disabled} onPress={() => selectDirection('receive')} />
        </View>
      </Card>

      {loading ? <Text accessibilityLiveRegion="polite" style={styles.caption}>Đang tải dự án và hồ sơ…</Text> : null}
      {!loading && !projects.length && !projectId ? <Text style={styles.caption}>Chưa có dự án trong danh sách.</Text> : null}
      {direction || (!loading && !projects.length) ? (
        <Card style={styles.card}>
          <Text style={styles.title}>1. Chọn dự án</Text>
          <Choice label={projectLabel || (projectId ? 'Dự án từ hỗ trợ' : 'Chọn dự án')} icon={projectPicker ? 'expand-less' : 'expand-more'} disabled={disabled} onPress={() => setProjectPicker(value => !value)} />
          {projectPicker ? projects.map(project => <Choice key={project.id} label={project.label} selected={projectId === project.id} disabled={disabled} onPress={() => selectProject(project.id)} />) : null}
          {projectPicker || projects.length === 0 ? <Button title="Tải lại danh sách dự án" variant="text" disabled={disabled} onPress={() => void loadLocal()} /> : null}
        </Card>
      ) : null}

      {direction === 'send' && projectId ? (
        <Card style={styles.card}>
          <Text style={styles.title}>2. Chọn hồ sơ đã ký</Text>
          {visibleBatches.length ? visibleBatches.map(batch => (
            <Choice key={batch.id} label={batchTitle(batch, rows)} detail={batchDate(batch)} selected={selectedBatchId === batch.id} disabled={disabled} onPress={() => {
              setSelectedBatchId(batch.id); setExported(null); setStatusMessage('');
            }} />
          )) : <Text style={styles.caption}>Chưa có hồ sơ đã ký có thể bàn giao trong dự án. Nếu hồ sơ thuộc phiên trước, mở nhiệm vụ và xác nhận lại phiên.</Text>}
          {projectBatches.length > 4 && !showAllBatches ? <Button title={`Xem thêm ${projectBatches.length - 4} hồ sơ`} variant="text" disabled={disabled} onPress={() => setShowAllBatches(true)} /> : null}
          {selectedBatch ? <>
            <Text style={styles.title}>3. Thêm thiết bị nhận</Text>
            <Text style={styles.caption}>Sao chép thẻ do người nhận cung cấp để mã hóa gói cho thiết bị đó.</Text>
            <Button title={recipientCard ? 'Thay thẻ thiết bị nhận' : 'Dán thẻ thiết bị nhận'} variant="secondary" disabled={disabled} onPress={handlePasteCard} />
            {recipientCard ? <Text style={styles.caption}>Đã đọc thẻ thiết bị nhận.</Text> : null}
            {recipientCard && !exported ? <Button title="Tạo gói bàn giao" variant="primary" loading={busy} disabled={disabled} onPress={handleExportPackage} /> : null}
          </> : null}
        </Card>
      ) : null}

      {direction === 'receive' && projectId ? (
        <Card style={styles.card}>
          <Text style={styles.title}>2. Tìm ủy quyền nhận</Text>
          <Text style={styles.caption}>Cần ủy quyền của giám sát viên cho thiết bị này trong dự án.</Text>
          <Button title="Tìm hồ sơ được ủy quyền" variant="primary" disabled={disabled} onPress={() => handleDiscoverGrants()} />
          {grants?.length === 0 ? <Text style={styles.caption}>Chưa tìm thấy ủy quyền bàn giao trong dự án.</Text> : null}
          {grants?.map(grant => (
            <Choice key={grant.id} label={grant.revokedAt ? 'Ủy quyền đã thu hồi' : grantIsActive(grant) ? 'Ủy quyền còn hiệu lực' : 'Ủy quyền hết hạn'}
              detail={`Cấp ${formatDate(grant.issuedAt)} · Hạn ${formatDate(grant.expiresAt)}`}
              selected={selection?.grantId === grant.id} disabled={disabled || !grantIsActive(grant)}
              onPress={() => selectGrant({ packageId: grant.packageId, grantId: grant.id })} />
          ))}
          {grantCursor ? <Button title="Xem thêm ủy quyền" variant="text" disabled={disabled} onPress={() => handleDiscoverGrants(grantCursor)} /> : null}
          {selection && selectedGrant && grantIsActive(selectedGrant) && !openedPackage ? <Button title="Kiểm tra gói hồ sơ" variant="secondary" disabled={disabled} onPress={() => handleInspectPackage(selection)} /> : null}
          {openedPackage ? <>
            <Text style={styles.title}>3. Xác nhận nhập hồ sơ</Text>
            <Text style={styles.caption}>{openedPackage.operations.length} thao tác đã kiểm tra chữ ký · Hạn nhận {formatDate(openedPackage.grantDetail.expiresAt)}</Text>
            {openedActive ? <Button title="Ký xác nhận và nhập" variant="primary" disabled={disabled} loading={busy} onPress={handleImportPackage} /> : <Text style={styles.caption}>Ủy quyền đã hết hiệu lực. Tải lại danh sách để kiểm tra.</Text>}
          </> : null}
          <Text style={styles.caption}>Khi người gửi cần thẻ của thiết bị này, tạo thẻ và gửi cho người đó.</Text>
          {!publicCardJson ? <Button title="Tạo thẻ thiết bị của tôi" variant="text" disabled={disabled} onPress={handleCard} /> : <>
            <Button title="Sao chép thẻ thiết bị" variant="secondary" disabled={disabled} onPress={() => copy(publicCardJson, 'Đã sao chép thẻ thiết bị.')} />
            <Button title="Chia sẻ thẻ thiết bị" variant="text" disabled={disabled} onPress={() => void runAction(async () => { await Share.share({ message: publicCardJson }); })} />
          </>}
        </Card>
      ) : null}

      {busy ? <Text accessibilityLiveRegion="polite" style={styles.caption}>Đang xử lý hồ sơ…</Text> : null}
      {errorMessage ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errorMessage}</Text> : null}
      {statusMessage ? <Text accessibilityLiveRegion="polite" style={styles.status}>{statusMessage}</Text> : null}

      {direction ? <Card style={styles.card}>
        <Choice label="Hỗ trợ nâng cao" icon={advanced ? 'expand-less' : 'expand-more'} expanded={advanced} disabled={disabled} onPress={() => setAdvanced(value => !value)} />
        {advanced ? <>
          <Text style={styles.caption}>Dùng thông tin do người hỗ trợ cung cấp khi không tìm thấy trong danh sách.</Text>
          <SupportInput label="Mã dự án" value={manualProject} onChange={setManualProject} onFocus={onSupportInputFocus} disabled={disabled} />
          <Button title="Dùng mã dự án" variant="secondary" disabled={disabled || !isCrewResourceId(manualProject.trim())} onPress={() => selectProject(manualProject.trim())} />
          {direction === 'receive' && projectId ? <>
            <SupportInput label="Mã gói hồ sơ" value={packageIdInput} onChange={changeRecoveryCode(setPackageIdInput)} onFocus={onSupportInputFocus} disabled={disabled} />
            <SupportInput label="Mã ủy quyền" value={grantIdInput} onChange={changeRecoveryCode(setGrantIdInput)} onFocus={onSupportInputFocus} disabled={disabled} />
            <Button title="Kiểm tra gói theo mã" variant="secondary" disabled={disabled || !isCrewResourceId(packageIdInput.trim()) || !isCrewResourceId(grantIdInput.trim())} onPress={() => {
              const next = { packageId: packageIdInput.trim(), grantId: grantIdInput.trim() };
              selectGrant(next);
              handleInspectPackage(next);
            }} />
          </> : null}
          {direction === 'send' && exported ? <>
            <Button title="Sao chép mã gói" variant="secondary" disabled={disabled} onPress={() => copy(String(exported.proof.packageId ?? ''), 'Đã sao chép mã gói.')} />
          </> : null}
        </> : null}
      </Card> : null}
    </View>
  );
}

function Choice({ label, detail, selected, disabled, expanded, icon, onPress }: {
  label: string; detail?: string; selected?: boolean; disabled?: boolean; expanded?: boolean;
  icon?: 'expand-less' | 'expand-more'; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected, expanded }}
      disabled={disabled} onPress={onPress} style={[styles.choice, selected && styles.selected, disabled && styles.disabled]}>
      <View style={styles.choiceText}>
        <Text style={styles.label}>{label}</Text>
        {detail ? <Text style={styles.caption}>{detail}</Text> : null}
      </View>
      {icon || selected ? <MaterialIcons name={icon ?? 'check'} size={20} color={colors.secondary} /> : null}
    </Pressable>
  );
}

function SupportInput({ label, value, onChange, onFocus, disabled }: {
  label: string; value: string; onChange: (value: string) => void; onFocus: () => void; disabled: boolean;
}) {
  return <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput accessibilityLabel={label} editable={!disabled} value={value} onChangeText={onChange} onFocus={onFocus}
      autoCapitalize="none" autoCorrect={false} style={styles.input} />
  </View>;
}

const styles = StyleSheet.create({
  page: { gap: spacing.md },
  card: { gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg },
  title: { ...typography.titleMd, color: colors.neutral },
  caption: { ...typography.bodyMd, color: colors.secondary },
  label: { ...typography.labelLg, color: colors.neutral },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { minHeight: 48, flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  selected: { borderColor: colors.brandGold, backgroundColor: `${colors.brandGold}18` },
  disabled: { opacity: 0.65 },
  choiceText: { flexShrink: 1, flexGrow: 1, gap: spacing.xs },
  inputGroup: { gap: spacing.xs },
  input: { ...typography.bodyMd, minHeight: 48, padding: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, color: colors.neutral, backgroundColor: colors.surface },
  error: { ...typography.bodyMd, color: colors.error },
  status: { ...typography.bodyMd, color: colors.neutral },
});
