'use strict';

// 生成 VERSIONS.md（版本轴索引）。纯生成物：手写内容会被覆盖，勿手改。
// 数据源只有 git（tag/log/blob）与 docs/ 目录名——全部可重新推导，故本文件永不腐烂。
// 用法：node tools/gen-versions.js（发版流程的版本号 commit 前跑）。
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const sh = (cmd) => execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trim();

// 需要留指纹的文件（环境/资产漂移登记）：存在才记录，内容为 git blob id
const FINGERPRINT_FILES = ['package.json', 'assets/MANIFEST.md'];

const anchorOf = (commit) => {
  const [subject, date] = sh(`git log -1 "--format=%s|%ad" --date=short ${commit}`).split('|');
  return `${commit.slice(0, 7)}（锚 '${subject}' @${date}）`;
};

const tags = sh('git tag --list v*').split('\n').filter(Boolean).map(t => {
  const commit = sh(`git rev-list -n 1 ${t}`);
  const fps = FINGERPRINT_FILES.filter(f => {
    try { sh(`git rev-parse ${commit}:${f}`); return true; } catch { return false; }
  }).map(f => `${f}=${sh(`git rev-parse ${commit}:${f}`).slice(0, 12)}`);
  return { tag: t, commit, fps, date: sh(`git log -1 --format=%ad --date=short ${commit}`) };
}).sort((a, b) => a.date.localeCompare(b.date));

const docsDir = path.join(ROOT, 'docs');
const archives = fs.existsSync(docsDir) ? fs.readdirSync(docsDir)
  .filter(d => /^\d{8}-[a-z0-9-]+$/.test(d) && fs.existsSync(path.join(docsDir, d, 'RECORD.md')))
  .map(d => ({ dir: d, date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` }))
  .sort((a, b) => a.date.localeCompare(b.date)) : [];

const L = [];
L.push('# VERSIONS.md — 版本轴索引（生成物）');
L.push('');
L.push('> 由 tools/gen-versions.js 生成；手写内容会被覆盖，勿手改。');
L.push('> 发布状态等时变语义以你的发布平台为准，仓内不记。');
L.push('');

tags.forEach((v, i) => {
  const prev = i > 0 ? tags[i - 1].date : null;
  const inRange = archives.filter(a => a.date <= v.date && (!prev || a.date > prev));
  L.push(`## ${v.tag}`);
  L.push(`- commit：${anchorOf(v.commit)}`);
  if (v.fps.length) L.push(`- 环境指纹：${v.fps.join('；')}`);
  L.push(`- 区间档案（${prev || '仓始'}..${v.date}，共 ${inRange.length} 份；说明见各 FACTS 档案索引）：`);
  inRange.forEach(a => L.push(`  - docs/${a.dir}/`));
  L.push('');
});

const head = sh('git rev-parse HEAD');
const lastDate = tags.length ? tags[tags.length - 1].date : null;
const unreleased = archives.filter(a => !lastDate || a.date > lastDate);
L.push('## 当前工作区（未发布）');
L.push(`- HEAD：${anchorOf(head)}`);
L.push(`- 最近 tag 后新增档案：${unreleased.length ? unreleased.map(a => 'docs/' + a.dir + '/').join('、') : '无'}`);
L.push('');

fs.writeFileSync(path.join(ROOT, 'VERSIONS.md'), L.join('\n'), 'utf8');
console.log(`VERSIONS.md generated: ${tags.length} tag(s), ${archives.length} archive(s)`);
