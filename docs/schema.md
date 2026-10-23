# 数据格式（v1）

每个 `data/*.jsonl` 文件一行一份文档（UTF-8，无 BOM）。

```jsonc
{
  "id": "deck-800",                     // 全局唯一，建议 <来源>-<短名>
  "title": "关上 800 美元的「小门」",
  "source": {
    "kind": "slides",                   // slides | textbook | paper | scanned
    "url": "https://...",               // 可获取地址（没有就留空）
    "author": "logb-1",
    "license": "CC-BY-4.0",             // 必填；不确定就写 "unknown" 并标 text_included:false
    "sha256": "…"                       // 原文件的 sha256（前 16 位即可）
  },
  "text_included": true,                // false = 只发布标注，不复制正文
  "layout_source": "pptx",              // pptx | pdf | marp-theme | none（layout 赛道用）
  "pages": [                            // text_included 为 true 时必填
    {
      "index": 1,                       // 1-based
      "title": "封面标题",               // 页面第一行（可空）
      "text": "去掉页眉页脚后的正文",
      "heading": { "size": 24, "bold": true }   // layout 赛道用；没有就省略
    }
  ],
  "gold": {
    "boundaries": [1, 2, 4, 5, 7, 10, 12, 16, 25, 30, 32],
    "titles": ["封面", "一页摘要", "…"],
    "annotators": ["A", "B"],           // 双人标注时写两人编号
    "notes": "边界取自课件自带的 § 编号"
  }
}
```

## 约定

- 页码一律 **1-based**，且第 1 页永远是章首（封面也算一章或并入第一章，随标注决定）。
- 章标题为空时用空字符串，不要省略数组元素。
- `boundaries` 与 `titles` 等长；没有标题任务就整段省略 `titles`。
- 同一门课的不同章节必须落在同一个 split（`train`/`dev`/`test` 在 manifest 里指定），避免泄漏。
- 只要 `text_included: true` 的文档才能进 `text-only` 赛道；其余只进边界赛道。
