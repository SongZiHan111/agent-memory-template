'use strict';

// facts-lint — 记忆文档系统的格式裁判。随 `node --test tools/tests/*.test.js` 运行。
// 强制：节名白名单 / "- " 单行条目 / 单条≤300字符 / 文件≤20KB/150行 / 禁用词 /
//       仓内指针存在性 / 档案孤儿检测 / AGENTS.md 节格式 / 本文件自检哈希。
// 所有阈值集中在下方 CONFIG，按需改（改了记得同步 AGENTS.md 里的自检哈希，否则自检红——这是刻意的）。

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..', '..');

// ===================== CONFIG（按你的项目改这里） =====================
const CONFIG = {
  MAX_BYTES: 20 * 1024,
  MAX_LINES: 150,
  MAX_BULLET_CHARS: 300,
  ROOT_SECTIONS: ['工程基线', '外部状态', '约定与文案', '环境', '测试与调试', '档案索引'],
  MODULE_SECTIONS: ['职责', '来源', '组成', '行为契约', '页面与路由', '对外 API', '依赖', '部署',
    '冒烟测试命令', '已知缺陷与环境坑', '档案索引'],
  // 半成品/未闭环措辞不许进现状文档
  BANNED_WORDS: /未做|下一步|待办|暂不改|待用户|待验|待补|尚未|TODO|未验证|待定|终裁|已被.{0,20}取代/,
  // 指针只允许仓内路径（防机器绑死/仓外漂移）
  OUTSIDE_REPO: /[A-Za-z]:\\|%TEMP%|AppData|\bDesktop\b|桌面|\/tmp\//i,
  // 仓内路径指针的合法前缀（按你的目录结构调整）
  REPO_PATH_PREFIXES: ['src', 'docs', 'tools', 'scripts', 'assets', 'app', 'packages', 'config'],
  ARCHIVE_DIR: /^\d{8}-[a-z0-9-]+$/,
  SKIP_DIRS: new Set(['node_modules', 'build', 'dist', '.cache', '.git', '.idea', 'out']),
};
// =====================================================================

const MAX_BYTES = CONFIG.MAX_BYTES, MAX_LINES = CONFIG.MAX_LINES, MAX_BULLET_CHARS = CONFIG.MAX_BULLET_CHARS;
const MODULE_SECTIONS = CONFIG.MODULE_SECTIONS, ROOT_SECTIONS = CONFIG.ROOT_SECTIONS;
const BANNED_WORDS = CONFIG.BANNED_WORDS, OUTSIDE_REPO = CONFIG.OUTSIDE_REPO;
const REPO_PATH = new RegExp('(?:^|[^\\w./-])((?:' + CONFIG.REPO_PATH_PREFIXES.join('|') + ')\\/[\\w./{}*<>-]*)', 'g');
const ARCHIVE_DIR = CONFIG.ARCHIVE_DIR;
const ARCHIVE_LINE = /^- docs\/(\d{8}-[a-z0-9-]+)\/ — \S/;
const SKIP_DIRS = CONFIG.SKIP_DIRS;

function factsFiles() {
  const files = [];
  if (fs.existsSync(path.join(ROOT, 'FACTS.md'))) files.push('FACTS.md');
  for (const name of fs.readdirSync(ROOT)) {
    if (SKIP_DIRS.has(name)) continue;
    const rel = name + '/FACTS.md';
    if (fs.statSync(path.join(ROOT, name)).isDirectory() && fs.existsSync(path.join(ROOT, rel))) files.push(rel);
  }
  return files;
}

const errors = [];
const indexed = new Set();
const files = factsFiles();
assert.ok(files.includes('FACTS.md'), 'root FACTS.md missing');

