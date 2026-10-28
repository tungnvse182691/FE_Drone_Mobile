/** Direct-sync boundary validation; no private keys and no native signing fallback. */
export type DigestProvider = (bytes: Uint8Array) => Promise<Uint8Array>;
export type VerifyProvider = (key:Uint8Array,digest:Uint8Array,signature:Uint8Array) => Promise<boolean>;
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function offlineBase64(v:string):Uint8Array {
 if(!v||v.length>172||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v))throw Error('offline_base64_invalid');
 const result:number[]=[];let bits=0,n=0;
 for(const c of v.replace(/=/g,'')) {bits=(bits<<6)|alphabet.indexOf(c);n+=6;if(n>=8){n-=8;result.push((bits>>n)&255);}}
 if(n&&(bits&((1<<n)-1)))throw Error('offline_base64_noncanonical');if(result.length>128)throw Error('offline_base64_bound');return new Uint8Array(result);
}
export function offlineSigningPublicKey(v:string):Uint8Array {
 const b=offlineBase64(v),prefix='3059301306072a8648ce3d020106082a8648ce3d03010703420004';
 if(b.length!==91||Array.from(b.slice(0,27),x=>x.toString(16).padStart(2,'0')).join('')!==prefix)throw Error('offline_p256_spki_required');
 return b; // Provider must additionally validate EC point membership.
}
export function offlineP1363(v:string):Uint8Array {const b=offlineBase64(v);if(b.length!==64)throw Error('offline_p1363_required');return b;}
export async function directSyncDigest(claim:Uint8Array,sha:DigestProvider):Promise<Uint8Array> {
 if(claim.length<1||claim.length>16*1024*1024)throw Error('offline_claim_bound');
 const purpose=new Uint8Array(Array.from('roadguard.h5.direct-sync.v1\0',c=>c.charCodeAt(0))),bytes=new Uint8Array(purpose.length+claim.length);
 bytes.set(purpose);bytes.set(claim,purpose.length);const digest=await sha(bytes);if(digest.length!==32)throw Error('offline_sha256_required');return digest;
}
export async function verifyDirectSyncClaim(claim:Uint8Array,signature:string,publicKey:string,sha:DigestProvider,verify:VerifyProvider):Promise<boolean> {
 const key=offlineSigningPublicKey(publicKey),sig=offlineP1363(signature);return verify(key,await directSyncDigest(claim,sha),sig);
}
