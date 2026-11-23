// TIFF GPS IFD, with signed hemispheres and rational degrees/minutes/seconds.
function photo({little=true,lat='N',lon='E',denominator=1}={}) {
 const t=Buffer.alloc(150);const u16=(p,n)=>little?t.writeUInt16LE(n,p):t.writeUInt16BE(n,p);
 const u32=(p,n)=>little?t.writeUInt32LE(n,p):t.writeUInt32BE(n,p);
 t.write(little?'II':'MM');u16(2,42);u32(4,8);u16(8,1);
 u16(10,0x8825);u16(12,4);u32(14,1);u32(18,26);u16(26,4);
 const entry=(i,tag,type,count,value)=>{const p=28+i*12;u16(p,tag);u16(p+2,type);u32(p+4,count);u32(p+8,value);};
 entry(0,1,2,2,0);t.write(lat,36);entry(1,2,5,3,80);
 entry(2,3,2,2,0);t.write(lon,60);entry(3,4,5,3,104);
 [10,30,0,106,15,0].forEach((n,i)=>{u32(80+i*8,n);u32(84+i*8,denominator);});
 const payload=Buffer.concat([Buffer.from('Exif\0\0'),t]),len=Buffer.alloc(2);len.writeUInt16BE(payload.length+2);
 return Buffer.concat([Buffer.from([255,216,255,225]),len,payload,Buffer.from([255,217])]);
}
module.exports={photo};
