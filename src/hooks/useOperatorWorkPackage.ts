import { useCallback, useEffect, useState } from 'react';
import { useOperatorReadScope } from './useOperatorReadScope';
import { readOperatorSnapshot } from '../api/operatorOfflineCache';
import { getOperatorWorkPackageReal, getOperatorGeometryPackageReal, type GeometryPackageViewDto, type SurveyTaskWorkPackageDto } from '../api/droneApi';
import { operatorMapSegments } from '../api/operatorMapGeometry';
import { messageFor } from '../api/errorCatalog';
import { parseProblemDetails } from '../api/problemDetails';

function operatorErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: unknown; status?: number } }).response;
  const code = parseProblemDetails(response?.data).code;
  if (code) {
    return messageFor(code);
  }
  return 'Không đọc được gói công việc. Vui lòng thử lại.';
}

/** Read-only task pins, cached snapshots and session continuity shared by detail and map. */
export function useOperatorWorkPackage(target: string) {
  const scope = useOperatorReadScope(target);
  const [dataScope, setDataScope] = useState<string | null>(null);

  const [workPackage, setWorkPackage] = useState<SurveyTaskWorkPackageDto | null>(null);
  const [geometries, setGeometries] = useState<GeometryPackageViewDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [geometryError, setGeometryError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    const isCurrent = scope.capture();
    if (!isCurrent()) return;
    setDataScope(scope.key);
    setWorkPackage(null);
    setGeometries([]);
    setLoading(true);
    setError(null);
    setCachedAt(null);
    setGeometryError(null);
    try {
      const wp = await readOperatorSnapshot(`work:${target}`, () => getOperatorWorkPackageReal(target));
      if (!isCurrent()) return;
      setWorkPackage(wp.data);
      setCachedAt(wp.cachedAt);
      if (wp.data.geometryRefs?.length && wp.data.task.projectId) {
        const loaded: GeometryPackageViewDto[] = [];
        for (const ref of wp.data.geometryRefs) {
          try {
            const gp = await readOperatorSnapshot(`geometry:${target}:${ref.routeVersionId}:${ref.segmentSetId}`, () => getOperatorGeometryPackageReal(wp.data.task.projectId, {
              routeVersionId: ref.routeVersionId,
              segmentSetId: ref.segmentSetId,
            }));
            if (!isCurrent()) return;
            if (gp.data.projectId !== wp.data.task.projectId || gp.data.route.routeVersionId !== ref.routeVersionId || gp.data.segmentSet.id !== ref.segmentSetId || gp.data.segmentSet.routeVersionId !== ref.routeVersionId) throw Error('geometry_source_mismatch');
            operatorMapSegments(ref, gp.data);
            loaded.push(gp.data);
            if (gp.cachedAt) setCachedAt(gp.cachedAt);
          } catch { if (isCurrent()) setGeometryError('Chưa đọc được hình học đã ghim. Thông tin nhiệm vụ vẫn được giữ.'); }
        }
        if (!isCurrent()) return;
        setGeometries(loaded);
      }
    } catch (err) {
      if (!isCurrent()) return;
      setError(operatorErrorMessage(err));
      setWorkPackage(null);
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [target, scope.key, scope.capture]);

  useEffect(() => {
    void load();
  }, [load]);

  return { scopeKey: scope.key, workPackage, geometries, loading: !scope.key || dataScope !== scope.key || loading, geometryError, error, cachedAt, reload: load };
}
