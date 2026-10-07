'use strict';

// facts-lint — 记忆文档系统的格式裁判。随 `npm test`（node --test tools/tests/）运行。
// 强制：节名白名单 / "- " 单行条目 / 单条≤300字符 / 文件≤20KB/150行 / 禁用词 /
//       仓内指针存在性 / 档案孤儿检测 / AGENTS.md 节格式（可选，见下）/ 本文件自检哈希。
// 所有阈值集中在下方 CONFIG，按需改。改本文件后必须跑 `npm run update-hash` 重登记自检值，否则自检红——这是刻意的。

const { test } = require('node:test');
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

// ===================== CONFIG（按你的项目改这里，改完跑 npm run update-hash） =====================
const CONFIG = {
  MAX_BYTES: 20 * 1024,
  MAX_LINES: 150,
  MAX_BULLET_CHARS: 300,
  ROOT_SECTIONS: ['工程基线', '外部状态', '约定与文案', '环境', '测试与调试', '档案索引'],
  // 示例默认值，带明显项目形状——按你的项目改
  MODULE_SECTIONS: ['职责', '来源', '组成', '行为契约', '页面与路由', '对外 API', '依赖', '部署',
    '冒烟测试命令', '已知缺陷与环境坑', '档案索引'],
  // 半成品/未闭环措辞不许进现状文档（i：连 todo/Todo 一起拦）
  BANNED_WORDS: /未做|下一步|待办|暂不改|待用户|待验|待补|尚未|TODO|未验证|待定|终裁|已被.{0,20}取代/i,
  // 指针只允许仓内路径（防机器绑死/仓外漂移）：Windows 盘符、系统目录、Unix 家目录
  OUTSIDE_REPO: /[A-Za-z]:[\\/]|%TEMP%|AppData|\bDesktop\b|桌面|(^|\s)\/(tmp|home|Users)\/|(^|\s)~\/|\$HOME/i,
  // 仓内路径指针的合法前缀（按你的目录结构调整）；只扫描仓根下一层目录的 FACTS.md
  REPO_PATH_PREFIXES: ['src', 'docs', 'tools', 'scripts', 'assets', 'app', 'packages', 'config'],
  ARCHIVE_DIR: /^\d{8}-[a-z0-9-]+$/,
  SKIP_DIRS: new Set(['node_modules', 'build', 'dist', '.cache', '.git', '.idea', 'out']),
  // AGENTS.md 严格模式：含 <!-- facts-lint:R-ONLY --> 标记时，才强制"只允许 ## R<n> 节"与禁用词。
  // 已有自由格式 AGENTS.md 的项目接入时不要加该标记。
  AGENTS_STRICT_MARKER: /<!--\s*facts-lint:R-ONLY\s*-->/,
};
// =====================================================================

const readText = (p) => fs.readFileSync(p, 'utf8').replace(/^﻿/, '');
const REPO_PATH = new RegExp(
  "(?:^|[^\\w./-])((?:" + CONFIG.REPO_PATH_PREFIXES.join('|') + ")[/][^\\s\"'`()\\[\\]<>|，。；：、？！（）【】]*)", 'g');
const ARCHIVE_LINE = /^- docs\/(\d{8}-[a-z0-9-]+)\/ — \S/;

const indexed = new Set();

function factsFiles() {
  const files = [];
  if (fs.existsSync(path.join(ROOT, 'FACTS.md'))) files.push('FACTS.md');
  for (const ent of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!ent.isDirectory() || CONFIG.SKIP_DIRS.has(ent.name)) continue;
    const rel = ent.name + '/FACTS.md';
    if (fs.existsSync(path.join(ROOT, rel))) files.push(rel);
  }
  return files;
}

const structuralErrors = [];
const pointerErrors = [];
const files = factsFiles();

