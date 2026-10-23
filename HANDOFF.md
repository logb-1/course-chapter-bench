# HANDOFF · course-chapter-bench

> 写于 2026-10-24 01:20（Asia/Shanghai）。下一位接手请先读本文件，再读 `README.md`。

## 0. 这个仓库是什么

中文课件分章基准：给定一份课件（幻灯片 / 讲义 / 教材 PDF），预测**每章从哪一页开始**与**章标题**。
公开仓库：https://github.com/logb-1/course-chapter-bench
本地：`C:\Users\ThinkPad\Documents\deepseek-harness\default-workspace\course-chapter-bench`

## 1. 当前状态（可直接复现）

| 项 | 值 |
|---|---|
| 文档 | **17 份 / 2 339 页 / 70 章** |
| split | train 8 / dev 3 / test 6（按讲/按课切，同一门课不跨 split） |
| 赛道 | `text-only`（13 讲 MIT 讲义 + 2 玩具）、`layout`（`deck-800` 34 页 + `ics-ch3` 399 页，均带真实字号） |
| 指标 | Pk、WindowDiff、边界 F1(±1 页)、BS(±2 页)、章数误差 |
| 基线 | every-page、section-heading(+strip-heading 消融)、font-size |
| 最新提交 | `fecb8a8`（已推送） |

## 2. 命令（全部离线可跑）

```powershell
cd C:\Users\ThinkPad\Documents\deepseek-harness\default-workspace\course-chapter-bench
$node = 'C:\Users\ThinkPad\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

& $node eval/test.mjs                                              # 指标自检
& $node eval/run.mjs --gold data --pred data --self-check          # 金标自检（应 17/17，全 0/1）
& $node baselines/section-heading.mjs                              # 生成 predictions/
& $node eval/run.mjs --pred predictions                            # 逐份 + 均值
& $node baselines/section-heading.mjs --strip-heading              # 消融视图
& $node baselines/font-size.mjs                                    # layout 基线
& $node tools/fetch-lectures.mjs lec1 lec3                         # 抓 MIT 讲义（带 4 次退避重试）
```

## 3. 当前数字（改之前先记下来，别丢）

| 基线 | windowDiff ↓ | Pk ↓ | F1 ↑ | BS ↑ | Δ章数 ↓ | 备注 |
|---|---|---|---|---|---|---|
| every-page | 0.998 | 0.583 | 0.109 | 0.322 | 117.2 | 地板线，17 份 |
| section-heading | 0.110 | 0.106 | 0.746 | 0.746 | 2.0 | 靠「第N节」结构行 |
| section-heading `--strip-heading` | 0.417 | 0.417 | 0.000 | 0.000 | 3.1 | 删结构行后完全失效 |
| font-size（朴素阈值） | 0.481 | 0.481 | **0.000** | 0.091 | 6.5 | 只评 2 份 layout 文档 |

> font-size 基线 F1=0 的原因：幻灯片标题字号普遍很大，固定「≥中位数 1.5×」会把大量普通页判成章首。

## 4. 下一步任务（用户指定：做「1」）

**任务 1：把 font-size 基线改成相对规则**

现状代码 `baselines/font-size.mjs`：

```js
const median = sizes[Math.floor(sizes.length / 2)]
if (page.index === 1 || size >= median * 1.5) boundaries.push(page.index)
```

要改成**局部突变**判定，建议实现（任选其一，先跑出数再调参）：

1. 对每页取前后各 `W=5` 页的字号中位数 `local`，当 `size >= local * 1.3` 且 `size` 是该页所在邻域的最大值 → 章首；
2. 或者用「与上一页的比值」：`size / prevSize >= 1.4`；
3. 排除第一页/封面页（`index === 1` 仍强制为章首）。

验收标准：
- `node baselines/font-size.mjs && node eval/run.mjs --pred predictions` 在 `deck-800` 与 `ics-ch3` 上 **F1 > 0.3**（现在 0）；
- 不破坏 `eval/test.mjs` 与金标自检；
- 把新数字写进 README 的 layout 基线表与本节；

**可选加强**：抽 `bold`（PPTX `b="1"`）作为第二特征；`core/ooxml.js` 目前只取字号，需要改插件仓库的解析器再回填 `heading.bold`。

## 5. 数据与许可规则（不要破坏）

- 13 讲 MIT 讲义（`os-lec1…13`）：`text_included: true`，许可 MIT，来源 LearningOS/os-lectures。
- `deck-800`：用户自己的结课汇报，标注 CC-BY-4.0，正文不发布。
- `ics-ch3`：用户课程课件（第 3 章 3.1–3.5，399 页），`text_included: false`，`license: unknown`，只发页标题与字号；权利人可要求移除。
- 玩具两份：CC0，纯手写。
- **许可不明的课件一律不进 `data/`**（南大 ICS、王道课件、MOOC 课件都不行）。

## 6. 已知坑（踩过的）

| 坑 | 现象 | 处理 |
|---|---|---|
| Marp front matter | 不剥掉时首行 `---` 变成第 1 页、章标题全成 `---` | `tools/fetch-lectures.mjs` 里已用正则剥掉 |
| lec14 | 只有 `slides.md` 且没有「第N节」标题 | 工具会 `SKIP`，不要硬造金标 |
| GitHub 抓取 | 频繁 `ECONNRESET` / `api.github.com` 500 | 工具内已有 4 次指数退避；批量抓时拆成 5 讲一批 |
| PPTX 字号单位 | 百分之一磅 | 已 `/100` 换算成 pt 再写入 `heading.size` |
| 中文编码 | PowerShell `Get-Content`/`Set-Content` 会毁 UTF-8 + BOM | 只用 `write`/`edit` 工具改文件；临时脚本用 UTF8 写入 TEMP |
| CRLF 警告 | `git add` 时一堆 warning | 无害，忽略 |
| GitHub 推送 | 间歇 `Failed to connect to github.com:443` | 重试；创建仓库用 `git credential fill` 取 token 调 API（不打印） |

## 7. 未完成 / 待办

1. **任务 1（相对字号规则）** ← 用户下轮要做
2. `LICENSE-DATA` 目前是 CC-BY-4.0 摘要 + 链接，正式发布前要嵌完整 legalcode
3. `heading.bold` 未抽取
4. 没有 LLM 零样本基线
5. layout 赛道只有 2 份，统计意义弱
6. CI 尚未在 GitHub Actions 上验证过绿（无 GH token 读 Actions）

## 8. 相关但独立的仓库

`dsh-course-assistant`（插件本体，npm 1.5.0，已发布 + tag 已推）：
`C:\Users\ThinkPad\Documents\deepseek-harness\default-workspace\course-assistant`
它的分章管道在 `deck-800` 上 windowDiff 0.061 / F1 0.947，可作为 benchmark 的参考上界。
