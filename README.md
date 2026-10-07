# agent-memory-template

一个为 **AI 协作者**设计的项目记忆系统骨架：给每天失忆的 AI 同事一套"不会悄悄腐烂"的手册。

Human teams rely on tribal knowledge and code review to correct stale docs. AI-assisted projects can't — every session starts with zero memory and acts confidently on whatever it reads. This template makes documentation failures **loud instead of silent**, with mechanical referees (lint/tests/CI) instead of rituals.

与 ADR、docs-as-code、Cursor rules / CLAUDE.md / agents.md 约定的区别：**它们是写法约定，这套是机械裁判**——格式、死指针、孤儿档案、裁判自身的完整性都由测试强制，腐烂从静默变成红灯。

## 核心思想（详见 PHILOSOPHY.md）

1. **可证伪性**：每条断言必须拴在一个不会撒谎的裁判上，坏了必须响。
2. **单一事实源**：同一事实只在一个地方断言，其他地方只放指针。腐烂 ≈ 断言数 × 无裁判区域（启发式，非定理）。
3. **无流程性义务**：凡"靠记得定期做"的机制必烂；一律改为机械强制或事件触发。
4. **一切可一键删除**：裁判、闸机、生成器都是普通文件，删除即解除，无残留状态。

## 结构

```
FACTS.md                        断言层：全项目当前事实（唯一获准写"现状"的地方）
<module>/FACTS.md               模块断言层（仓根下一层目录，模板见 module-FACTS.example.md）
AGENTS.md                       规则层：R 编号永久规则，每条带强制机制与删除条件
docs/YYYYMMDD-<tag>/RECORD.md   历史层：冻结的任务结案报告（只增不改）
VERSIONS.md                     版本轴：纯生成物（tools/gen-versions.js 生成，勿手改）
tools/tests/facts-lint.test.cjs 裁判：格式/死指针/孤儿档案/禁用词/自检哈希
.github/workflows/test.yml      真正的闸机：CI 在每次 push/PR 跑测试
tools/hooks/pre-push            本地快速反馈（可选；强度低于 CI，见文件头注释）
```

## 上手（5 分钟）

GitHub 上点 **Use this template** 建仓（模板仓方式自动脱离本仓历史），或 clone 后自行删除 `.git`。

```bash
# 1. 按你的项目改 tools/tests/facts-lint.test.cjs 顶部的 CONFIG 块（节名白名单/路径前缀/禁用词）
# 2. 重登记裁判自检哈希（改过 lint 必须跑，否则自检红——这是刻意的留痕机制）
npm run update-hash
# 3. 按模板填 FACTS.md 与 AGENTS.md，删掉 docs/19700101-example/ 占位档案
# 4. 裁判就位自检
npm test
# 5. 可选：装本地 pre-push 反馈（Windows）
powershell -ExecutionPolicy Bypass -File tools/install-hooks.ps1   # 类 Unix: bash tools/install-hooks.sh
```

改一处红一处是正常的：先跑一次确认绿，再小步改配置。接入已有项目时若不想迁移模块文档，可先只留根 FACTS.md。

## 已有 AGENTS.md 的项目

本模板与社区 agents.md 约定同名同文件。裁判对 AGENTS.md 的"只允许 `## R<n>` 节 + 禁用词"检查**默认关闭**，仅当文件含 `<!-- facts-lint:R-ONLY -->` 标记时启用——已有自由格式 AGENTS.md 的项目接入不会被整篇判红；想启用严格模式就加这行标记。

## 30 秒看到它喊

```bash
npm test                                  # 全绿
echo "- 待办：示例" >> FACTS.md            # 故意写个违禁词
npm test                                  # 红，错误精确到文件:行号和违禁词
```

## 边界与诚实清单

- lint 管格式与死指针；**行为契约测试和构建是你项目自己的**，本模板只占位示范；
- pre-push hook 是本地快速反馈，**不是强制闸机**（需安装、可 `--no-verify` 跳过、不随仓分发）——真正的强制是 CI；
- lint 只扫描仓根下一层目录的 FACTS.md（monorepo 深层结构请自行扩展）；
- 仓外世界（控制台、商店、服务器）变了仓内没有信号——第一发现者永远是外部系统的拒绝信号，文档里用"实况以 X 为准"标出验证位置；
- 克隆/模板化后删 `.git` 意味着不支持拉取上游更新，这是有意为之（模板是骨架，不是依赖）。

## 卸载

删除 `tools/`、`FACTS.md`、`AGENTS.md`、`VERSIONS.md`、`docs/`、`.github/workflows/test.yml`、`package.json` 中的 scripts 即可，无其他残留。
