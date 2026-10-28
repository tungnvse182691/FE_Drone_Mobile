/** Pure validation at the native/WebView boundary; never interprets server text as markup. */
import type { MapMarker } from './RoadGuardMapLibre';
export function mapCoordinate(value: unknown): value is [number,number] {
  return Array.isArray(value)&&value.length===2&&value.every(v=>typeof v==='number'&&Number.isFinite(v))&&Math.abs(value[0])<=180&&Math.abs(value[1])<=90;
}
export function mapMarkers(values: unknown): MapMarker[] {
  if(!Array.isArray(values))return [];
  const ids=new Set<string>();
  return values.flatMap(v=>{
    if(!v||typeof v.id!=='string'||!v.id||v.id.length>256||ids.has(v.id)||typeof v.title!=='string'||!mapCoordinate(v.coordinate))return [];
    ids.add(v.id);
    return [{id:v.id,title:v.title.slice(0,2000),coordinate:[...v.coordinate] as [number,number],
      ...(typeof v.label==='string'?{label:v.label.slice(0,2000)}:{}),...(typeof v.subtitle==='string'?{subtitle:v.subtitle.slice(0,2000)}:{}),
      ...(['vehicle','defect','survey'].includes(v.type)?{type:v.type as MapMarker['type']}:{})}];
  });
}
export function mapScriptJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
}
export function mapDocument(url: unknown): boolean {return url==='about:blank';}
export function mapBridge(raw: unknown,url:unknown,markers:MapMarker[]): {type:'MARKER_CLICK';id:string}|{type:'ERROR'}|null {
  if(!mapDocument(url)||typeof raw!=='string'||raw.length>4096)return null;
  try {
    const data=JSON.parse(raw);
    if(!data||typeof data!=='object'||Array.isArray(data))return null;
    const keys=Object.keys(data).sort().join(',');
    if(data.type==='MARKER_CLICK'&&keys==='id,type'&&typeof data.id==='string'&&markers.some(m=>m.id===data.id))return {type:'MARKER_CLICK',id:data.id};
    if(data.type==='ERROR'&&keys==='type')return {type:'ERROR'};
  }catch{/* Untrusted message: ignore. */}
  return null;
}
