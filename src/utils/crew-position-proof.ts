import type { FieldPositionProofInput, FieldTaskGeometry, FieldTaskViewFact } from '../api/crewApi';
import { isCrewResourceId } from '../api/crewApi';

export function crewPositionSources(task:FieldTaskViewFact|null|undefined,geometry:FieldTaskGeometry|null) {
  const segments=task&&geometry&&geometry.taskId===task.id&&geometry.projectId===task.projectId&&
    geometry.routeVersionId===task.routeVersionId&&geometry.segmentSetId===task.segmentSetId
    ?geometry.segments.filter(s=>isCrewResourceId(s.id)&&s.fromOffsetMeters!==null&&s.toOffsetMeters!==null&&
      Number.isFinite(s.fromOffsetMeters)&&Number.isFinite(s.toOffsetMeters)&&s.fromOffsetMeters>=0&&s.toOffsetMeters>=s.fromOffsetMeters):[];
  const choices:{value:string;label:string}[]=[];
  if(task?.slabId){
    if(task.layoutRevisionId)choices.push({value:'SLAB_MARKINGS_CONFIRMED',label:'Đối chiếu ký hiệu tấm'});
  }else if(task){
    if(isCrewResourceId(task.routeVersionId))choices.push({value:'ROUTE_CHAINAGE_MARKINGS_CONFIRMED',label:'Đối chiếu lý trình'});
    if(segments.length)choices.push({value:'SEGMENT_MARKINGS_CONFIRMED',label:'Đối chiếu phân đoạn'});
  }
  choices.push({value:'UNKNOWN',label:'Chưa xác định'});
  return {choices,segments};
}

/** Selecting a source is an explicit user action. It never confirms observed marks automatically. */
export function chooseCrewPosition(task:FieldTaskViewFact,value:string):FieldPositionProofInput|null {
  if(value==='UNKNOWN')return null;
  return {kind:'POSITION_CHECKLIST',checklist:value,
    ...(value==='ROUTE_CHAINAGE_MARKINGS_CONFIRMED'?{observedRouteVersionId:task.routeVersionId}:{})};
}

/** Editor guidance only. BE still evaluates the saved proof against current sources. */
export function crewPositionInputError(proof:FieldPositionProofInput|null,rawChainage:string,
  segments:FieldTaskGeometry['segments']):string|null {
  if(proof?.kind!=='POSITION_CHECKLIST')return null;
  if(proof.checklist==='SLAB_MARKINGS_CONFIRMED')return proof.observedSlabId?.trim()?null:'Nhập ký hiệu tấm đã đối chiếu.';
  if(!['SEGMENT_MARKINGS_CONFIRMED','ROUTE_CHAINAGE_MARKINGS_CONFIRMED'].includes(proof.checklist??''))return null;
  const raw=rawChainage.trim(),value=Number(raw.replace(',','.'));
  if(proof.checklist==='SEGMENT_MARKINGS_CONFIRMED') {
    const segment=segments.find(s=>s.id===proof.observedSegmentId);
    if(!segment)return 'Chọn phân đoạn đã đối chiếu.';
    const from=segment.fromOffsetMeters,to=segment.toOffsetMeters;
    if(from===null||to===null)return 'Chưa có phạm vi phân đoạn để đối chiếu.';
    if(!raw||!Number.isFinite(value)||value<from||value>to)return `Nhập lý trình trong khoảng ${from}–${to} m.`;
    return null;
  }
  return !raw||!Number.isFinite(value)||value<0?'Nhập lý trình quan sát thực tế.':null;
}