for (const rel of files) {
  const raw = readText(path.join(ROOT, rel));
  const lines = raw.split(/\r?\n/);
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  const allowed = rel === 'FACTS.md' ? CONFIG.ROOT_SECTIONS : CONFIG.MODULE_SECTIONS;
  const bytes = Buffer.byteLength(raw, 'utf8');
  if (bytes > CONFIG.MAX_BYTES) structuralErrors.push(`${rel}: ${bytes} bytes > ${CONFIG.MAX_BYTES}，压缩或删除代码能自证的条目`);
  if (lines.length > CONFIG.MAX_LINES) structuralErrors.push(`${rel}: ${lines.length} lines > ${CONFIG.MAX_LINES}`);
  if (!/^# \S/.test(lines[0] || '')) structuralErrors.push(`${rel}:1 首行必须是 "# " 标题`);

  let section = null;
  const seen = new Set();
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (i === 0 || line.trim() === '') return;
    if (/^#{3,}\s/.test(line)) { structuralErrors.push(`${at} 禁止三级及以下标题: ${line}`); return; }
    if (/^## /.test(line)) {
      section = line.slice(3).trim();
      if (!allowed.includes(section)) structuralErrors.push(`${at} 节名不在白名单 [${allowed.join('/')}]：${section}`);
      if (seen.has(section)) structuralErrors.push(`${at} 节名重复: ${section}`);
      seen.add(section);
      return;
    }
    if (/^# /.test(line)) { structuralErrors.push(`${at} 只允许一个一级标题: ${line}`); return; }
    if (/^> /.test(line)) {
      if (section !== null) structuralErrors.push(`${at} 引用块只允许出现在首个节之前`);
      return;
    }
    if (!/^- \S/.test(line)) { structuralErrors.push(`${at} 正文必须是 "- " 单行条目: ${line.slice(0, 40)}`); return; }
    const chars = [...line].length;
    if (chars > CONFIG.MAX_BULLET_CHARS) structuralErrors.push(`${at} 条目 ${chars} 字符 > ${CONFIG.MAX_BULLET_CHARS}`);
    const banned = line.match(CONFIG.BANNED_WORDS);
    if (banned) structuralErrors.push(`${at} 禁用词「${banned[0]}」：待办/未闭环不进 FACTS`);
    const outside = line.match(CONFIG.OUTSIDE_REPO);
    if (outside) structuralErrors.push(`${at} 仓外路径「${outside[0]}」：指针只能是仓内路径或 commit`);
    if (section === '档案索引' && !ARCHIVE_LINE.test(line)) {
      structuralErrors.push(`${at} 档案索引格式应为 "- docs/<YYYYMMDD-标签>/ — 说明"（注意 — 是 U+2014 两侧空格）`);
    }
    for (const match of line.matchAll(REPO_PATH)) {
      const ref = match[1].replace(/[.,;:。；：、]+$/, '');
      if (/[{}*<>]/.test(ref)) continue;
      if (!fs.existsSync(path.join(ROOT, ref))) pointerErrors.push(`${at} 指针失效: ${ref}`);
    }
    const m = section === '档案索引' ? line.match(ARCHIVE_LINE) : null;
    if (m) indexed.add(m[1]);
  });
}

const archiveErrors = [];
const docsDir = path.join(ROOT, 'docs');
if (fs.existsSync(docsDir)) {
  for (const name of fs.readdirSync(docsDir)) {
    if (!CONFIG.ARCHIVE_DIR.test(name)) continue;
    const full = path.join(docsDir, name);
    try { if (!fs.statSync(full).isDirectory()) continue; } catch { continue; }
    if (!fs.existsSync(path.join(full, 'RECORD.md'))) archiveErrors.push(`docs/${name}/ 缺少 RECORD.md`);
    if (!indexed.has(name)) archiveErrors.push(`docs/${name}/ 是孤儿档案：没有任何 FACTS.md 的「档案索引」引用它`);
  }
}

const agentsErrors = [];
const agentsPath = path.join(ROOT, 'AGENTS.md');
if (!fs.existsSync(agentsPath)) {
  agentsErrors.push('AGENTS.md 不存在：规则层是系统必备件（模板见仓库根 AGENTS.md）');
}
const agents = fs.existsSync(agentsPath) ? readText(agentsPath) : '';
if (fs.existsSync(agentsPath) && CONFIG.AGENTS_STRICT_MARKER.test(agents)) {
  agents.split(/\r?\n/).forEach((line, i) => {
    if (/^## /.test(line) && !/^## R\d+ \S/.test(line)) agentsErrors.push(`AGENTS.md:${i + 1} 只允许 "## R<n> " 永久规则节: ${line}`);
    const banned = line.match(CONFIG.BANNED_WORDS);
    if (banned) agentsErrors.push(`AGENTS.md:${i + 1} 禁用词「${banned[0]}」`);
  });
}

const selfErrors = [];
{
  // 自检：本文件 SHA256 须与 AGENTS.md 登记值一致。
  // 它防的是"无意识改裁判"（改了 lint 忘了自己在改尺子）；有意改的人必须留下登记行 diff 这个显式痕迹。
  // 改本文件后跑 npm run update-hash 重新登记；删除方式：删本段与登记行。
  const selfHash = crypto.createHash('sha256')
    .update(readText(__filename).replace(/\r\n/g, '\n')).digest('hex');
  const reg = agents.match(/facts-lint 自检 sha256：([0-9a-f]{64})/);
  if (!reg) selfErrors.push('AGENTS.md 缺少 facts-lint 自检登记行（跑 npm run update-hash 生成）');
  else if (reg[1] !== selfHash) {
    selfErrors.push(`facts-lint 自检不通过：登记值与实际不符。改裁判必须留痕——若改动是你有意为之，跑 npm run update-hash 重新登记。\n  登记值 ${reg[1]}\n  实际值 ${selfHash}`);
  }
}

test('FACTS.md 结构与格式', () => {
  assert.ok(files.includes('FACTS.md'), 'root FACTS.md missing');
  assert.deepStrictEqual(structuralErrors, [], '\n' + structuralErrors.join('\n'));
});
test('FACTS.md 仓内指针有效', () => {
  assert.deepStrictEqual(pointerErrors, [], '\n' + pointerErrors.join('\n'));
});
test('档案完整且无孤儿', () => {
  assert.deepStrictEqual(archiveErrors, [], '\n' + archiveErrors.join('\n'));
});
test('AGENTS.md 规则节', () => {
  assert.deepStrictEqual(agentsErrors, [], '\n' + agentsErrors.join('\n'));
});
test('facts-lint 自检哈希', () => {
  assert.deepStrictEqual(selfErrors, [], '\n' + selfErrors.join('\n'));
});
test('汇总', () => {
  console.log(`facts-lint: ${files.length} FACTS.md, ${indexed.size} archives indexed`);
});
