#!/usr/bin/env node
'use strict';

// update-lint-hash：重新计算 facts-lint 自检哈希并写回 AGENTS.md 登记行。
// 改过 tools/tests/facts-lint.test.cjs 后必须跑一次（否则自检红——这是刻意的留痕机制）。
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');

const LINT = path.join(ROOT, 'tools', 'tests', 'facts-lint.test.cjs');
if (!fs.existsSync(LINT)) { console.error('找不到 ' + LINT); process.exit(1); }
const hash = crypto.createHash('sha256')
  .update(fs.readFileSync(LINT, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n')).digest('hex');

const ap = path.join(ROOT, 'AGENTS.md');
const a = fs.readFileSync(ap, 'utf8');
const re = /facts-lint 自检 sha256：[0-9a-f]{64}/;
if (!re.test(a)) { console.error('AGENTS.md 缺少登记行（格式：facts-lint 自检 sha256：<64hex>）'); process.exit(1); }
fs.writeFileSync(ap, a.replace(re, 'facts-lint 自检 sha256：' + hash));
console.log('AGENTS.md 登记值已更新为 ' + hash);
