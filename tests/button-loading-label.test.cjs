const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function renderButton(props) {
  const module = { exports: {} };
  const react = { createElement: (type, props, ...children) => ({ type, props, children }) };
  const code = ts.transpileModule(fs.readFileSync('src/components/Button.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => {
    if (name === 'react') return react;
    if (name === 'react-native') return { Pressable: 'Pressable', Text: 'Text', View: 'View', ActivityIndicator: 'Spinner', StyleSheet: { create: value => value } };
    if (name === '../design-tokens') return { colors: {}, radius: {}, spacing: {}, typography: {} };
    throw Error(name);
  } });
  return module.exports.Button({ variant: 'primary', onPress() {}, ...props });
}

test('native button keeps its Vietnamese action label in idle, busy and disabled states', () => {
  for (const state of [{}, { loading: false }, { loading: true }, { disabled: true }]) {
    const button = renderButton({ title: 'Gửi kiểm tra', ...state });
    assert.equal(button.props.accessibilityLabel, 'Gửi kiểm tra');
    assert.equal(button.props.accessibilityState.busy, !!state.loading);
    assert.equal(button.props.disabled, !!state.loading || !!state.disabled);
  }
});

test('Button loading preserves title, uses a small contrasting spinner and disables press', () => {
  const source = fs.readFileSync('src/components/Button.tsx', 'utf8');
  assert.match(source, /<Text[\s\S]*>\s*\{title\}\s*<\/Text>/);
  assert.match(source, /<ActivityIndicator size="small" color=\{variant === 'primary' \? colors\.neutral/);
  assert.match(source, /disabled=\{isDisabled\}/);
  assert.match(source, /busy: loading/);
  assert.match(source, /explicitlyDisabled && styles\.disabled/);
  assert.doesNotMatch(source, /loading \? \(\s*<ActivityIndicator/);
});

test('Button keeps explicit disabled styling separate from loading state', () => {
  const source = fs.readFileSync('src/components/Button.tsx', 'utf8');
  assert.match(source, /const explicitlyDisabled = !!disabled/);
  assert.match(source, /const isDisabled = explicitlyDisabled \|\| !!loading/);
  assert.match(source, /explicitlyDisabled && styles\.disabledText/);
  assert.match(source, /colors\.secondary\} \/> : null/);
});
