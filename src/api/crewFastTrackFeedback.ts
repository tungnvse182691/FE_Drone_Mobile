import type { FieldMeasurementInput, FieldPositionProofInput, FieldTaskViewFact, RepairEligibilityReadView } from './crewApi';
import type { FieldDraft } from './crewFieldDraft';

export const measurementNames: Record<string,string> = {
  Area:'Diện tích hư hại', SlabFaultingHeight:'Độ chênh tấm', ShoulderErosionExtent:'Kích thước xói lở',
  DepressionDepth:'Độ sâu chỗ lõm', DepressionLength:'Chiều dài chỗ lõm', DepressionWidth:'Chiều rộng chỗ lõm',
};
const measurementTypes = ['', 'DepressionDepth','SlabFaultingHeight','ShoulderErosionExtent','Area','DepressionLength','DepressionWidth'];
export type DraftIssue = { section:'measurements'|'position'|'evidence'; message:string; sampleId?:string; invalid?:boolean };
/** Local guidance only. UNKNOWN with an explicit reason remains a valid declaration. */
export function measurementDraftIssues(measurements: readonly FieldMeasurementInput[]): DraftIssue[] {
  const issues:DraftIssue[]=[];
  if(!measurements.length)issues.push({section:'measurements',message:'Thêm số đo hiện trường.',invalid:true});
  for(const m of measurements){
    const name=measurementNames[m.type]??'Số đo thực tế';
    const add=(message:string,invalid=false)=>issues.push({section:'measurements',sampleId:m.sampleId,message:`${name}: ${message}`,invalid});
    if(!m.instrument?.trim())add('nhập dụng cụ đo thực tế.',true);
    if(!m.method?.trim())add('nhập phương pháp đo thực tế.',true);
    if(!m.unit?.trim()||!m.dimension?.trim())add('kiểm tra đơn vị và đại lượng đo.',true);
    if(m.value===null){add('chưa xác định giá trị; giữ nguyên nếu chưa đo được.');if(m.state!=='UNKNOWN'||!m.unknownReason?.trim())add('ghi lý do chưa đo.',true);}
    else if(m.state!=='KNOWN'||!Number.isFinite(m.value)||m.value<0)add('nhập số thực tế từ 0 trở lên.',true);
    if(m.latitude==null||m.longitude==null){if(!m.locationReason?.trim())add('ghi lý do chưa có tọa độ quan sát.',true);}
    else if(!Number.isFinite(m.latitude)||!Number.isFinite(m.longitude)||Math.abs(m.latitude)>90||Math.abs(m.longitude)>180)add('tọa độ quan sát không hợp lệ.',true);
  }
  return issues;
}
function positionIssues(proof:FieldPositionProofInput|null,task:FieldTaskViewFact):DraftIssue[] {
  const add=(message:string):DraftIssue[]=>[{section:'position',message}];
  if(!proof||proof.kind==='UNKNOWN')return add('Bổ sung vị trí quan sát và đối chiếu dấu mốc thực tế.');
  if(proof.kind==='GPS_CAPTURE')return add('GPS chưa đủ xác nhận vị trí với nhiệm vụ; đối chiếu ký hiệu tấm, phân đoạn hoặc lý trình.');
  if(proof.kind!=='POSITION_CHECKLIST'||proof.longitude!=null||proof.latitude!=null)return add('Kiểm tra nguồn vị trí và thông tin đối chiếu đang mâu thuẫn.');
  if(task.slabId)return proof.checklist==='SLAB_MARKINGS_CONFIRMED'&&!!task.layoutRevisionId&&proof.observedSlabId===task.slabId?[]:add('Đối chiếu và nhập đúng ký hiệu tấm của nhiệm vụ.');
  if(proof.checklist==='SEGMENT_MARKINGS_CONFIRMED'&&task.segmentSetId&&proof.observedSegmentId&&Number.isFinite(proof.observedChainageMeters)&&proof.observedChainageMeters!>=0)return [];
  if(proof.checklist==='ROUTE_CHAINAGE_MARKINGS_CONFIRMED'&&!!task.routeVersionId&&proof.observedRouteVersionId===task.routeVersionId&&Number.isFinite(proof.observedChainageMeters)&&proof.observedChainageMeters!>=0)return [];
  return add('Chọn nguồn đối chiếu vị trí và nhập phân đoạn/lý trình đã quan sát.');
}
/** Caller must supply the exact actor/session/environment/task draft and guarded task read. */
export function fastTrackDraftIssues(draft:Pick<FieldDraft,'measurements'|'captures'|'locationProof'>,task:FieldTaskViewFact,view?:RepairEligibilityReadView|null):DraftIssue[]{
  const issues=measurementDraftIssues(draft.measurements);
  const required=measurementTypes[task.requiredMeasurementType];
  if(required&&!draft.measurements.some(m=>m.type===required))issues.push({section:'measurements',message:`Thêm ${measurementNames[required]} theo yêu cầu nhiệm vụ.`});
  const rules=view?.rules;
  const usable=view?.policyState==='CONFIGURED'&&!!view.policyRevisionId&&!!view.policyContentHash&&!view.missingReasons.some(r=>r==='PINNED_POLICY_SOURCE_MISMATCH'||r==='POLICY_UNAVAILABLE')&&Array.isArray(rules)&&rules.length>0&&new Set(rules.map(r=>r.code)).size===rules.length&&rules.every(r=>r.code?.trim()&&r.unit?.trim()&&Number.isFinite(r.minimum)&&Number.isFinite(r.maximum)&&r.minimum>=0&&r.maximum>=r.minimum);
  if(usable)for(const rule of rules!){
    const matches=draft.measurements.filter(m=>m.type===rule.code),name=measurementNames[rule.code]??`Loại đo theo chính sách (${safeReasonCode(rule.code)})`;
    if(matches.length!==1){issues.push({section:'measurements',message:`${name}: cần đúng một số đo theo chính sách nhiệm vụ.`});continue;}
    const m=matches[0],range=`${String(rule.minimum).replace('.',',')}–${String(rule.maximum).replace('.',',')} ${rule.unit}`;
    if(m.unit!==rule.unit)issues.push({section:'measurements',sampleId:m.sampleId,message:`${name}: chính sách dùng ${rule.unit}, đang nhập ${m.unit}. Đối chiếu đúng đơn vị; không tự đổi số đo.`});
    else if(m.value!==null&&Number.isFinite(m.value)&&(m.value<rule.minimum||m.value>rule.maximum))issues.push({section:'measurements',sampleId:m.sampleId,message:`${name}: ngoài khoảng ${range}. Giữ số đo thật để máy chủ đánh giá.`});
  }
  issues.push(...positionIssues(draft.locationProof,task));
  const captures=draft.captures.filter(c=>c.purpose!=='AFTER');
  if(!captures.length)issues.push({section:'evidence',message:'Chụp ảnh hiện trạng trước sửa hoặc ảnh đo kiểm.'});
  captures.forEach((c,index)=>{if(c.cancelState||!c.verified||c.upload?.status!=='VERIFIED')issues.push({section:'evidence',message:`Ảnh ${index+1}: ${c.cancelState?'cần đối soát hủy tải':'tải lên và chờ máy chủ xác minh'}.`});});
  return issues;
}
export function safeReasonCode(reason:string){return reason.replace(/[^A-Za-z0-9_-]/g,'').slice(0,80)||'UNKNOWN';}
const reasons:Record<string,[string,'crew'|'server']>={
  ASSESSMENT_REQUIRED:['Chưa có đánh giá trên máy chủ. Lưu số đo, tải ảnh rồi gửi đánh giá trước sửa.','crew'],
  MEASUREMENT_MISSING:['Bổ sung số đo hiện trường.','crew'], REQUIRED_MEASUREMENT_MISSING:['Bổ sung loại đo nhiệm vụ yêu cầu.','crew'],
  MEASUREMENT_VALUE_UNKNOWN:['Có số đo chưa xác định; đo thực tế hoặc giữ lý do chưa đo.','crew'],
  LOCATION_UNKNOWN:['Bổ sung vị trí quan sát.','crew'], GPS_SOURCE_BINDING_UNAVAILABLE:['GPS chưa liên kết được nhiệm vụ; đối chiếu dấu mốc vị trí.','crew'],
  LOCATION_PROOF_CONTRADICTORY:['Kiểm tra nguồn vị trí đang mâu thuẫn.','crew'], POSITION_CHECKLIST_INSUFFICIENT:['Đối chiếu đúng tấm/phân đoạn/lý trình của nhiệm vụ.','crew'],
  EVIDENCE_MISSING:['Bổ sung ảnh trước sửa/đo kiểm.','crew'], EVIDENCE_UPLOAD_NOT_CREATED:['Tải ảnh đã lưu lên máy chủ.','crew'], EVIDENCE_PENDING:['Chờ xác minh ảnh rồi đọc lại kết quả.','crew'],
  ASSESSMENT_SOURCE_OR_LOCATION_UNVERIFIED:['Đánh giá chưa xác nhận nguồn/vị trí; kiểm tra hồ sơ và gửi đánh giá phù hợp.','crew'],
  MEASUREMENT_SOURCE_MISMATCH:['Nguồn số đo khác nhiệm vụ/vị trí hiện tại; tải lại nhiệm vụ, không sửa số đo để né kiểm tra.','server'],
  POLICY_MEASUREMENT_SOURCE_NOT_UNIQUE:['Chính sách chưa có đúng một số đo cho mỗi loại; kiểm tra loại đo trong hồ sơ.','crew'],
  STOP_CONDITION_OBSERVATION_UNKNOWN:['Chưa có quan sát điều kiện dừng theo chính sách. Liên hệ quản lý kiểm tra checklist được cấp; không tự xác nhận an toàn.','server'],
  CURRENT_EXECUTION_AUTHORITY_DENIED:['Phân công/quyền hiện tại không cho phép thi công. Tải lại nhiệm vụ; liên hệ quản lý nếu vẫn bị chặn.','server'],
  TEST_ONLY_SOURCE_NOT_EXECUTABLE:['Nguồn thử nghiệm không được phép thi công. Cần nguồn nghiệp vụ hợp lệ từ quản lý.','server'],
  ROAD_HANDOVER_MAPPING_UNKNOWN:['Chưa xác nhận bàn giao tuyến đường; quản lý cần kiểm tra nguồn bàn giao.','server'],
  COVERAGE_MAPPING_UNKNOWN:['Chưa có ánh xạ phạm vi bảo hành; quản lý cần xác nhận.','server'],
  NORMAL_FLOW_REQUIRES_SUPERVISOR_APPROVAL:['Hạng mục thuộc quy trình thường; dùng hồ sơ/phê duyệt của quy trình thường.','server'],
  COVERAGE_PARTIAL_OR_MISMATCH:['Phạm vi bảo hành không phủ đủ vị trí/thời gian; quản lý cần đối chiếu nguồn.','server'],
  COVERAGE_AMBIGUOUS:['Có nhiều nguồn phạm vi bảo hành mâu thuẫn; quản lý cần xác nhận nguồn áp dụng.','server'],
  SOURCE_STALE:['Nguồn bàn giao/bảo hành đã thay đổi; quản lý cần cập nhật ánh xạ.','server'],
  POLICY_UNAVAILABLE:['Chưa có chính sách khả dụng; quản lý cần công bố chính sách hợp lệ.','server'],
  PINNED_POLICY_SOURCE_MISMATCH:['Chính sách không khớp nguồn đã gắn; tải lại nhiệm vụ và báo quản lý.','server'],
  FIRST_START_NOT_VERIFIED:['Chưa xác nhận bắt đầu nhiệm vụ; kiểm tra/đối soát mốc bắt đầu trước.','crew'],
  EXECUTION_WINDOW_EXPIRED:['Đã hết thời gian thi công; liên hệ quản lý, không tự đổi thời điểm bắt đầu.','server'],
};
const enumReasons:Record<string,[string,'crew'|'server']>={
  NOTCONFIGURED:['Chưa cấu hình số đo chính sách; liên hệ quản lý.','server'], UNKNOWNMEASUREMENT:['Chưa có giá trị cho số đo chính sách yêu cầu.','crew'],
  WRONGUNIT:['Đơn vị đo khác chính sách; kiểm tra đơn vị thực tế.','crew'], THRESHOLDNOTMET:['Số đo ngoài ngưỡng sửa nhanh; giữ số đo thật, chuyển quản lý đánh giá.','crew'],
  STOPCONDITION:['Đã ghi nhận điều kiện phải dừng; không bắt đầu thi công, báo quản lý.','server'], MEASUREONLY:['Nhiệm vụ chỉ được đo; không được thi công.','server'],
  UNPROVENTIME:['Thời điểm bắt đầu chưa được xác minh; đối soát mốc bắt đầu.','crew'], EXPIRED:['Quyền thi công đã hết hạn; liên hệ quản lý.','server'],
  SCOPEMISMATCH:['Phạm vi phân công/quyền thi công không khớp; tải lại và báo quản lý.','server'], CURRENTAUTHORITYDENIED:['Quyền hiện tại bị từ chối; kiểm tra phân công với quản lý.','server'],
  ROADNOTHANDEDOVER:['Tuyến đường chưa được bàn giao; quản lý cần xác nhận.','server'], COVERAGEUNKNOWN:['Chưa xác định phạm vi bảo hành; quản lý cần đối chiếu.','server'],
  COVERAGEDENIED:['Phạm vi bảo hành không cho phép sửa nhanh; báo quản lý.','server'], POLICYUNAVAILABLE:['Chính sách không khả dụng; liên hệ quản lý.','server'],
  LOCATIONUNVERIFIED:['Vị trí chưa xác minh; kiểm tra dấu mốc trong hồ sơ.','crew'], CHECKLISTINCOMPLETE:['Checklist chưa đủ; kiểm tra hồ sơ và yêu cầu chính sách với quản lý.','crew'],
  REVOKED:['Quyền thi công đã bị thu hồi; dừng thao tác và báo quản lý.','server'],
};
export function fastTrackReason(reason:string){
  const entry=reasons[reason]??(/^(POLICY_|EXECUTION_)/.test(reason)?enumReasons[reason.replace(/^(POLICY_|EXECUTION_)/,'')]:undefined);
  return {code:safeReasonCode(reason),message:entry?.[0]??`Điều kiện chưa có diễn giải: ${safeReasonCode(reason)}. Gửi mã này cho quản lý để đối chiếu.`,owner:entry?.[1]??'server'};
}
