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
| 基线 | every-page、section-heading(+strip-heading 消融)、font-size（局部窗口 W=3/1.05×） |
| 最新提交 | `7b839e0`（本地，未推送） |

## 2. 命令（全部离线可跑）

```powershell
cd C:\Users\ThinkPad\Documents\deepseek-harness\default-workspace\course-chapter-bench
$node = 'C:\Users\ThinkPad\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe'

& $node eval/test.mjs                                              # 指标自检
& $node eval/run.mjs --gold data --pred data --self-check          # 金标自检（应 17/17，全 0/1）
& $node baselines/section-heading.mjs                              # 生成 predictions/
& $node eval/run.mjs --pred predictions                            # 逐份 + 均值
& $node baselines/section-heading.mjs --strip-heading              # 消融视图
& $node baselines/font-size.mjs                                    # layout 基线（W=3, 1.05×）
& $node baselines/font-size.mjs --window=5 --ratio=1.1            # 扫参：换窗口 / 比值
& $node tools/fetch-lectures.mjs lec1 lec3                         # 抓 MIT 讲义（带 4 次退避重试）
```

## 3. 当前数字（改之前先记下来，别丢）

| 基线 | windowDiff ↓ | Pk ↓ | F1 ↑ | BS ↑ | Δ章数 ↓ | 备注 |
|---|---|---|---|---|---|---|
| every-page | 0.998 | 0.583 | 0.109 | 0.322 | 117.2 | 地板线，17 份 |
| section-heading | 0.110 | 0.106 | 0.746 | 0.746 | 2.0 | 靠「第N节」结构行 |
| section-heading `--strip-heading` | 0.417 | 0.417 | 0.000 | 0.000 | 3.1 | 删结构行后完全失效 |
| font-size · 全局 1.5×（旧版，任务 1 之前） | 0.481 | 0.481 | **0.000** | 0.091 | 6.5 | 只评 2 份 layout 文档 |
| font-size · 局部窗口 W=3 / 1.05×（现版） | 0.269 | 0.253 | **0.591** | 0.731 | 4.5 | 逐份：`deck-800` 0.182、`ics-ch3` 1.000 |

> 旧版 F1=0 的真因：章分隔页只比正文大 **11%**（`ics-ch3` 40pt vs 36pt）、28%（`deck-800` 32pt vs 25pt），
> 而「≥ 全文中位数 1.5×」在 `ics-ch3` 上一页都命中不了（阈值 54 > 全文最大字号 40），
> 在 `deck-800` 上只命中最后一页，离真边界还差 2 页。

## 4. 任务 1（已完成 · `7b839e0`）：font-size 改成相对窗口规则

**原样留着当时的规格**（下面是接手时写的）：

> 现状代码 `baselines/font-size.mjs`：`if (page.index === 1 || size >= median * 1.5) boundaries.push(page.index)`，
> 要改成**局部突变**判定，建议：①前后各 `W=5` 的中位数，`size >= local * 1.3` 且是邻域最大值；②或与上一页比值 `>= 1.4`；③第一页仍强制为章首。
> 验收：F1 > 0.3、不破坏 `eval/test.mjs` 与金标自检、新数字写进 README。

**实际做法**（原建议 ① 的修正版）：第 i 页取前 `W` 页标题字号中位数 `before`、后 `W` 页中位数 `after`，
`size ≥ before × R` **且** `size ≥ after × R` 才判章首；第 1 页恒为章首；末尾 `W` 页之后没有正文 → 永不算章首。
默认 `W=3`、`R=1.05`，`--window` / `--ratio` 可覆盖（扫参就靠这两个开关复现）。

两处必须偏离原建议，都是数据逼的：
- **阈值 1.3×/1.4× 不成立**：真实分隔页只比正文大 11%（40/36）和 28%（32/25），阈值必须降到 1.05× 才有召回。
- **不能要求"邻域最大值"**：`deck-800` 封面 50pt 会把第 4 页的 32pt（真边界）压死；改成比"两侧中位数"，
  中位数天然抗单个离群页。顺带，纯对称中位数会读到 32pt 那 11 页的"回到正常"过渡页（第 383/395 页），
  两侧都比的写法把这类假阳关掉了。

**验收（全过）**：

| 项 | 结果 |
|---|---|
| `node baselines/font-size.mjs && node eval/run.mjs --pred predictions` | WD 0.481→**0.269**、Pk **0.253**、F1 0→**0.591**、BS 0.091→**0.731**、Δ章 6.5→**4.5** |
| `eval/test.mjs` | PASS |
| 金标自检 | 17/17，全 0/1 |
| CI 的 schema 检查 | 17 份通过 |

**扫参结论**（`W∈[2,12]` × `R∈[1.02,1.30]`，2 份文档均值 F1）：`R ≤ 1.11` 才有用（1.2 → 0.091，1.3 → 0）；
`W ≥ 5` 时窗口跨过上一章末尾两页 40pt「小结」，一次边界变三次预测（`ics-ch3` F1 0.8，均值 0.491）。
`W=3 / 1.05×` 落在平台正中，整条平台（`W≤12`、`R∈[1.02,1.10]`）都不低于 0.3。完整表在 README。

**两个上限要说清，别当成方法变好了**：
- `deck-800` 的 10 条真边界有 **9 条落在 25pt 页上**（章位置来自 § 编号而不是字号），只靠字号最多挑出 32pt 的第 4 页 → 这份文档的上限就是 **0.18**。
- `ics-ch3` 的 **1.000 含 ±1 容差**：84/85/86 三页同为 40pt（3.2 的两页「小结」+ 3.3 的「主要内容」），字号无法把边界精确到 86。

**没做**：`bold` 特征仍未抽（`core/ooxml.js` 只取字号，要改插件仓库的解析器再回填 `heading.bold`）——见 §7 第 2 条。

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

1. `LICENSE-DATA` 目前是 CC-BY-4.0 摘要 + 链接，正式发布前要嵌完整 legalcode
2. `heading.bold` 未抽取（`core/ooxml.js` 只取字号）——这是 `deck-800` 唯一的升级路径（字号上限只有 0.18）
3. 没有 LLM 零样本基线
4. layout 赛道只有 2 份，统计意义弱：本轮 `W`/`R` 就是在 2 份上扫的，换别的课件未必成立
5. 提交 `7b839e0` 只在本地，远端还停在 `dbfc162`（没 push）
6. CI 尚未在 GitHub Actions 上验证过绿（无 GH token 读 Actions）

## 8. 相关但独立的仓库

`dsh-course-assistant`（插件本体，npm 1.5.0，已发布 + tag 已推）：
`C:\Users\ThinkPad\Documents\deepseek-harness\default-workspace\course-assistant`
它的分章管道在 `deck-800` 上 windowDiff 0.061 / F1 0.947，可作为 benchmark 的参考上界。
