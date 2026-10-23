# 数据来源清单

原则：**许可明确才收**；不确定的只记候选，不进 `data/`。

## 已确认可用（可再分发）

| 来源 | 许可 | 形态 | 说明 |
|---|---|---|---|
| [LearningOS/os-lectures](https://github.com/LearningOS/os-lectures) | **MIT**（仓库 LICENSE 已核） | Marp/slidev Markdown，`lec1`…`lec14` 共 14 讲 | 清华 rCore 操作系统课程讲义，中文；按 `---` 分页后可直接进 `layout` 赛道 |

转换要点：Marp Markdown 用 `---` 分隔幻灯片；每页第一行（`#`/`##`）当 `pages[].title`，
正文进 `pages[].text`。章节边界优先取讲义自带的"第 N 讲/第 N 章"结构，其次取讲内 `##` 一级标题，
人工核对后再写入 `gold.boundaries`。

## 候选但许可存疑（不进仓库，仅登记）

| 来源 | 判断 |
|---|---|
| 南京大学《计算机系统基础》课程站（cs.nju.edu.cn/sufeng/course/ics/）PDF | 站点未声明许可，默认保留所有权利 → **不可再分发**，最多做“仅标注 + 链接” |
| 南京大学《计算机组成原理》（yafengnju.github.io/ComputerOrganization）PDF | 同上 |
| AtomGit「王道408 计算机组成原理课件」等第三方上传 | 版权归原作者/机构，上传者无权授权 → **不可用** |
| ZJU-icicles / THU 课程资料类仓库 | 仓库公开但无 LICENSE，内容版权未转移 → **不可用** |
| 中国大学 MOOC 等平台的课件 | 平台 ToS 禁止再分发 → **不可用** |

## 下一步

1. 写 `tools/marp2jsonl.mjs`（在插件仓库里，不进本仓库），把 `lec1`…`lec14` 转成 `pages[]`。
2. 先转 2 讲（约 80 页）做人工标注试点，验证"每讲一章 / 每节一章"的粒度约定。
3. 试点通过后再批量转 14 讲，split 按讲划分（`lec1-10` train、`lec11-12` dev、`lec13-14` test）。

## layout 赛道的来源排查（2026-10-24）

目标：找**许可明确 + 含 PDF/PPTX**的中文课件，用来抽真实字号。

| 候选 | 许可证 | 文件形态 | 结论 |
|---|---|---|---|
| [LearningOS/os-lectures](https://github.com/LearningOS/os-lectures) | MIT | 1133 个文件，**0 份讲义 PDF/PPTX**（只有 4 个插图 PDF） | 只能进 text 赛道 |
| [niuniu-869/humanitys-last-math-book](https://github.com/niuniu-869/humanitys-last-math-book) | **CC-BY-SA-4.0** | 480 个 PDF，但**全部在 `books/*/fig/` 下，是插图**；正文是 LaTeX/Markdown | 需要本地编译 LaTeX 才有 PDF |
| hqhq1025/ai-course-notes | 待核（API 返回 500） | 声称 303 份中文讲义 + PDF | 待重试 |

**结论**：许可明确的中文课程，公开仓库里基本都是 Markdown/LaTeX 源码，
很少附带编译好的 PDF/PPTX。真实版式的可选项只有三条：

1. **你自己的课件**（PPTX/PDF 原生字号的唯一稳定来源）；
2. **本地编译** CC-BY-SA 教材的 LaTeX（需要 TeX 环境）——编译产物的版式由模板决定，应在
   `layout_source` 里标成 `latex-build`，不能当"真实排版"；
3. **MIT OCW** 等英文 PDF（许可 CC BY-NC-SA，非商用限制）。

当前 layout 赛道仅有 `deck-800`（`layout_source: pptx`，34 页全带字号）。
