import { useOperatorReadScope } from '../../src/hooks/useOperatorReadScope';
import React, { useEffect, useRef, useState } from 'react';

import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { SafeAreaScreen } from '../../src/components/SafeAreaScreen';
import { operatorAppearance } from '../../src/components/drone/appearance';
import { RecordingDateTimeField } from '../../src/components/drone/RecordingDateTimeField';
import { Card } from '../../src/components/Card';
import { AnimatedPressable } from '../../src/components/AnimatedPressable';
import { Button } from '../../src/components/Button';
import { colors, radius, spacing, typography } from '../../src/design-tokens';
import { cancelOperatorUploadSession, orchestrateDroneUpload, operatorDatasetScope, readOperatorDatasetReadback, submitDroneDataset, replayDroneDataset, type DroneDatasetPlan } from '../../src/api/droneDatasetWorkflow';
import { openDroneUploadJournal, type DroneUploadIntent } from '../../src/api/droneTaskJournal';
import { getOperatorSurveyTaskDetailReal, listEligibleOperatorDronesReal, type EligibleDroneDto } from '../../src/api/droneApi';
import { openDroneLocalFiles, readDroneFileRange, type DroneLocalFile } from '../../src/api/droneLocalFiles';
import { openDroneSelectionJournal } from '../../src/api/droneSelectionJournal';
import { openOperatorUploadDraft } from '../../src/api/operatorUploadDraft';
import { useAuthStore } from '../../src/store/auth';

