// Public-checkout verification: Node only, no network or dependency install.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');

function run(args) {
  const result = spawnSync(process.execPath, args, {cwd:root, stdio:'inherit'});
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Failed: node ${args.join(' ')}`);
}

for (const file of fs.readdirSync(root).filter(name => name.endsWith('.js'))) run(['--check',file]);
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
assert.equal(ids.length,new Set(ids).size,'Duplicate HTML ID');
for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
  const ref = match[1];
  if (/^(?:#|https?:|data:)/.test(ref)) continue;
  assert.ok(fs.existsSync(path.join(root,ref.split(/[?#]/)[0])),`Missing asset: ${ref}`);
}
for (const file of fs.readdirSync(path.join(root,'data')).filter(name=>name.endsWith('.json'))) {
  const data=JSON.parse(fs.readFileSync(path.join(root,'data',file),'utf8'));
  assert.ok(data.snapshotAt && data.generatedAt,`Missing timestamps: ${file}`);
}
run(['--test','tests/frontend.test.cjs']);
console.log('Public website checks passed.');
