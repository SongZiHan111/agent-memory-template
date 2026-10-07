'use strict';

// 跨平台测试入口：自己枚举测试文件逐个传给 node --test，
// 不依赖 shell 通配符展开（Windows cmd/PowerShell 不展开）或 Node 版本的 glob 支持（21+ 才有）。
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'tests');
const files = fs.readdirSync(dir)
  .filter(f => f.endsWith('.test.cjs'))
  .map(f => path.join('tools', 'tests', f));
if (files.length === 0) {
  console.error('tools/tests/ 下没有 *.test.cjs 文件');
  process.exit(1);
}
const r = spawnSync(process.execPath, ['--test', ...files], {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});
process.exit(r.status === null ? 1 : r.status);
