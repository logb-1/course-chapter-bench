# 贡献指南

## 新增一份文档

1. **确认许可**：`source.license` 必填。可再分发的（CC-BY / CC-BY-SA / CC0 / 公有领域）
   才可以带 `text_included: true`；其余一律 `false`，只发标注 + `sha256` + 获取方式。
2. **标注边界**：`gold.boundaries` 是 1-based 页码，第 1 页必须在列表中。
   标题可选，但给了就要和边界等长。
3. **双人核对**：`gold.annotators` 写两个人/两种来源；只用自动推导的（例如课件自带编号）
   要在 `gold.notes` 里写明来源，不能伪装成人工标注。
4. **split**：同一门课的所有文档必须落在同一 split（`train`/`dev`/`test`）。
5. **自检**：`node eval/test.mjs` 与 `node eval/run.mjs --gold data --pred data --self-check` 都要通过。

## 新增基线

放在 `baselines/<方法名>.mjs`，输出 `predictions/<id>.json`，并在 README 的结果表里加一行。
基线必须能在 `text-only` 赛道离线跑（不联网、不调用付费 API）。

## 提交前检查

```bash
node eval/test.mjs
node eval/run.mjs --gold data --pred data --self-check
```