for (const rel of files) {
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const lines = raw.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  const allowed = rel === 'FACTS.md' ? ROOT_SECTIONS : MODULE_SECTIONS;
  const bytes = Buffer.byteLength(raw, 'utf8');
  if (bytes > MAX_BYTES) errors.push(`${rel}: ${bytes} bytes > ${MAX_BYTES}，压缩或删除代码能自证的条目`);
  if (lines.length > MAX_LINES) errors.push(`${rel}: ${lines.length} lines > ${MAX_LINES}`);
  if (!/^# \S/.test(lines[0] || '')) errors.push(`${rel}:1 首行必须是 "# " 标题`);

  let section = null;
  const seen = new Set();
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (i === 0 || line.trim() === '') return;
    if (/^#{3,}\s/.test(line)) { errors.push(`${at} 禁止三级及以下标题: ${line}`); return; }
    if (/^## /.test(line)) {
      section = line.slice(3).trim();
      if (!allowed.includes(section)) errors.push(`${at} 节名不在白名单 [${allowed.join('/')}]：${section}`);
      if (seen.has(section)) errors.push(`${at} 节名重复: ${section}`);
      seen.add(section);
      return;
    }
    if (/^> /.test(line)) {
      if (section !== null) errors.push(`${at} 引用块只允许出现在首个节之前`);
      return;
    }
    if (!/^- \S/.test(line)) { errors.push(`${at} 正文必须是 "- " 单行条目: ${line.slice(0, 40)}`); return; }
    const chars = [...line].length;
    if (chars > MAX_BULLET_CHARS) errors.push(`${at} 条目 ${chars} 字符 > ${MAX_BULLET_CHARS}`);
    const banned = line.match(BANNED_WORDS);
    if (banned) errors.push(`${at} 禁用词「${banned[0]}」：待办/未闭环不进 FACTS`);
    const outside = line.match(OUTSIDE_REPO);
    if (outside) errors.push(`${at} 仓外路径「${outside[0]}」：指针只能是仓内路径或 commit`);
    if (section === '档案索引') {
      const m = line.match(ARCHIVE_LINE);
      if (!m) errors.push(`${at} 档案索引格式应为 "- docs/<YYYYMMDD-标签>/ — 说明"`);
      else indexed.add(m[1]);
    }
    for (const match of line.matchAll(REPO_PATH)) {
      const ref = match[1].replace(/[.,;:]+$/, '');
      if (/[{}*<>]/.test(ref)) continue;
      if (!fs.existsSync(path.join(ROOT, ref))) errors.push(`${at} 指针失效: ${ref}`);
    }
  });
}

const docsDir = path.join(ROOT, 'docs');
if (fs.existsSync(docsDir)) {
  for (const name of fs.readdirSync(docsDir)) {
    if (!ARCHIVE_DIR.test(name) || !fs.statSync(path.join(docsDir, name)).isDirectory()) continue;
    if (!fs.existsSync(path.join(docsDir, name, 'RECORD.md'))) errors.push(`docs/${name}/ 缺少 RECORD.md`);
    if (!indexed.has(name)) errors.push(`docs/${name}/ 是孤儿档案：没有任何 FACTS.md 的「档案索引」引用它`);
  }
}

const agents = fs.readFileSync(path.join(ROOT, 'AGENTS.md'), 'utf8');
agents.split(/\r?\n/).forEach((line, i) => {
  if (/^## /.test(line) && !/^## R\d+ \S/.test(line)) errors.push(`AGENTS.md:${i + 1} 只允许 "## R<n> " 永久规则节: ${line}`);
  const banned = line.match(BANNED_WORDS);
  if (banned) errors.push(`AGENTS.md:${i + 1} 禁用词「${banned[0]}」`);
});

// 自检：本文件 SHA256 须与 AGENTS.md 登记值一致（防裁判被静默改宽）。
// 改本文件后登记值须同步更新——不同步则此处红，即为机械提醒；删除方式：删本段与登记行。
const selfHash = crypto.createHash('sha256')
  .update(fs.readFileSync(__filename, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
const reg = agents.match(/facts-lint 自检 sha256：([0-9a-f]{64})/);
if (!reg) errors.push('AGENTS.md 缺少 facts-lint 自检登记行（格式：facts-lint 自检 sha256：<64hex>）');
else if (reg[1] !== selfHash) {
  errors.push(`facts-lint 自检不通过：登记值 ${reg[1].slice(0, 12)}… ≠ 实际 ${selfHash.slice(0, 12)}…；改 lint 后须同步 AGENTS.md 登记值`);
}

assert.deepStrictEqual(errors, [], '\n' + errors.join('\n'));
console.log(`PASS facts-lint: ${files.length} FACTS.md, ${indexed.size} archives indexed, no orphans/dead pointers`);
