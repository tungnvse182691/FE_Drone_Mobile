// Explicit synthetic camera metadata for store/protocol tests; no native claim.
exports.cameraDraftFixture = input => ({...input, capturePolicy:'CAMERA_FIRST_GPS_V1', photos:input.photos.map((p,index)=>({
 ...p, captureRole:p.captureRole??(index===0?'PRIMARY':'SECONDARY'),
 photoLocation:p.photoLocation===undefined?(index===0?input.coords??null:null):p.photoLocation,
 locationSource:p.locationSource??(index===0&&input.coords?'CAPTURE':'UNKNOWN'),
}))});
