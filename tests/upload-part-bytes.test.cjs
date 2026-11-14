const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const axios = require('axios');

test('storage transport sends only each multipart view through the real Axios transform', async () => {
  const requests = [];
  const client = axios.create({ adapter: async config => {
    requests.push(config);
    return { data: '', status: 200, statusText: 'OK', headers: { etag: 'part-etag' }, config };
  } });
  const source = ts.transpileModule(fs.readFileSync('src/api/uploads.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', source)(name => {
    if (name === 'axios') return { create: () => client };
    if (name === 'expo-crypto') return {};
    if (name === './client') return { apiClient: {} };
    if (name === './problemDetails') return { parseProblemDetails: () => null };
    if (name === '../types/position') return {};
    throw new Error(`Unexpected dependency: ${name}`);
  }, module, module.exports);
  const bytes = Uint8Array.from([11, 22, 33, 44, 55, 66, 77]);
  const controller = new AbortController();
  for (const [index, view] of [bytes.subarray(0, 4), bytes.subarray(4)].entries()) {
    const result = await module.exports.httpUploadTransport.putPart(
      { partNumber: index + 1, url: 'https://storage.example.test/part' }, view, 'image/png', controller.signal,
    );
    assert.equal(result.eTag, 'part-etag');
    const request = requests[index];
    assert.deepEqual([...new Uint8Array(request.data)], [...view]);
    assert.equal(request.signal, controller.signal);
    assert.equal(request.headers.get('Content-Type'), 'image/png');
    assert.equal(request.headers.get('Authorization'), undefined);
  }
});
