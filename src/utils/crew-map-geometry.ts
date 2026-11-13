/** API-087 route preview only. Never a defect destination or a CRS transformation. */
export function crewRouteCoordinates(route:{spatialSrid:number;wkt:string}):[number,number][] {
  if(route.spatialSrid!==4326||typeof route.wkt!=='string'||route.wkt.length>200000)return [];
  const match=/^\s*LINESTRING\s*\(([^()]+)\)\s*$/i.exec(route.wkt);
  if(!match)return [];
  const coordinates:[number,number][]=[];
  const number='[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)(?:[eE][+-]?\\d+)?';
  const pair=new RegExp(`^\\s*(${number})\\s+(${number})\\s*$`);
  for(const token of match[1].split(',')) {
    const p=pair.exec(token);if(!p)return [];
    const lon=Number(p[1]),lat=Number(p[2]);
    if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>90)return [];
    coordinates.push([lon,lat]);
  }
  return coordinates.length>=2?coordinates:[];
}
