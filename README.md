# agent-memory-template

一个为 **AI 协作者**设计的项目记忆系统骨架：给每天失忆的 AI 同事一套"不会悄悄腐烂"的手册。

Human teams rely on tribal knowledge and code review to correct stale docs. AI-assisted projects can't — every session starts with zero memory and acts confidently on whatever it reads. This template makes documentation failures **loud instead of silent**, with mechanical referees (lint/tests/hooks) instead of rituals.

## 核心思想（详见 PHILOSOPHY.md）

1. **可证伪性**：每条断言必须拴在一个不会撒谎的裁判上（lint/测试/构建/设备），坏了必须响。
2. **单一事实源**：同一事实只在一个地方断言，其他地方只放指针。腐烂 ≈ 断言数 × 无裁判区域。
3. **无流程性义务**：凡"靠记得定期做"的机制必烂；一律改为机械强制或事件触发。
4. **一切可一键删除**。

## 结构

```
FACTS.md                    断言层：全项目当前事实（唯一获准写"现状"的地方）
<module>/FACTS.md           模块断言层（每模块一本）
AGENTS.md                   规则层：R 编号永久规则，每条带强制机制与删除条件
docs/YYYYMMDD-<tag>/        历史层：冻结的任务结案报告（问题轴，只增不改）
VERSIONS.md                 版本轴：纯生成物（tools/gen-versions.js 生成，勿手改）
tools/tests/facts-lint.test.js  裁判：格式/死指针/孤儿档案/禁用词/自检哈希
tools/hooks/pre-push        闸机：push 前强制跑测试（tools/install-hooks.* 安装）
```

## 上手（5 分钟）

```bash
git clone <this-repo> my-project && cd my-project
rm -rf .git && git init          # 脱离模板历史，开始自己的
# 编辑 FACTS.md / AGENTS.md / facts.config 块（tools/tests/facts-lint.test.js 顶部）填入你的项目
node --test tools/tests/*.test.js   # 裁判就位自检
powershell -File tools/install-hooks.ps1   # Windows；类 Unix 用 tools/install-hooks.sh
```

## 它不适合什么

- 文档主要靠人读、且有成熟 code review 文化的团队（你们的 tribal knowledge 就是裁判，不需要这套）；
- 想要"永不腐烂"的人——不存在。本系统的目标是**腐烂可被发现**。
