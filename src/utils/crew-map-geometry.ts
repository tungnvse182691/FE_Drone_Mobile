/** Explicit API-080 destination only; never substitute GPS or a route centre. */
export function crewDefectCoordinates(target: unknown): {longitude:number;latitude:number}|null {
  const point=target as {longitude?:unknown;latitude?:unknown}|null|undefined;
  const longitude=point?.longitude,latitude=point?.latitude;
  return typeof longitude==='number'&&Number.isFinite(longitude)&&Math.abs(longitude)<=180&&
    typeof latitude==='number'&&Number.isFinite(latitude)&&Math.abs(latitude)<=90 ? {longitude,latitude}:null;
}
export interface CrewWgs84Line {type:string;coordinates:unknown}
/** API-087 explicit WGS84 layer; source SRID/WKT is not a geographic fallback. */
export function crewRouteCoordinates(route:{wgs84Geometry?:CrewWgs84Line|null}):[number,number][] {
  const shape=route.wgs84Geometry,points=shape?.coordinates;
  if(shape?.type!=='LineString'||!Array.isArray(points)||points.length<2||points.length>100000)return [];
  const coordinates:[number,number][]=[];
  for(const point of points) {
    if(!Array.isArray(point)||point.length!==2||!crewDefectCoordinates({longitude:point[0],latitude:point[1]}))return [];
    coordinates.push([point[0],point[1]]);
  }
  return coordinates;
}
