import type { GeometryPackageViewDto, GeometryShapeDto, SurveyGeometryRefDto } from './droneApi';
import { mapCoordinate } from '../components/map/mapWebViewSafety';

/** API-104 output is GeoJSON-shaped. Never reinterpret engineering metres as WGS84. */
function wgsLine(shape: GeometryShapeDto | null | undefined): [number, number][] {
  const coordinates = shape?.coordinates;
  if (shape?.type !== 'LineString' || !Array.isArray(coordinates) || coordinates.length < 2 ||
      !coordinates.every(mapCoordinate)) return [];
  return coordinates.map(point => [...point] as [number, number]);
}

export function operatorMapSegments(ref: SurveyGeometryRefDto, geometry: GeometryPackageViewDto) {
  if (geometry.route.routeVersionId !== ref.routeVersionId || geometry.segmentSet.id !== ref.segmentSetId ||
      geometry.segmentSet.routeVersionId !== ref.routeVersionId) throw Error('geometry_source_mismatch');
  // Keep separate segments separate. Connecting their endpoints would invent survey coverage.
  return ref.segmentIds.map(id => {
    const segment = geometry.segmentSet.segments.find(value => value.id === id);
    return { id, sequence: segment?.sequence ?? null, coordinates: wgsLine(segment?.wgs84Geometry) };
  });
}
