const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

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
