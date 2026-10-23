# course-chapter-bench · 中文课件分章基准

给定一份中文课件（幻灯片 / 讲义 / 教材 PDF），预测**每一章从哪一页开始**以及**章标题**。

> 现状：中文里没有公开的"课件分章"基准。最接近的是段落级主题结构语料
> [CPTS](https://github.com/fjiangAI/CPTS)（14 393 篇新闻，段落级），以及文档解析基准
> [OmniDocBench](https://github.com/opendatalab/OmniDocBench)、
> [opendataloader-bench](https://github.com/opendataloader-project/opendataloader-bench)——
> 它们评的是"解析得准不准"，不评"章分得对不对"。本仓库补这个空位。

## 任务

| 赛道 | 输入 | 说明 |
|---|---|---|
| `text-only` | 每页纯文本 | 正则 / LLM / 检索类方法的公平起点 |
| `layout` | 文本 + 字号、字重、页面版式 | 对应 PDF 解析器的真实能力 |

输出（每份文档一个）：

```json
{ "id": "deck-800", "boundaries": [1, 2, 4, 5, 7], "titles": ["封面", "摘要", "..."] }
```

`boundaries` 是 **1-based 页码**，表示该页是某一章的第一页；`titles` 与之一一对应（可选）。

## 指标

| 指标 | 方向 | 说明 |
|---|---|---|
| `windowDiff` | ↓ | 滑动窗口内边界数之差的比例（Pevzner & Hearst 2002） |
| `Pk` | ↓ | 经典分块指标（Beeferman et al. 1999） |
| `boundaryF1` | ↑ | ±1 页容差的边界 F1 |
| `boundarySimilarity` | ↑ | 窗口版 P/R/F1（窗口默认 ±2 页） |
| `countErr` | ↓ | 章数绝对误差 |

标题单独评测（可选）：`rougeL` / 精确匹配率，避免标题质量拖累分章主指标。

## 数据格式

`data/*.jsonl`，一行一份文档，字段见 [docs/schema.md](docs/schema.md)。

## 用法

```bash
node eval/run.mjs --gold data --pred predictions/            # 评测一个预测目录
node eval/run.mjs --gold data --pred predictions/ --json     # 输出 JSON
node eval/test.mjs                                           # 指标自检
```

预测文件：`predictions/<id>.json` 或 `predictions/<id>.jsonl` 里的一行，格式同上面的输出。

## 数据来源与许可

- 代码：Apache-2.0（见 [LICENSE](LICENSE)）
- 标注：CC-BY-4.0（见 [LICENSE-DATA](LICENSE-DATA)）
- **每份文档单独记许可**；不能再分发的课件只发布标注 + 指纹 + 获取方式，
  不复制正文（`text_included: false`）。来源清单见 [data/SOURCES.md](data/SOURCES.md)。

## 现状

| 项 | 值 |
|---|---|
| 文档数 | 2（1 真实 + 1 玩具） |
| 页数 | 34 + 12 |
| 基线 | 见 `baselines/`（待补） |
| 首个参考结果 | `deck-800`：windowDiff 0.061、boundaryF1 0.947（本插件 1.5.0 的分章管道） |

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。新增文档需要：许可明确、标注双人核对、
`node eval/test.mjs` 通过。
