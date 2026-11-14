const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function parser(){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/utils/crew-map-geometry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports});return module.exports;}
const line={type:'LineString',coordinates:[[106.5,10.5],[106.6,10.6]]};
test('Crew uses explicit WGS84 even when source WKT is UTM 32648',()=>{
 assert.equal(JSON.stringify(parser().crewRouteCoordinates({spatialSrid:32648,wkt:'LINESTRING (500000 1200000, 500100 1200000)',wgs84Geometry:line})),JSON.stringify(line.coordinates));
});
test('Crew skips null, unsupported or malformed WGS84 without metric/WKT fallback',()=>{
 const parse=parser().crewRouteCoordinates;
 for(const shape of [null,undefined,{type:'Point',coordinates:[106,10]},{type:'LineString',coordinates:[[106,10]]},{type:'LineString',coordinates:[[106,10],[181,10]]},{type:'LineString',coordinates:[[106,10],[107,NaN]]},{type:'LineString',coordinates:[[106,10,1],[107,10,1]]}])
  assert.equal(parse({spatialSrid:4326,wkt:'LINESTRING (106 10, 107 10)',wgs84Geometry:shape}).length,0);
});
test('Crew destination is only the bounded explicit defect target',()=>{
 const parse=parser().crewDefectCoordinates;
 assert.equal(JSON.stringify(parse({longitude:106.5,latitude:10.5})),JSON.stringify({longitude:106.5,latitude:10.5}));
 for(const target of [null,undefined,{longitude:181,latitude:10},{longitude:106,latitude:91},{longitude:'106',latitude:10},{longitude:NaN,latitude:10}])assert.equal(parse(target),null);
});
