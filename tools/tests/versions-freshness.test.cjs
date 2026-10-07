'use strict';

// VERSIONS.md 新鲜度裁判：重新生成并与仓内版本比对，不一致即红。
// 这就是"生成物自带裁判"的实体——重跑即验尸。
const { test } = require('node:test');
const assert = require('assert');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

test('VERSIONS.md 是最新生成物', () => {
  if (!fs.existsSync(path.join(ROOT, '.git'))) return; // 非 git 环境（如打包分发）跳过
  const vp = path.join(ROOT, 'VERSIONS.md');
  const before = fs.existsSync(vp) ? fs.readFileSync(vp, 'utf8') : null;
  execSync('node tools/gen-versions.js', { cwd: ROOT, stdio: 'pipe' });
  const after = fs.readFileSync(vp, 'utf8');
  assert.strictEqual(after, before === null ? after : before,
    'VERSIONS.md 不是最新生成物：跑 node tools/gen-versions.js 并提交');
});
