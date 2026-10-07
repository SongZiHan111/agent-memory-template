# AGENTS.md 模板 — 工程规则（最小有效集）

<!-- facts-lint:R-ONLY -->

每条规则必须机械可执行（编译/lint/git 能强制），不带流程性义务。每条带删除条件。例外：AI 可读指令类规则（如 R3）以开工阅读为强制通道，强度低于机械强制，须在该条内如实标注。

## R1 示例：日志统一门面（lint/审查强制）
禁止直调底层日志 API，一律走项目统一门面。（替换成你项目的第一条结构性规则）
删除条件：门面废弃时本规则重写。

## R2 示例：删除即真删
禁止 attic/墓地目录、禁止大段注释代码。恢复只走 git 历史。
删除条件：无。

## R3 并行施工
适用：多会话（人或 AI）同仓施工时。开工第一件事 `git status` + `git log -3 --stat`：发现陌生提交或自己未提交的改动"消失"，先 `git show <hash> --stat` 查清再动手。提交一律显式路径，禁 `git add -A`/`git commit -a`；暂存后通读清单，混入别人改动的 `git restore --staged <path>` 移出。半成品预计超过半天：开 wip 分支 commit 存放（stash 只用于分钟级临时切换）。收工验收：提交后工作区只剩别人的改动。
强制方式：AI 开工阅读 + 测试/lint 兜底，弱于机械强制（无机械手段能分辨暂存来源）；事故恢复走 git 历史（R2），历史只前进不后退。
删除条件：长期单人单会话无并行施工时可删。

## R4 事实文档（facts-lint 强制）
根目录 FACTS.md 记全项目事实，每模块一个 FACTS.md 记模块事实：只写现状，新结论改写旧条目，不写过程、未闭环事项和决策叙事。节名白名单、单条 ≤300 字、文件 ≤20KB、禁用词、仓内指针有效性由 `tools/tests/facts-lint.test.cjs` 强制（随 `npm test` 运行）；放宽阈值须用户同意。
任务过程记录原样放 `docs/<YYYYMMDD>-<标签>/RECORD.md`，并在对应 FACTS「档案索引」登记一行（孤儿档案与死指针会使 lint 失败）。未闭环事项不入 FACTS；RECORD 原样含过程。
VERSIONS.md 由 `tools/gen-versions.js` 生成，手写内容会被覆盖勿手改。
删除条件：FACTS.md 永久但允许重写；lint 阈值可调。
facts-lint 自检 sha256：9d2fb0d60a6d97384ae81df13aef516325316bc2f0b83fbcef055fbb10aba8c3（改 tools/tests/facts-lint.test.cjs 后跑 `npm run update-hash` 重登记本值，否则自检红——刻意留痕；删除方式：删本行与 facts-lint 尾部自检段）。
