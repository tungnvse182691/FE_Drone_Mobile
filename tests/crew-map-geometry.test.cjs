const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function parser(){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/crew-map-geometry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});return module.exports.crewRouteCoordinates;}
test('Crew map accepts explicit WGS84 LINESTRING with longitude first',()=>{
 assert.equal(JSON.stringify(parser()({spatialSrid:4326,wkt:'LINESTRING (106.5 10.5, 106.6 10.6)'})),JSON.stringify([[106.5,10.5],[106.6,10.6]]));
});
test('Crew map refuses projected, malformed and unsupported geometry without inventing coordinates',()=>{
 const parse=parser();for(const route of [
  {spatialSrid:32648,wkt:'LINESTRING (500000 1200000, 500100 1200000)'},
  {spatialSrid:4326,wkt:'LINESTRING (106 10, 181 10)'},
  {spatialSrid:4326,wkt:'LINESTRING (106 10, NaN 10)'},
  {spatialSrid:4326,wkt:'LINESTRING (106 10, 107 10) trailing'},
  {spatialSrid:4326,wkt:'POINT (106 10)'},
  {spatialSrid:4326,wkt:'LINESTRING Z (106 10 2, 107 10 3)'},
 ])assert.equal(parse(route).length,0);
});
