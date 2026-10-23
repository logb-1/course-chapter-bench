#!/usr/bin/env node
/**
 * Baseline: text-only heuristic — a slide that opens with 「第N节/第N章/Chapter N」
 * starts a chapter. This is what a regex-only pipeline can do without looking at
 * font size or layout.
 *
 * Usage: node baselines/section-heading.mjs && node eval/run.mjs --pred predictions
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

const HEADING = /^\s*(第\s*[一二三四五六七八九十\d]+\s*[节章讲部]|chapter\s*\d+)/im

mkdirSync('predictions', { recursive: true })
let count = 0
for (const name of readdirSync('data').filter((n) => n.endsWith('.jsonl'))) {
  for (const line of readFileSync(`data/${name}`, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const doc = JSON.parse(line)
    const boundaries = []
    for (const page of doc.pages) {
      const head = String(page.text || '').split('\n').slice(0, 3).join('\n')
      if (page.index === 1 || HEADING.test(head)) boundaries.push(page.index)
    }
    writeFileSync(`predictions/${doc.id}.json`, JSON.stringify({ id: doc.id, boundaries }))
    count += 1
  }
}
console.log(`section-heading baseline: ${count} prediction(s)`)
