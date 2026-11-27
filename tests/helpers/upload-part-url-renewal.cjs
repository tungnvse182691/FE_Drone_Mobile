const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const moduleUnderTest = { exports: {} };
const source = fs.readFileSync('src/api/uploadPartUrlRenewal.ts', 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
vm.runInNewContext(outputText, { module: moduleUnderTest, exports: moduleUnderTest.exports });
module.exports = moduleUnderTest.exports;
