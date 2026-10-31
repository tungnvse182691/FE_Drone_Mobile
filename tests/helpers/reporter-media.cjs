const {createHash,randomUUID}=require('node:crypto');
const jpeg=Uint8Array.from([255,216,255,224,1,2,255,217]);
const png=Uint8Array.from([137,80,78,71,13,10,26,10,1,2]);
// Native boundary only. Production admission, hashing and screen handlers execute unchanged.
function mediaRuntime(options={}) {
 const files=new Map(),events=[];
 const uriOf=v=>typeof v==='string'?v:v.uri;
 class File {
  constructor(...parts){this.uri=parts.map(uriOf).join('/');if(options.autoSources&&!this.uri.includes('private/documents')&&!files.has(this.uri))files.set(this.uri,/\.png$/i.test(this.uri)?png:jpeg);}
  get exists(){return files.has(this.uri);}
  get size(){return options.size??files.get(this.uri)?.length??0;}
  async bytes(){events.push('read');if(options.read)await options.read();if(options.fail==='read')throw Error('private native path');return files.get(this.uri)?.slice()??Promise.reject(Error('missing'));}
  async arrayBuffer(){return (await this.bytes()).buffer;}
  write(bytes){events.push('write');if(options.fail==='write')throw Error('private native path');files.set(this.uri,options.corrupt?jpeg:bytes.slice());}
  move(to){events.push('move');if(options.fail==='move')throw Error('private native path');files.set(to.uri,files.get(this.uri));files.delete(this.uri);this.uri=to.uri;}
 }
 class Directory {constructor(...parts){this.uri=parts.map(uriOf).join('/');} create(){events.push('directory');if(options.fail==='directory')throw Error('private native path');}}
 const modules={'expo-file-system':{File,Directory,Paths:{document:'file://private/documents'}},
  'expo-crypto':{randomUUID,CryptoDigestAlgorithm:{SHA256:'sha256'},digest:async(_,bytes)=>{events.push('hash');if(options.hash)await options.hash();return Uint8Array.from(createHash('sha256').update(bytes).digest()).buffer;}}};
 const h=require('./roadfe-screen.cjs').harness({modules});
 return {h,modules,files,events,load:()=>h.load('src/api/reporterLocalMedia.ts')};
}
module.exports={mediaRuntime,jpeg,png};
