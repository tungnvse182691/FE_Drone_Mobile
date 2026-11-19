const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual JSX Back handler, isolated from native map providers and reads.
function backHandler(file, label, context) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handler;
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const attrs = node.attributes.properties;
      const attr = name => attrs.find(a => ts.isJsxAttribute(a) && a.name.text === name);
      if (attr('accessibilityLabel')?.initializer?.text === label) {
        handler = attr('onPress')?.initializer?.expression;
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(handler, `${file}: Back handler exists`);
  const code = ts.transpileModule(`const handler = ${handler.getText(source)};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return vm.runInNewContext(`${code}\nhandler;`, context);
}

for (const [file, label, map] of [
  ['src/components/crew/CrewTaskMap.tsx', 'Quay lại nhiệm vụ', true],
  ['app/(crew)/navigation.tsx', 'Quay lại', false],
]) {
  for (const history of [true, false]) {
    test(`${file}: Back ${history ? 'uses history' : 'replaces Detail with the current task and project'}`, () => {
      for (const [id, projectId] of [['task-A', 'project-A'], ['task-B', 'project-B']]) {
        const calls = [];
        const router = {
          canGoBack: () => history,
          back: () => calls.push(['back']),
          replace: route => calls.push(['replace', JSON.parse(JSON.stringify(route))]),
        };
        const handler = backHandler(file, label, {
          router, CREW_WO_DETAIL: '/(crew)/wo-detail',
          ...(map ? { taskId: id, projectId } : { task: { id, projectId } }),
        });
        handler();
        assert.deepEqual(calls, history ? [['back']] : [
          ['replace', { pathname: '/(crew)/wo-detail', params: { id, projectId } }],
        ]);
      }
    });
  }
}
