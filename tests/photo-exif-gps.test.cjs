const {test}=require('node:test'),assert=require('node:assert/strict');
const {harness}=require('./helpers/roadfe-screen.cjs');
const {photo}=require('./helpers/photo-exif.cjs');
test('reads original JPEG GPS for both byte orders and hemispheres',()=>{
 const {readPhotoGps}=harness().load('src/utils/photoGps.ts');
 for(const little of [true,false])assert.deepEqual(readPhotoGps(photo({little,lat:'S',lon:'W'})),{latitude:-10.5,longitude:-106.25,accuracyMeters:null});
});
test('missing, truncated, invalid references and zero denominators never invent a location',()=>{
 const {readPhotoGps}=harness().load('src/utils/photoGps.ts');
 for(const bytes of [Buffer.alloc(0),Buffer.from([255,216,255]),photo({lat:'X'}),photo({denominator:0}),photo().subarray(0,90)])assert.equal(readPhotoGps(bytes),null);
 for(let n=0;n<photo().length;n++)assert.doesNotThrow(()=>readPhotoGps(photo().subarray(0,n)));
});


test('PNG eXIf reads original GPS; invalid TIFF offsets and ranges are unavailable',()=>{
 const {readPhotoGps}=harness().load('src/utils/photoGps.ts');
 const jpeg=photo(),tiff=jpeg.subarray(12,jpeg.length-2),size=Buffer.alloc(4);size.writeUInt32BE(tiff.length);
 const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),size,Buffer.from('eXIf'),tiff,Buffer.alloc(4)]);
 assert.deepEqual(readPhotoGps(png),{latitude:10.5,longitude:106.25,accuracyMeters:null});
 const corrupt=Buffer.from(jpeg);corrupt.writeUInt32LE(0xffffffff,16);assert.equal(readPhotoGps(corrupt),null);
 const range=Buffer.from(jpeg);range.writeUInt32LE(91,92);assert.equal(readPhotoGps(range),null);
});
