import * as api from './crewApi';
import { crewReadGuard } from './crewSafetyWorkflow';
import type { QueueIdentity } from '../offline/upload-queue';

/** API-080 supplies the current assignment; API-146 is a read, never execution authority. */
export async function readAssignedFastTrackEligibility(identity: QueueIdentity, projectId: string, taskId: string) {
  crewReadGuard(identity);
  const before = await api.getFieldInspectionTaskDetailReal(projectId,taskId);
  crewReadGuard(identity);
  api.validateCrewTaskDetail(before.data,before.etag,projectId,taskId,identity.actor);
  api.validateFastTrackRepairContext(before.data,projectId,taskId,identity.actor,before.etag);
  const context = before.data.repairContext!;
  const result = await api.getRepairEligibilityReal(projectId,context.packageId,context.itemId);
  crewReadGuard(identity);
  const view = result.data;
  if (!view || view.itemId !== context.itemId || view.bindingId !== context.bindingId ||
      typeof view.eligible !== 'boolean' || !Array.isArray(view.missingReasons) ||
      !view.missingReasons.every(reason=>typeof reason==='string' && !!reason.trim()) ||
      view.eligible !== (view.missingReasons.length===0) || view.activation !== (view.eligible?'ELIGIBLE':'INELIGIBLE') ||
      !/^h4-eligibility-v1-[a-f0-9]{64}$/.test(view.version) || result.etag !== `"${view.version}"`) {
    throw Error('fasttrack_eligibility_invalid');
  }
  const after = await api.getFieldInspectionTaskDetailReal(projectId,taskId);
  crewReadGuard(identity);
  api.validateCrewTaskDetail(after.data,after.etag,projectId,taskId,identity.actor);
  api.validateFastTrackRepairContext(after.data,projectId,taskId,identity.actor,after.etag);
  if (after.etag !== before.etag || after.data.assignmentId !== before.data.assignmentId ||
      (['packageId','itemId','bindingId','itemVersion'] as const).some(key=>after.data.repairContext![key]!==context[key])) {
    throw Error('crew_task_changed');
  }
  return {eligibility:view,itemVersion:context.itemVersion};
}