export default function DroneUploadScreen() {
  const params = useLocalSearchParams<{ code?: string; taskId?: string; projectId?: string }>();
  const scope = useOperatorReadScope(params.taskId ?? '');

  // File state (Video & SRT)
  const [videoName, setVideoName] = useState('Chưa chọn tệp');
  const [videoSize, setVideoSize] = useState('—');
  const [videoSha, setVideoSha] = useState('—');

  const [srtName, setSrtName] = useState('Chưa chọn tệp');
  const [srtSize, setSrtSize] = useState('—');
  const [srtSha, setSrtSha] = useState('—');

  // Upload workflow state: LOCAL -> QUEUED -> UPLOADING -> SERVER_CONFIRMED
  const [uploadStep, setUploadStep] = useState<'LOCAL' | 'QUEUED' | 'UPLOADING' | 'SERVER_CONFIRMED'>('LOCAL');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [transferPhase, setTransferPhase] = useState<'UPLOAD' | 'VERIFY' | null>(null);
  const [note, setNote] = useState('');
  const [statusMsg] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const sending = useRef(false);
  const pauseRequested = useRef(false);
  const [pausePending, setPausePending] = useState(false);
  const [uploadIntents, setUploadIntents] = useState<DroneUploadIntent[]>([]);
  const [videoFile, setVideoFile] = useState<DroneLocalFile | null>(null);
  const [telemetryFile, setTelemetryFile] = useState<DroneLocalFile | null>(null);
  const [recordedAt, setRecordedAt] = useState('');
  const [timeOffset, setTimeOffset] = useState('');
  const [draftMessage, setDraftMessage] = useState<string | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const savingDraft = useRef(false);
  const [journalReady, setJournalReady] = useState(false);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [pendingDataset, setPendingDataset] = useState<DroneUploadIntent | null>(null);
  const [received, setReceived] = useState(false);
  const [verifiedFiles, setVerifiedFiles] = useState<string[]>([]);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [srtUri, setSrtUri] = useState<string | null>(null);
  const [savedFiles, setSavedFiles] = useState<(DroneLocalFile & {availability: string})[]>([]);
  const [filesExpanded, setFilesExpanded] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [eligibleDrones, setEligibleDrones] = useState<EligibleDroneDto[]>([]);
  const [eligibleCursor, setEligibleCursor] = useState<string | null>(null);
  const [eligibleLoading, setEligibleLoading] = useState(false);
  const [eligibleError, setEligibleError] = useState<string | null>(null);
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const selectedDroneIdRef = useRef<string | null>(null);
  const [selectionProjectId, setSelectionProjectId] = useState<string | null>(params.projectId ?? null);
  const selectionJournalRef = useRef<Awaited<ReturnType<typeof openDroneSelectionJournal>> | null>(null);
  const selectionLoadedRef = useRef(false);
  const selectedDrone = eligibleDrones.find(item => item.id === selectedDroneId);
  const eligibleRequest = useRef(0);
  const [copying, setCopying] = useState(false);
  const picking = useRef(false);
  const mounted = useRef(true);
  const setSelectedDrone = (value: string | null) => {
    selectedDroneIdRef.current = value;
    setSelectedDroneId(value);
  };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const isCurrent = scope.capture();
    setSelectionProjectId(params.projectId ?? null);
    if (!params.taskId || params.projectId || !isCurrent()) return () => { active = false; };
    void getOperatorSurveyTaskDetailReal(params.taskId).then(detail => {
      const actor = useAuthStore.getState().user?.id;
      if (active && isCurrent() && detail.data.id === params.taskId && detail.data.operatorId === actor && detail.data.projectId) {
        setSelectionProjectId(detail.data.projectId);
      }
    }).catch(() => { /* selection remains unavailable until the task source is verified */ });
    return () => { active = false; };
  }, [params.taskId, params.projectId, scope.key, scope.capture]);

  useEffect(() => {
    let disposed = false;
    selectionLoadedRef.current = false;
    setSelectedDrone(null);
    selectionJournalRef.current?.close();
    selectionJournalRef.current = null;
    if (!params.taskId || !selectionProjectId || !scope.key) {
      selectionLoadedRef.current = true;
      return () => { disposed = true; };
    }
    void (async () => {
      try {
        const journal = await openDroneSelectionJournal(params.taskId!, selectionProjectId);
        if (disposed || !scope.capture()()) { journal.close(); return; }
        selectionJournalRef.current = journal;
        const saved = await journal.read();
        if (!disposed && scope.capture()()) setSelectedDrone(saved?.droneId ?? null);
      } catch (error) {
        if (!disposed && scope.capture()() && (error as Error).message !== 'drone_selection_session_changed') {
          setEligibleError('Chưa khôi phục được máy bay đã chọn trong phiên này. Hãy tải lại danh sách.');
        }
      } finally {
        if (!disposed) selectionLoadedRef.current = true;
      }
    })();
    return () => {
      disposed = true;
      selectionJournalRef.current?.close();
      selectionJournalRef.current = null;
    };
  }, [params.taskId, selectionProjectId, scope.key, scope.capture]);

  const refreshFiles = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || !params.taskId) return;
    let runtime: Awaited<ReturnType<typeof openDroneLocalFiles>> | undefined;
    try {
      runtime = await openDroneLocalFiles(params.taskId);
      if (!isCurrent()) return;
      const files = await runtime.list();
      if (isCurrent()) { setSavedFiles(files); setFileError(null); }
    } catch { if (isCurrent()) setFileError('Không đọc được tệp đã lưu. Dữ liệu cũ vẫn được giữ.'); }
    finally { runtime?.close(); }
  };
  const loadEligibleDrones = async (append = false) => {
    const isCurrent = scope.capture();
    if (!isCurrent() || !params.taskId || (append && !eligibleCursor)) return;
    const request = ++eligibleRequest.current;
    setEligibleLoading(true);
    setEligibleError(null);
    try {
      const page = await listEligibleOperatorDronesReal(params.taskId, append ? eligibleCursor : null, 25);
      if (!isCurrent() || request !== eligibleRequest.current) return;
      setEligibleDrones(previous => {
        const next = append ? [...previous, ...page.items] : page.items;
        const seen = new Set<string>();
        return next.filter(item => !seen.has(item.id) && seen.add(item.id));
      });
      setEligibleCursor(page.nextCursor);

      // A refresh starts at page one, but a saved selection may be on a later
      // page. Verify the selected id with bounded read-only traversal before
      // clearing it; absence from page one is not proof that the server revoked
      // the drone. Keep the visible cursor on page one so the existing “Tải
      // thêm” affordance remains intact.
      let selectedStillEligible = page.items.some(item => item.id === selectedDroneIdRef.current);
      let verifyCursor = page.nextCursor;
      let verifyPages = 0;
      const MAX_SELECTION_VERIFY_PAGES = 20;
      if (!append && selectionLoadedRef.current && selectedDroneIdRef.current) {
        while (verifyCursor && verifyPages < MAX_SELECTION_VERIFY_PAGES) {
          const verifyPage = await listEligibleOperatorDronesReal(params.taskId, verifyCursor, 25);
          if (!isCurrent() || request !== eligibleRequest.current) return;
          selectedStillEligible = selectedStillEligible || verifyPage.items.some(item => item.id === selectedDroneIdRef.current);
          verifyCursor = verifyPage.nextCursor;
          verifyPages += 1;
          if (selectedStillEligible || !verifyCursor) break;
        }
      }
      if (!append && selectionLoadedRef.current && selectedDroneIdRef.current &&
          !selectedStillEligible && !verifyCursor) {
        setSelectedDrone(null);
        void selectionJournalRef.current?.clear();
      }
    } catch (error) {
      if (!isCurrent() || request !== eligibleRequest.current) return;
      const status = (error as { response?: { status?: number } }).response?.status;
      setEligibleError(status === 403 ? 'Bạn không có quyền đọc danh sách máy bay của nhiệm vụ này.' :
        status === 404 ? 'Không tìm thấy nhiệm vụ để đọc máy bay đủ điều kiện.' :
        'Chưa đọc được danh sách máy bay đủ điều kiện. Tải lại để thử lại.');
    } finally {
      if (isCurrent() && request === eligibleRequest.current) setEligibleLoading(false);
    }
  };
  const selectDrone = async (drone: EligibleDroneDto) => {
    const isCurrent = scope.capture();
    if (!isCurrent() || sending.current) return;
    const journal = selectionJournalRef.current;
    if (!journal) {
      setEligibleError('Chưa xác minh được phạm vi nhiệm vụ để lưu lựa chọn máy bay.');
      return;
    }
    try {
      await journal.save({ droneId: drone.id, serialNo: drone.serialNo });
      if (isCurrent()) setSelectedDrone(drone.id);
    } catch (error) {
      if (isCurrent()) setEligibleError((error as Error).message === 'drone_selection_session_changed'
        ? 'Phiên Operator đã thay đổi. Hãy tải lại nhiệm vụ.'
        : 'Không lưu được lựa chọn máy bay trong phiên này.');
    }
  };
  const selectFile = (file: DroneLocalFile) => {
    setDraftMessage(null);
    if (file.kind === 'VIDEO') {
      setVideoFile(file);
      setVideoName(file.name); setVideoUri(file.uri); setVideoSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);
      setVideoSha(file.checksumSha256 ? 'Đã kiểm tra SHA-256' : 'Chưa kiểm tra SHA-256');
    } else {
      setTelemetryFile(file);
      setSrtName(file.name); setSrtUri(file.uri); setSrtSize(`${Math.max(1, Math.round(file.size / 1024))} KB`);
      setSrtSha(file.checksumSha256 ? 'Đã kiểm tra SHA-256' : 'Chưa kiểm tra SHA-256');
    }
    setUploadStep('LOCAL');
  };
  const restoreFile = async (key: string) => {
    const isCurrent = scope.capture();
    if (!isCurrent() || !params.taskId || picking.current || sending.current || draftLoading) return;
    picking.current = true; setCopying(true);
    let runtime: Awaited<ReturnType<typeof openDroneLocalFiles>> | undefined;
    try {
      runtime = await openDroneLocalFiles(params.taskId);
      if (!isCurrent()) return;
      const files = await runtime.list();
      if (!isCurrent()) return;
      const file = files.find(f => f.key === key);
      if (!file || !['LOCAL_READY','LOCAL_UNHASHED'].includes(file.availability)) throw Error('file_unavailable');
      const ready = file.availability === 'LOCAL_UNHASHED' ? await runtime.rehash(key) : file;
      if (!isCurrent()) return;
      selectFile(ready); setSubmitError(null);
    } catch { if (isCurrent()) setSubmitError('Chưa kiểm tra được tệp đã lưu. Tệp và lịch sử vẫn được giữ; thử lại hoặc chọn lại tệp nguồn.'); }
    finally {
      runtime?.close(); picking.current = false;
      if (mounted.current) setCopying(false);
      if (isCurrent()) await refreshFiles();
    }
  };

  const [previewScope, setPreviewScope] = useState(scope.key);
  const restoreDraft = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || !params.taskId) return;
    setDraftLoading(true);
    let draft: Awaited<ReturnType<typeof openOperatorUploadDraft>> | undefined;
    let files: Awaited<ReturnType<typeof openDroneLocalFiles>> | undefined;
    let journal: Awaited<ReturnType<typeof openDroneUploadJournal>> | undefined;
    try {
      draft = await openOperatorUploadDraft(params.taskId); if (!isCurrent()) return;
      let saved = await draft.read(); if (!isCurrent()) return;
      files = await openDroneLocalFiles(params.taskId); if (!isCurrent()) return;
      const local = await files.list(); if (!isCurrent()) return;
      // Older app versions saved the upload journal, but not the form at send
      // time. Recover only an unambiguous exact local source; never guess a date.
      if (!saved?.videoKey) {
        journal = await openDroneUploadJournal(params.taskId); if (!isCurrent()) return;
        const uploads = await journal.read('upload'); if (!isCurrent()) return;
        const candidates = uploads.filter(item => item.taskId === params.taskId &&
          ['PREPARED','SESSION_CREATED','PARTS_IN_PROGRESS','COMPLETE_UNKNOWN','VERIFY_PENDING','VERIFIED'].includes(item.status) &&
          !item.cancelRequest);
        const recover = (purpose: 'SURVEY_VIDEO' | 'TELEMETRY') => {
          const matching = candidates.filter(item => item.purpose === purpose);
          if (matching.length !== 1) return null;
          const item = matching[0];
          return local.find(file => file.key === item.localFileId && file.taskId === item.taskId &&
            file.projectId === item.projectId && file.size === item.sizeBytes &&
            file.checksumSha256 === item.checksumSha256 && file.availability === 'LOCAL_READY' &&
            file.kind === (purpose === 'SURVEY_VIDEO' ? 'VIDEO' : 'TELEMETRY'))?.key ?? null;
        };
        const videoKey = recover('SURVEY_VIDEO');
        if (videoKey) saved = {recordedAt:saved?.recordedAt ?? '',timeOffset:saved?.timeOffset ?? '',
          videoKey,telemetryKey:saved?.telemetryKey ?? recover('TELEMETRY'),savedAt:saved?.savedAt ?? ''};
      }
      if (!saved) return;
      for (const [key, kind] of [[saved.videoKey,'VIDEO'],[saved.telemetryKey,'TELEMETRY']] as const) {
        const file = local.find(f => f.key === key && f.kind === kind && ['LOCAL_READY','LOCAL_UNHASHED'].includes(f.availability));
        if (file) {
          const ready = file.availability === 'LOCAL_UNHASHED' ? await files.rehash(file.key) : file;
          if (!isCurrent()) return;
          selectFile(ready);
        }
      }
      setRecordedAt(saved.recordedAt); setTimeOffset(saved.timeOffset);
      const missing = [saved.videoKey,saved.telemetryKey].some(key => key && !local.some(f => f.key === key && ['LOCAL_READY','LOCAL_UNHASHED'].includes(f.availability)));
      setDraftMessage(missing ? 'Đã mở nháp. Có tệp chưa đầy đủ; chọn lại tệp nguồn.' :
        !saved.recordedAt && saved.videoKey ? 'Đã khôi phục tệp. Chọn thời gian ghi hình để tiếp tục gửi.' :
        'Đã khôi phục thông tin trên thiết bị. Bấm nộp để tiếp tục hoặc kiểm tra kết quả.');
    } catch { if (isCurrent()) setDraftMessage('Chưa mở được nháp. Dữ liệu đã lưu vẫn được giữ.'); }
    finally { draft?.close(); files?.close(); journal?.close(); if (isCurrent()) setDraftLoading(false); }
  };
  const saveDraft = async () => {
    const isCurrent = scope.capture();
    if (!isCurrent() || !params.taskId || savingDraft.current || draftLoading || sending.current || copying || pendingDataset) return;
    savingDraft.current = true;
    let draft: Awaited<ReturnType<typeof openOperatorUploadDraft>> | undefined;
    try {
      draft = await openOperatorUploadDraft(params.taskId); if (!isCurrent()) return;
      await draft.save({recordedAt,timeOffset,videoKey:videoFile?.key ?? null,telemetryKey:telemetryFile?.key ?? null});
      if (isCurrent()) setDraftMessage('Đã lưu nháp trên máy. Chưa gửi lên máy chủ.');
    } catch { if (isCurrent()) setDraftMessage('Chưa lưu được nháp. Giữ màn này và thử lại.'); }
    finally { draft?.close(); savingDraft.current = false; }
  };
  useEffect(() => {
    setPreviewScope(scope.key);
    setVideoName('Chưa chọn tệp'); setVideoSize('—'); setVideoSha('—');
    setSrtName('Chưa chọn tệp'); setSrtSize('—'); setSrtSha('—');
    setVideoUri(null); setSrtUri(null); setUploadStep('LOCAL');
    setVideoFile(null); setTelemetryFile(null); setRecordedAt(''); setTimeOffset(''); setJournalReady(false); setPendingDataset(null); setReceived(false); setVerifiedFiles([]); setTransferMessage(null); setTransferPhase(null);
    void readDatasetIntent();
    setUploadProgress(0); setSubmitError(null);
    setNote('');
    setSavedFiles([]); setFileError(null);
    setDraftMessage(null); void restoreDraft();
    eligibleRequest.current++;
    setEligibleDrones([]); setEligibleCursor(null); setEligibleError(null); setSelectedDrone(null);
    // Copy ownership outlives scope changes. Keep its generic busy indicator;
    // the old continuation must never publish its file into the new scope.
    void refreshFiles();
    void loadEligibleDrones();
  }, [scope.key]);

  // Chọn video 4K RGB từ thẻ nhớ SD
  const pickFile = async (kind: 'VIDEO' | 'TELEMETRY') => {
    const isCurrent = scope.capture();
    if (!isCurrent() || picking.current || sending.current) return;
    if (!params.taskId) { setSubmitError('Chọn nhiệm vụ máy chủ trước khi lưu tệp.'); return; }
    picking.current = true; setCopying(true);
    let runtime: Awaited<ReturnType<typeof openDroneLocalFiles>> | undefined;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: kind === 'VIDEO' ? ['video/*', 'video/mp4'] : '*/*',
        copyToCacheDirectory: false,
      });
      if (!isCurrent()) return;
      if (!result.canceled && result.assets && result.assets.length > 0) {
        runtime = await openDroneLocalFiles(params.taskId);
        if (!isCurrent()) return;
        const file = await runtime.preserve(kind,result.assets[0]);
        if (!isCurrent()) return;
        selectFile(file); setSubmitError(null);
      }
    } catch { if (isCurrent()) setSubmitError('Không lưu được tệp đầy đủ. Lựa chọn trước và lịch sử vẫn được giữ; kiểm tra dung lượng rồi chọn lại MP4/SRT.'); }
    finally {
      runtime?.close(); picking.current = false;
      if (mounted.current) setCopying(false);
      if (isCurrent()) await refreshFiles();
    }
  };
  const handlePickVideo = () => pickFile('VIDEO');
  const handlePickSrt = () => pickFile('TELEMETRY');

  const readDatasetIntent = async () => {
    const isCurrent=scope.capture(); if(!isCurrent() || !params.taskId)return;
    let journal: Awaited<ReturnType<typeof openDroneUploadJournal>> | undefined;
    try {journal=await openDroneUploadJournal(params.taskId);if(!isCurrent())return;
      const items=await journal.read('dataset');
      const uploads=await journal.read('upload');
      if(isCurrent()){setUploadIntents(uploads);setPendingDataset(items.at(-1)??null);setJournalReady(true);}
    } catch {if(isCurrent()){setJournalReady(false);setSubmitError('Chưa đọc được lịch sử nộp. Tệp cũ vẫn được giữ.');}}
    finally {journal?.close();}
  };
  const confirmDataset = async (intent: DroneUploadIntent, isCurrent:()=>boolean) => {
    if(!isCurrent())throw Error('operator_session_changed');
    const datasetId=intent.receipt?.datasetId;
    const owner=operatorDatasetScope();
    if(typeof datasetId!=='string'||!owner)throw Error('dataset_receipt_missing');
    const result=await readOperatorDatasetReadback(owner,datasetId);
    if(!isCurrent())throw Error('operator_session_changed');
    if(result.dataset.surveyTaskId!==params.taskId)throw Error('dataset_task_mismatch');
    setReceived(true);setTransferMessage('Máy chủ đã nhận bộ dữ liệu. Phạm vi phủ được đánh giá riêng.');
  };
  const submitFailure = (error: unknown) => {
    const code=(error as Error).message;
    return code==='drone_upload_paused'?'Đã dừng gửi. Tệp và các phần đã tải vẫn được giữ.':
      code==='drone_upload_cancel_pending'?'Yêu cầu hủy chưa có kết quả. Đối soát hủy trước khi tiếp tục.':
      code==='drone_upload_verify_pending'?'Máy chủ đang xác minh tệp. Bấm tiếp tục để đọc lại, không tải lại tệp.':
      code==='telemetry_offset_invalid'?'Nhập độ lệch thời gian SRT; dùng 0 nếu video và SRT cùng mốc.':
      code==='recorded_at_invalid'?'Nhập thời gian ghi hình theo dạng năm-tháng-ngày giờ:phút.':
      code==='drone_dataset_intent_not_dispatchable'?'Đã có yêu cầu nộp. Đọc lại trạng thái hoặc gửi lại yêu cầu đã lưu.':
      code==='operator_session_changed'?'Phiên đã thay đổi. Mở lại nhiệm vụ để tiếp tục.':
      'Chưa hoàn tất gửi dữ liệu. Tệp và yêu cầu đã lưu vẫn được giữ để tiếp tục an toàn.';
  };
  const handleStartSubmitDataset = async () => {
    const isCurrent=scope.capture();
    if(!isCurrent()||sending.current||savingDraft.current||copying||draftLoading||!params.taskId||!videoFile?.checksumSha256||!selectedDroneId||pendingDataset||!journalReady)return;
    pauseRequested.current=false;setPausePending(false);
    sending.current=true;setSubmitting(true);setSubmitError(null);setReceived(false);setTransferPhase(null);setTransferMessage('Đang chuẩn bị gửi…');
    const guard=()=>{if(!isCurrent()||!mounted.current)throw Error('operator_session_changed');};
    try {
      if(!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(recordedAt))throw Error('recorded_at_invalid');
      if(telemetryFile && (!/^-?\d+$/.test(timeOffset)||!Number.isSafeInteger(Number(timeOffset))))throw Error('telemetry_offset_invalid');
      const date=new Date(recordedAt.replace(' ','T')+':00');
      if(!Number.isFinite(date.getTime()) || date.getFullYear()!==Number(recordedAt.slice(0,4)) || date.getMonth()+1!==Number(recordedAt.slice(5,7)) || date.getDate()!==Number(recordedAt.slice(8,10)))throw Error('recorded_at_invalid');
      // Persist the form before the first upload HTTP request. Logout must not
      // leave a durable transfer with only volatile file/date selections.
      const draft = await openOperatorUploadDraft(params.taskId);
      try {
        guard();
        await draft.save({recordedAt,timeOffset,videoKey:videoFile.key,telemetryKey:telemetryFile?.key ?? null});
        guard();
      } finally { draft.close(); }
      const transfer = async (file: DroneLocalFile) => {
        const current=await getOperatorSurveyTaskDetailReal(params.taskId!);guard();
        if(current.data.projectId!==file.projectId||file.taskId!==params.taskId||!file.checksumSha256)throw Error('drone_file_task_invalid');
        let attempts=0;
        const fileLabel=file.kind==='VIDEO'?'video':'SRT';
        setTransferPhase('UPLOAD');setTransferMessage(`Đang tải ${fileLabel}…`);setUploadProgress(0);
        while(true) {
          try {
            const intent=await orchestrateDroneUpload({taskId:params.taskId!,projectId:current.data.projectId,targetId:params.taskId!,taskVersion:current.data.version,
              file:{id:file.key,uri:file.uri,name:file.name,sizeBytes:file.size,checksumSha256:file.checksumSha256,purpose:file.kind==='VIDEO'?'SURVEY_VIDEO':'TELEMETRY',mediaType:file.kind==='VIDEO'?'video/mp4':'application/x-subrip'},
              readRange:(offset,length)=>readDroneFileRange(file,offset,length),shouldPause:()=>pauseRequested.current,onProgress:(sent,total)=>{if(isCurrent())setUploadProgress(Math.floor(sent*100/total));}});
            guard();setVerifiedFiles(previous=>[...new Set([...previous,file.key])]);setUploadProgress(100);setTransferPhase(null);setTransferMessage(`Máy chủ đã xác minh ${fileLabel}`);return intent.fileId!;
          } catch(error) {
            guard();if((error as Error).message!=='drone_upload_verify_pending'||++attempts>=20)throw error;
            setTransferPhase('VERIFY');setUploadProgress(100);setTransferMessage(`Đã tải ${fileLabel} · Đang chờ máy chủ xác minh`);await new Promise(resolve=>setTimeout(resolve,1000));guard();
          }
        }
      };
      const videoId=await transfer(videoFile);guard();if(pauseRequested.current)throw Error('drone_upload_paused');
      const telemetryId=telemetryFile?await transfer(telemetryFile):null;guard();
      const current=await getOperatorSurveyTaskDetailReal(params.taskId);guard();
      if(current.data.operatorId!==useAuthStore.getState().user?.id||!['ACCEPTED','IN_PROGRESS'].includes(current.data.status)||current.data.projectId!==videoFile.projectId)throw Error('drone_upload_assignment_changed');
      // Selection remains server rooted; refresh every page before submission.
      let cursor: string|null=null,eligible=false,pages=0;
      do {const page=await listEligibleOperatorDronesReal(params.taskId,cursor,100);guard();eligible=page.items.some(item=>item.id===selectedDroneId);cursor=page.nextCursor;pages++;}while(!eligible&&cursor&&pages<20);
      if(!eligible)throw Error('drone_device_unavailable');
      const plan: DroneDatasetPlan={taskId:params.taskId,projectId:current.data.projectId,ifMatch:current.etag,payload:{videoFileIds:[videoId],telemetryFileIds:telemetryId?[telemetryId]:[],deviceId:selectedDroneId,recordedAt:date.toISOString(),scope:current.data.scope,pairs:[{videoFileId:videoId,telemetryFileId:telemetryId,timeOffsetMilliseconds:telemetryId?Number(timeOffset):0}]}};
      setTransferPhase(null);setTransferMessage('Đang nộp bộ dữ liệu…');
      const result=await submitDroneDataset(plan);guard();setPendingDataset(result);await confirmDataset(result,isCurrent);
    } catch(error) {if(isCurrent()&&mounted.current){setSubmitError(submitFailure(error));setTransferMessage('Tệp và tiến trình đã lưu trên thiết bị.');}}
    finally {sending.current=false;if(isCurrent()&&mounted.current){setSubmitting(false);setPausePending(false);await readDatasetIntent();}}
  };
  const handleCancelUpload = (intent: DroneUploadIntent) => {
    const isCurrent=scope.capture();
    if(!isCurrent()||sending.current||!intent.uploadId)return;
    const reconcile=intent.cancelRequest?.phase==='UNKNOWN';
    Alert.alert(reconcile?'Kiểm tra kết quả hủy?':'Hủy phiên tải lên?', reconcile?'Đọc trạng thái phiên đã lưu trên máy chủ. Tệp gốc và nháp vẫn được giữ trên thiết bị.':'Các phần trên máy chủ sẽ không được nộp. Tệp gốc và nháp vẫn được giữ trên thiết bị.',[
      {text:'Giữ phiên',style:'cancel'},
      {text:reconcile?'Đọc trạng thái':'Hủy tải lên',style:reconcile?'default':'destructive',onPress:()=>{void (async()=>{
        if(!isCurrent()||sending.current)return;
        sending.current=true;setSubmitting(true);setSubmitError(null);setTransferPhase(null);setTransferMessage('Đang kiểm tra kết quả hủy…');
        try {
          await cancelOperatorUploadSession(intent.taskId,intent.uploadId!);
          if(isCurrent())setTransferMessage('Máy chủ đã xác nhận hủy. Tệp gốc vẫn được giữ trên thiết bị.');
        } catch(error) {
          if(isCurrent()) {
            setTransferMessage('Tệp gốc vẫn được giữ trên thiết bị.');
            setSubmitError((error as Error).message==='upload_not_cancellable'?'Máy chủ không cho hủy ở trạng thái hiện tại. Đọc lại nhiệm vụ trước khi tiếp tục.':'Chưa xác nhận được kết quả hủy. Bấm đối soát hủy để kiểm tra lại đúng phiên.');
          }
        } finally {sending.current=false;if(isCurrent()&&mounted.current){setSubmitting(false);await readDatasetIntent();}}
      })();}},
    ]);
  };
  const handleRetainedDataset = async (replay=false) => {
    const isCurrent=scope.capture();if(!isCurrent()||sending.current||!pendingDataset)return;
    sending.current=true;setSubmitting(true);setSubmitError(null);setTransferPhase(null);setTransferMessage('Đang đọc lại kết quả nộp…');
    try {
      let intent=pendingDataset;
      if(replay)intent=await replayDroneDataset({taskId:intent.taskId,projectId:intent.projectId,ifMatch:intent.ifMatch!,payload:intent.body as unknown as DroneDatasetPlan['payload']});
      else if(intent.status==='PREPARED')intent=await submitDroneDataset({taskId:intent.taskId,projectId:intent.projectId,ifMatch:intent.ifMatch!,payload:intent.body as unknown as DroneDatasetPlan['payload']});
      if(!isCurrent())return;
      setPendingDataset(intent);await confirmDataset(intent,isCurrent);
    }catch(error){if(isCurrent())setSubmitError(submitFailure(error));}
    finally{sending.current=false;if(isCurrent()&&mounted.current){setSubmitting(false);await readDatasetIntent();}}
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(drone)/home');
    }
  };

  if (!scope.key || previewScope !== scope.key) return <SafeAreaScreen><Text>Cần phiên Operator hợp lệ để chọn tệp.</Text></SafeAreaScreen>;

  const submitRequirement = copying ? 'Đang sao lưu tệp, vui lòng chờ.'
    : draftLoading ? 'Đang khôi phục bản nháp, vui lòng chờ.'
    : !videoFile?.checksumSha256 ? 'Chọn video MP4 trước khi nộp.'
    : !selectedDroneId ? 'Chọn máy bay thực hiện khảo sát trước khi nộp.'
    : !recordedAt.trim() ? 'Nhập thời gian ghi hình theo tệp video trước khi nộp.'
    : !journalReady ? 'Chưa mở được lịch sử nộp. Hãy mở lại màn này để thử lại; bản nháp vẫn được giữ.'
    : null;

  const fileCard = (kind: 'VIDEO' | 'TELEMETRY', title: string, name: string, size: string) => {
    const file = kind==='VIDEO'?videoFile:telemetryFile;
    return <Card style={styles.card}>
      <View style={styles.row}>
        <View style={styles.fileIcon}><MaterialIcons name={kind==='VIDEO'?'videocam':'subtitles'} size={24} color={colors.secondary}/></View>
        <View style={{flex:1,gap:3}}><Text style={styles.heading}>{title}</Text><Text style={styles.caption}>{kind==='VIDEO'?'Bắt buộc · 4K RGB':'Không bắt buộc'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={kind==='VIDEO'?'Chọn video MP4':'Chọn tệp SRT'} accessibilityState={{disabled:copying||submitting||draftLoading}} disabled={copying||submitting||draftLoading} onPress={kind==='VIDEO'?handlePickVideo:handlePickSrt} android_ripple={{color:operatorAppearance.pressed}} style={styles.chooseFile}>
          <MaterialIcons name={file?'swap-horiz':'add'} size={20} color={colors.secondary}/><Text style={styles.chooseLabel}>{file?'Đổi tệp':'Chọn tệp'}</Text>
        </Pressable>
      </View>
      {file?<View style={styles.fileRow}><MaterialIcons name="insert-drive-file" size={22} color={colors.secondary}/><View style={{flex:1,gap:4,minWidth:0}}>
        <Text testID={kind==='VIDEO'?'selected-video':'selected-telemetry'} numberOfLines={2} ellipsizeMode="middle" style={typography.bodyMd}>{name}</Text>
        <Text style={styles.caption}>{size} · {verifiedFiles.includes(file.key)?'Máy chủ đã xác minh tệp':'Đã lưu trên thiết bị'}</Text>
      </View></View>:kind==='VIDEO'?<Text style={styles.caption}>Chọn video từ thiết bị để bắt đầu.</Text>:null}
    </Card>;
  };
  return <SafeAreaScreen scroll header={<View style={styles.header}>
    <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={handleBack} android_ripple={{color:operatorAppearance.pressed}} style={styles.iconButton}><MaterialIcons name="arrow-back" size={24} color={colors.secondary}/></Pressable>
    <View style={{flex:1}}><Text style={styles.heading}>Dữ liệu khảo sát</Text><Text style={styles.caption}>{params.taskId?`Nhiệm vụ ${params.taskId.slice(0,8)}`:'Chọn nhiệm vụ để tiếp tục'}</Text></View>
  </View>}>
    {!submitting&&!received&&!pendingDataset?<>
    {!params.taskId?<Button title="Chọn nhiệm vụ từ máy chủ" variant="secondary" onPress={()=>router.push('/(drone)/requests')}/>:null}
    <Card style={styles.card}>
      <View style={styles.row}><Text style={styles.heading}>Máy bay</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Tải lại máy bay đủ điều kiện" disabled={eligibleLoading} onPress={()=>void loadEligibleDrones()} android_ripple={{color:operatorAppearance.pressed}} style={styles.iconButton}>
          {eligibleLoading?<ActivityIndicator color={colors.secondary}/>:<MaterialIcons name="refresh" size={22} color={colors.secondary}/>}
        </Pressable>
      </View>
      {eligibleError?<Text accessibilityRole="alert" style={styles.error}>{eligibleError}</Text>:null}
      {!eligibleLoading&&!eligibleError&&!eligibleDrones.length?<Text style={styles.caption}>Chưa có máy bay đủ điều kiện.</Text>:null}
      <View accessibilityRole="radiogroup" style={{gap:8}}>{eligibleDrones.map(drone=><Pressable key={drone.id} accessibilityRole="radio" accessibilityLabel={`Máy bay ${drone.serialNo}`} accessibilityState={{checked:selectedDroneId===drone.id}} onPress={()=>void selectDrone(drone)} style={[styles.option,selectedDroneId===drone.id&&styles.selected]}>
        <MaterialIcons name={selectedDroneId===drone.id?'radio-button-checked':'radio-button-unchecked'} size={22} color={colors.secondary}/><Text style={{...typography.bodyMd,flex:1}}>{drone.serialNo}</Text>
      </Pressable>)}</View>
      {eligibleCursor?<Button style={styles.secondaryAction} title="Tải thêm máy bay" variant="secondary" disabled={eligibleLoading} loading={eligibleLoading} onPress={()=>void loadEligibleDrones(true)}/>:null}
    </Card>
    {fileCard('VIDEO','Video MP4',videoName,videoSize)}
    {copying?<View accessibilityRole="alert" style={styles.notice}><ActivityIndicator color={colors.secondary}/><Text style={styles.noticeText}>Đang chọn hoặc sao lưu tệp. Chờ hoàn tất trước khi chọn tệp tiếp theo.</Text></View>:null}
    <Card style={styles.card}>
      <View style={styles.row}>
        <AnimatedPressable testID="saved-files-toggle" accessibilityRole="button" accessibilityLabel="Tệp đã lưu trên thiết bị" accessibilityState={{expanded:filesExpanded}} onPress={()=>setFilesExpanded(v=>!v)} android_ripple={{color:operatorAppearance.pressed}} style={[styles.row,{flex:1,minHeight:48}]}>
          <Text style={styles.heading}>Tệp đã lưu ({savedFiles.length})</Text><MaterialIcons name={filesExpanded?'expand-less':'expand-more'} size={24} color={colors.secondary}/>
        </AnimatedPressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Đọc lại tệp đã lưu" onPress={()=>void refreshFiles()} android_ripple={{color:operatorAppearance.pressed}} style={styles.iconButton}><MaterialIcons name="refresh" size={22} color={colors.secondary}/></Pressable>
      </View>
      {filesExpanded?<>
        <Text style={styles.caption}>Video tối đa 8,6 GB</Text>
        {savedFiles.map(file=><View key={file.key} style={styles.savedFile}>
          <View style={{flex:1,minWidth:0,gap:4}}><Text numberOfLines={2} ellipsizeMode="middle" style={typography.bodyMd}>{file.name}</Text><Text style={styles.caption}>{file.availability==='LOCAL_READY'?'Sẵn sàng sử dụng':file.availability==='LOCAL_UNHASHED'?'Cần kiểm tra tệp':file.availability==='INCOMPLETE'?'Bản sao chưa đầy đủ':'Không tìm thấy tệp'}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Dùng tệp đã lưu: ${file.name}`} accessibilityState={{disabled:submitting||copying||draftLoading||!['LOCAL_READY','LOCAL_UNHASHED'].includes(file.availability)}} disabled={submitting||copying||draftLoading||!['LOCAL_READY','LOCAL_UNHASHED'].includes(file.availability)} onPress={()=>void restoreFile(file.key)} android_ripple={{color:operatorAppearance.pressed}} style={styles.chooseFile}><Text style={styles.chooseLabel}>Dùng tệp</Text></Pressable>
        </View>)}
        {!savedFiles.length?<Text style={styles.caption}>Chưa có tệp đã lưu.</Text>:null}
      </>:null}
      {fileError?<Text accessibilityRole="alert" style={styles.error}>{fileError}</Text>:null}
    </Card>
    <Card style={styles.card}><Text style={styles.heading}>Thời gian ghi hình</Text>
      <RecordingDateTimeField key={`${scope.key}:${params.taskId}`} value={recordedAt} disabled={submitting||!!pendingDataset||draftLoading} onChangeText={v=>{setRecordedAt(v);setDraftMessage(null);}}/>
      <Text style={styles.caption}>Chọn theo thời điểm quay video · giờ địa phương.</Text>
      {telemetryFile?<><Text style={typography.bodyMd}>Độ lệch SRT so với video (ms)</Text><TextInput accessibilityLabel="Độ lệch thời gian SRT" placeholder="0 nếu video và SRT cùng mốc" value={timeOffset} editable={!submitting&&!pendingDataset&&!draftLoading} onChangeText={v=>{setTimeOffset(v);setDraftMessage(null);}} keyboardType="numbers-and-punctuation" style={styles.input}/></>:null}
      {!pendingDataset?<Button style={styles.secondaryAction} title="Lưu nháp trên máy" variant="secondary" disabled={submitting||copying||draftLoading||!params.taskId} onPress={()=>void saveDraft()}/>:null}
      {draftMessage?<Text accessibilityLiveRegion="polite" style={styles.caption}>{draftMessage}</Text>:null}
    </Card>
    </>:null}
    {transferMessage||pendingDataset?<View testID="dataset-transfer-card" accessibilityLiveRegion="polite"><Card style={[styles.card,styles.transferCard,received&&styles.transferComplete]}>
      <View style={styles.row}>
        <View style={[styles.transferIcon,received&&styles.completeIcon]}><MaterialIcons name={received?'check-circle-outline':'cloud-upload'} size={28} color={received?colors.success:colors.primary}/></View>
        <View style={styles.transferCopy}><Text style={styles.heading}>{received?'Đã gửi dữ liệu':submitting?'Đang gửi khảo sát':pendingDataset?'Yêu cầu nộp đã lưu':'Cần tiếp tục gửi'}</Text>{videoFile?<Text numberOfLines={1} ellipsizeMode="middle" style={styles.caption}>{videoName}</Text>:null}</View>
      </View>
      <View style={styles.transferStatus}>
        {submitting&&transferPhase!=='UPLOAD'?<ActivityIndicator size="small" color={colors.primary}/>:null}
        <Text style={styles.noticeText}>{transferMessage??'Đọc lại kết quả để kiểm tra trạng thái mới nhất.'}</Text>
        {submitting&&transferPhase!==null?<Text style={styles.percentage}>{uploadProgress}%</Text>:null}
      </View>
      {submitting&&transferPhase!==null?<View accessibilityRole="progressbar" accessibilityLabel="Tiến trình tải tệp" accessibilityValue={{min:0,max:100,now:uploadProgress}} style={styles.progressTrack}><View style={[styles.progressFill,{width:`${uploadProgress}%`}]}/></View>:null}
      {submitting&&transferPhase==='UPLOAD'?<Button title={pausePending?'Đang dừng…':'Dừng tải lên'} variant="secondary" disabled={pausePending} onPress={()=>{pauseRequested.current=true;setPausePending(true);}}/>:null}
    {pendingDataset&&!submitting?<View style={styles.recoveryActions}>
      {pendingDataset.status==='DATASET_CONFIRMED'?<Button title="Đọc lại kết quả nộp" variant="secondary" loading={submitting} disabled={submitting} onPress={()=>void handleRetainedDataset()}/>:pendingDataset.status==='DATASET_UNKNOWN'?<Button title="Gửi lại đúng yêu cầu đã lưu" variant="secondary" loading={submitting} disabled={submitting} onPress={()=>void handleRetainedDataset(true)}/>:pendingDataset.status==='PREPARED'?<Button title="Tiếp tục nộp yêu cầu đã lưu" variant="secondary" loading={submitting} disabled={submitting} onPress={()=>void handleRetainedDataset()}/>:<Text style={styles.caption}>Yêu cầu không được máy chủ chấp nhận. Kiểm tra lại nhiệm vụ trước khi nộp một bộ dữ liệu mới.</Text>}
    </View>:null}
    </Card></View>:null}
    {!submitting&&!pendingDataset?uploadIntents.filter(item=>item.uploadId&&item.status!=='VERIFIED').map(item=><Card key={item.key} style={styles.card}>
      <Text style={styles.heading}>{item.error?.code==='upload_cancelled'?'Đã hủy phiên tải lên':item.cancelRequest?.phase==='UNKNOWN'?'Chưa xác nhận hủy':'Phiên tải lên đã lưu'}</Text>
      <Text numberOfLines={2} style={styles.caption}>{String(item.body.fileName??'Tệp khảo sát')}</Text>
      <Text style={styles.caption}>{item.error?.code==='upload_cancelled'?'Tệp gốc vẫn ở thiết bị. Chọn lại tệp để bắt đầu một phiên mới.':`${item.parts.length} phần tệp đã tải. Tệp gốc vẫn ở thiết bị.`}</Text>
      {item.error?.code!=='upload_cancelled'&&item.status!=='VERIFY_PENDING'?<Button title={item.cancelRequest?.phase==='UNKNOWN'?'Đối soát hủy':'Hủy phiên tải lên'} variant="secondary" onPress={()=>handleCancelUpload(item)}/>:null}
    </Card>):null}
    {!submitting?<>
    {!pendingDataset?<>
      {submitRequirement?<View testID="dataset-submit-requirement" accessibilityLiveRegion="polite" style={styles.notice}><MaterialIcons name="info-outline" size={20} color={colors.secondary}/><Text style={styles.noticeText}>{submitRequirement}</Text></View>:null}
      <Button title="Nộp bộ dữ liệu 4K RGB" variant="primary" style={styles.primaryAction} disabled={submitRequirement!==null} onPress={()=>void handleStartSubmitDataset()}/>
    </>:null}
    {submitError?<Text accessibilityRole="alert" style={styles.error}>{submitError}</Text>:null}
    </>:null}
  </SafeAreaScreen>;
}
const styles=StyleSheet.create({
  input:{...typography.bodyMd,borderWidth:1,borderColor:colors.border,borderRadius:10,padding:14,color:colors.secondary,minHeight:52},
  progressTrack:{height:5,borderRadius:4,backgroundColor:colors.border,overflow:'hidden'},
  progressFill:{height:5,backgroundColor:colors.primary},
  header:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:spacing.screenMargin,paddingVertical:8,backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border},
  card:{...operatorAppearance.card,borderColor:colors.border,marginBottom:16,gap:12},
  row:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:10},
  heading:{...typography.titleMd,fontFamily:'Roboto-Medium',color:'#192D40',flex:1,minWidth:0},
  caption:{...typography.caption,color:'#526170',lineHeight:20},
  iconButton:{minHeight:48,minWidth:48,alignItems:'center',justifyContent:'center',padding:6,gap:4,borderWidth:1,borderColor:colors.border,borderRadius:radius.full,backgroundColor:colors.surfaceAlt,overflow:'hidden'},
  fileIcon:{width:40,height:40,borderRadius:12,backgroundColor:'#F3F5F6',alignItems:'center',justifyContent:'center'},
  chooseFile:{minHeight:48,minWidth:64,maxWidth:'100%',paddingHorizontal:12,paddingVertical:8,flexDirection:'row',gap:4,alignItems:'center',justifyContent:'center',borderRadius:12,borderWidth:1,borderColor:'#CBD4DD',backgroundColor:'#F3F5F6',overflow:'hidden'},
  chooseLabel:{...typography.labelLg,color:colors.secondary},
  fileRow:{flexDirection:'row',gap:12,alignItems:'center',padding:12,backgroundColor:colors.surfaceAlt,borderRadius:10},
  option:{minHeight:52,borderWidth:1,borderColor:'#CBD4DD',borderRadius:12,padding:12,flexDirection:'row',alignItems:'center',gap:12},
  selected:{borderColor:'#192D40',backgroundColor:'#EDF1F4'},
  savedFile:{flexDirection:'row',alignItems:'center',gap:12,borderTopWidth:1,borderTopColor:colors.border,paddingTop:12},
  notice:{flexDirection:'row',alignItems:'center',gap:10,padding:14,borderRadius:12,backgroundColor:colors.surfaceAlt,marginBottom:16},
  noticeText:{...typography.caption,color:colors.secondary,lineHeight:20,flex:1},
  error:{...typography.bodyMd,color:colors.error,marginVertical:8},
  primaryAction:{minHeight:52,borderRadius:12,backgroundColor:colors.primary,borderColor:colors.primary},
  secondaryAction:{alignSelf:'flex-start',maxWidth:'100%',borderRadius:12,borderColor:'#CBD4DD',backgroundColor:'#F3F5F6'},
  recoveryActions:{gap:12},
  transferCard:{padding:20,gap:20},
  transferCopy:{flex:1,gap:4},
  transferIcon:{width:52,height:52,borderRadius:16,backgroundColor:operatorAppearance.pressed,alignItems:'center',justifyContent:'center'},
  transferStatus:{flexDirection:'row',flexWrap:'wrap',alignItems:'center',gap:12,padding:14,borderRadius:12,backgroundColor:'#F3F5F6'},
  percentage:{...typography.titleMd,color:'#192D40',fontFamily:'Roboto-Medium',fontVariant:['tabular-nums']},
  transferComplete:{borderColor:colors.success},
  completeIcon:{backgroundColor:colors.surfaceAlt},
});
