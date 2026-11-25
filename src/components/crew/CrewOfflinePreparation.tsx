import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Card } from '../Card';
import { Button } from '../Button';
import { colors, spacing, typography } from '../../design-tokens';
import { currentQueueIdentity, sameQueueIdentity } from '../../offline/upload-queue';
import { downloadCrewOfflineTaskDetailed, reconcileDeviceSessionForProject } from '../../api/crewOfflinePreparation';
import { requireOfflineNativeAcceptance } from '../../api/crewOfflineWorkflow';

function offlinePreparationError(error: unknown): { message: string; needsSessionReconcile: boolean } {
  const err = error as { message?: string; code?: string; response?: { status?: number; data?: { code?: string } } } | undefined;
  const msg = err?.message ?? '';
  const status = err?.response?.status;
  const apiCode = err?.response?.data?.code ?? '';

  if (msg === 'offline_session_recovery_required') {
    return {
      needsSessionReconcile: true,
      message: 'Thiết bị đã đăng ký ở phiên đăng nhập trước. Cần đối soát lại đăng ký thiết bị với máy chủ cho phiên hiện tại trước khi tải dữ liệu nhiệm vụ.',
    };
  }
  if (
    msg === 'offline_registration_reconciliation_required' ||
    msg === 'offline_snapshot_reconciliation_required' ||
    msg === 'offline_uncertain_command_requires_reconciliation' ||
    msg === 'offline_existing_intent_reconciliation_required' ||
    msg === 'offline_device_revocation_requires_online_check'
  ) {
    return {
      needsSessionReconcile: false,
      message: 'Nhật ký offline trên thiết bị đang có lệnh cần đối soát. Mở mục Đồng bộ để kiểm tra trước khi tải lại.',
    };
  }
  if (status === 401 || msg === 'offline_session_changed' || msg === 'crew_session_invalid') {
    return {
      needsSessionReconcile: false,
      message: 'Phiên đăng nhập đã hết hạn hoặc thay đổi. Vui lòng đăng nhập lại rồi thử tải dữ liệu.',
    };
  }
  if (status === 403 || apiCode === 'access_forbidden' || msg === 'offline_assignment_required') {
    return {
      needsSessionReconcile: false,
      message: 'Bạn không còn quyền hoặc chưa được phân công nhiệm vụ này để tải dữ liệu offline.',
    };
  }
  if (status === 404 || apiCode === 'not_found') {
    return {
      needsSessionReconcile: false,
      message: 'Không tìm thấy nhiệm vụ hoặc nguồn dữ liệu trên máy chủ.',
    };
  }
  if (msg === 'offline_location_source_unavailable' || apiCode === 'offline_location_source_unavailable') {
    return {
      needsSessionReconcile: false,
      message: 'Nhiệm vụ chưa có dữ liệu tuyến đường hoặc tọa độ hợp lệ trên máy chủ để tải offline.',
    };
  }
  if (msg === 'repair_snapshot_source_unavailable' || apiCode === 'repair_snapshot_source_unavailable' || apiCode === 'repair_adapter_not_ready') {
    return {
      needsSessionReconcile: false,
      message: 'Nguồn dữ liệu sửa chữa trên máy chủ chưa sẵn sàng để tải offline.',
    };
  }
  if (status === 409 || status === 412 || apiCode === 'source_not_ready' || apiCode === 'concurrency_conflict' || apiCode === 'precondition_required') {
    return {
      needsSessionReconcile: false,
      message: 'Dữ liệu nhiệm vụ trên máy chủ đã thay đổi hoặc chưa sẵn sàng. Hãy tải lại chi tiết nhiệm vụ rồi thử lại.',
    };
  }
  if (msg === 'offline_assignment_not_active') {
    return {
      needsSessionReconcile: false,
      message: 'Trạng thái nhiệm vụ hiện tại không cho phép tải dữ liệu làm việc offline.',
    };
  }
  if (msg === 'BLOCKED_NATIVE' || msg === 'offline_device_key_mismatch') {
    return {
      needsSessionReconcile: false,
      message: 'Thiết bị chưa đáp ứng điều kiện khóa bảo mật hoặc khóa ký không khớp. Dữ liệu đã lưu được giữ nguyên.',
    };
  }
  if (!err?.response && (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED' || /network|timeout/i.test(msg))) {
    return {
      needsSessionReconcile: false,
      message: 'Không kết nối được tới máy chủ. Kiểm tra mạng rồi thử lại; dữ liệu đã lưu được giữ nguyên.',
    };
  }
  return {
    needsSessionReconcile: false,
    message: 'Chưa tải xong dữ liệu nhiệm vụ. Lệnh và dữ liệu đã lưu được giữ nguyên; kiểm tra kết nối và mục Đồng bộ trước khi thử lại.',
  };
}

/** User initiated, scoped to the assigned task. No registration/mutation on mount. */
export function CrewOfflinePreparation({projectId,taskId}:{projectId:string;taskId:string}) {
  const [identity]=useState(currentQueueIdentity),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const [needsSessionReconcile,setNeedsSessionReconcile]=useState(false);
  const running=useRef(false),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  if(!identity||!sameQueueIdentity(identity))return null;
  let available=true;
  try {requireOfflineNativeAcceptance(identity);}catch {available=false;}
  const download=async()=>{
    if(running.current||!sameQueueIdentity(identity))return;
    running.current=true;setBusy(true);setNotice('');
    try {
      const result = await downloadCrewOfflineTaskDetailed(identity,projectId,taskId);
      if(mounted.current&&sameQueueIdentity(identity)){
        setNeedsSessionReconcile(false);
        setNotice(result.editorReady
          ? 'Đã lưu dữ liệu nhiệm vụ và nguồn biểu mẫu đo kiểm trên thiết bị.'
          : 'Đã lưu dữ liệu ký offline, nhưng chưa tải đủ thông tin chi tiết cho biểu mẫu. Kiểm tra kết nối và thử tải lại.');
      }
    }catch(error) {
      if(mounted.current&&sameQueueIdentity(identity)){
        const parsed=offlinePreparationError(error);
        setNeedsSessionReconcile(parsed.needsSessionReconcile);
        setNotice(parsed.message);
      }
    }finally {running.current=false;if(mounted.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  const reconcileSession=async()=>{
    if(running.current||!sameQueueIdentity(identity))return;
    running.current=true;setBusy(true);setNotice('');
    try {
      await reconcileDeviceSessionForProject(identity,projectId,taskId);
      const result = await downloadCrewOfflineTaskDetailed(identity,projectId,taskId);
      if(mounted.current&&sameQueueIdentity(identity)){
        setNeedsSessionReconcile(false);
        setNotice(result.editorReady
          ? 'Đã đối soát thiết bị và lưu dữ liệu nhiệm vụ trên thiết bị.'
          : 'Đã đối soát thiết bị và lưu dữ liệu ký offline, nhưng chưa tải đủ thông tin chi tiết cho biểu mẫu.');
      }
    }catch(error){
      if(mounted.current&&sameQueueIdentity(identity)){
        const parsed=offlinePreparationError(error);
        setNeedsSessionReconcile(parsed.needsSessionReconcile);
        setNotice(parsed.message);
      }
    }finally {running.current=false;if(mounted.current&&sameQueueIdentity(identity))setBusy(false);}
  };
  return <Card style={styles.card}>
    <Text style={typography.titleMd}>Chuẩn bị làm việc offline</Text>
    <Text style={styles.body}>{available?'Tải dữ liệu nhiệm vụ trước khi ra hiện trường. Ứng dụng đăng ký thiết bị và đối chiếu dữ liệu với máy chủ.':'Bản ứng dụng này chưa đủ điều kiện ký dữ liệu offline. Nháp hiện có vẫn được giữ nguyên.'}</Text>
    <Button title="Tải dữ liệu nhiệm vụ" variant="secondary" disabled={!available||busy} loading={busy} onPress={()=>void download()}/>
    {needsSessionReconcile?<Button title="Đối soát thiết bị với phiên hiện tại" variant="secondary" disabled={!available||busy} loading={busy} onPress={()=>void reconcileSession()}/>:null}
    {notice?<Text accessibilityLiveRegion="polite" style={styles.body}>{notice}</Text>:null}
  </Card>;
}
const styles=StyleSheet.create({card:{gap:spacing.sm,marginBottom:spacing.md},body:{...typography.bodyMd,color:colors.secondary}});
