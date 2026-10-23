# 工作日志 · course-chapter-bench

记录每一个可追溯的决策与验证结果。新条目放最上面。

## 2026-10-24 01:20 · 任务 1：字号基线改成相对窗口（`7b839e0`）

**输入**：HANDOFF §4 任务 1 —— 把 `baselines/font-size.mjs` 的固定阈值（≥全文中位数 1.5×）改成相对窗口规则，
验收是 `deck-800` / `ics-ch3` 上 F1 从 0 提到 0.3 以上。

**改动**：第 i 页取前 `W` 页标题字号中位数 `before`、后 `W` 页 `after`，`size ≥ before×R` 且 `size ≥ after×R` 判章首；
第 1 页恒为章首，末尾 `W` 页之后没正文 → 永不算章首。默认 `W=3, R=1.05`，`--window` / `--ratio` 可复现扫参。

**结果**（2 份 layout 文档）：WD 0.481→**0.269**、Pk 0.481→**0.253**、**F1 0 → 0.591**、BS 0.091→**0.731**、Δ章 6.5→**4.5**。
逐份：`ics-ch3` F1 1.000（BS 1.000、WD 0.006）、`deck-800` F1 0.182（BS 0.462）。

**两处偏离原建议（都是数据逼的）**：
- 原建议的 1.3×/1.4× 阈值不成立——真实分隔页只比正文大 11%（40/36）与 28%（32/25），必须降到 1.05× 才有召回；
- 「邻域最大值」会被 `deck-800` 的 50pt 封面压死（第 4 页 32pt 才是真边界），改成两侧中位数比较；
  两侧都比还顺带关掉了 32pt 页块两端的「回到正常」过渡页（第 383/395 页）假阳。

**验证**：`eval/test.mjs` PASS；金标自检 17/17 全 0/1；CI 的 schema 检查 17 份；
扫参 `W∈[2,12] × R∈[1.02,1.30]` 平台记进 README（`W≤12`、`R∈[1.02,1.10]` 均 ≥0.491，`R≥1.2` 归 0）。

**顺带修**：README「现状」表停在 ics-ch3 之前（16 份/1 940 页/65 章/test 5）→ 17 份/2 339 页/70 章/test 6。

**上限（别误读成方法变好了）**：`deck-800` 只靠字号上限 0.18（10 条真边界 9 条在 25pt 页上，章位置来自 § 编号）；
`ics-ch3` 的 1.000 含 ±1 容差（84–86 三页同为 40pt，字号分不出 86）。要突破只能加 `bold` / 文本信号。

## 2026-10-24 01:20 · 交接

- 写 `HANDOFF.md`，把数据、命令、数字、坑、下一步（任务 1：相对字号规则）固化。
- 推送 layout 数据集与 font-size 基线（`fecb8a8`）。

## 2026-10-24 01:10 · layout 赛道补真实数据

**输入**：用户提供 5 份课程课件（`D:\大二上\计算机系统基础\课内\第3章_3.1…3.5.pptx`）。

**处理**：
- 合并为一份 `ics-ch3`：5 个文件 = 5 章，边界 = 每个课件第一页（和 OS 讲义同一套客观规则）。
- 用插件 `core/parser.js` 解析 PPTX，取 `titleSize / 100` 作为 `heading.size`。
- 结果：**399 页 / 5 章 / 399 页全部带真实字号**；正文不发布（`text_included:false`，`license: unknown`）。

**验证**：金标自检 17/17 通过；`eval/run.mjs` 逐份输出正常。

**新基线 `font-size`**：标题字号 ≥ 中位数 1.5× 判为章首 → WD 0.481 / Pk 0.481 / **F1 0.000** / BS 0.091 / Δ章 6.5（只评 2 份 layout 文档）。
**结论**：固定字号阈值在幻灯片上失效，必须改成相对突变规则——这就是下一轮任务 1 的由来。

## 2026-10-24 00:55 · layout 来源排查（路径 1）

用户选择「从公开课和开源教材找带 PDF/PPTX 的许可明确来源」。

| 候选 | 许可 | 结果 |
|---|---|---|
| LearningOS/os-lectures | MIT | 1133 文件，**0 份讲义 PDF/PPTX**（仅 4 个插图 PDF） |
| niuniu-869/humanitys-last-math-book | CC-BY-SA-4.0 | 480 个 PDF **全是 `fig/` 插图**，正文是 LaTeX/Markdown |
| hqhq1025/ai-course-notes | 未核（API 500） | 待重试 |

**结论**：许可明确的中文课程公开仓库基本只放源码（md/tex），很少附编译产物 → 真实版式只能靠用户自有课件 / 本地编译 LaTeX（须标 `latex-build`）/ 英文 MIT OCW。排查记录已写入 `data/SOURCES.md`。

## 2026-10-24 00:40 · 标题行消融

- 新增 `eval/dataset.mjs` 的 `--strip-heading` 视图：删掉所有结构性文本行（第N节/章、一、、1.）。
- 结果：section-heading 从 WD 0.110 / F1 0.746 掉到 **WD 0.417 / F1 0.000**。
- 解读：正则基线纯靠结构行；基准的难度必须来自「没有编号的课件」（如 `deck-800`）与版式信号。

## 2026-10-24 00:20 · 扩到 13 讲 MIT 讲义

- `tools/fetch-lectures.mjs` 支持批量抓取，含 4 次指数退避（GitHub 频繁 `ECONNRESET`）。
- Marp front matter 必须剥掉，否则首行 `---` 变成第 1 页、标题全成 `---`。
- lec14 只有 `slides.md` 且无「第N节」标题 → `SKIP`，不硬造金标。
- 结果：**16 份 / 1 940 页 / 65 章**，split 按讲划分 train 8 / dev 3 / test 5。
- 基线：every-page WD 0.998 / F1 0.109；section-heading WD 0.110 / F1 0.746。

## 2026-10-24 00:05 · 仓库创建

- 本地 `course-chapter-bench`：schema、`eval/metrics.mjs`（Pk/WindowDiff/F1/BS）、`eval/run.mjs`、`eval/test.mjs`、3 份种子文档、CI、贡献指南。
- 远端仓库通过 `git credential fill` 取 token 调 GitHub API 创建（`logb-1/course-chapter-bench`，不打印 token），随后 push 成功。
- 用户选择「PPT 从公开课和开源教材里找」。

## 2026-10-23 23:50 · 调研：有没有现成的中文分章基准

结论：**没有**。最接近的是：

- [CPTS](https://github.com/fjiangAI/CPTS)（14 393 篇中文新闻，段落级边界 + 小标题，Apache-2.0，Pk/WindowDiff/BS/SS 指标）——方法学可借，但粒度是段落不是页。
- [OmniDocBench](https://github.com/opendatalab/OmniDocBench)（CVPR 2025）与 [opendataloader-bench](https://github.com/opendataloader-project/opendataloader-bench)：评解析质量，不评章边界。
- AVLectures / SSLectures：讲座**视频**分割，不是页级。
- ppteval / PPTArena：PPT 任务与生成，不涉及结构切分。

→ 空白确认，决定自建基准。
