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
