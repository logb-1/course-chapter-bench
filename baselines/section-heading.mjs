#!/usr/bin/env node
/**
 * Baseline: text-only heuristic — a slide that opens with 「第N节/第N章/Chapter N」
 * starts a chapter. This is what a regex-only pipeline can do without looking at
 * font size or layout.
 *
 *   node baselines/section-heading.mjs                  # normal view
 *   node baselines/section-heading.mjs --strip-heading  # ablation: heading lines removed
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadDocs } from '../eval/dataset.mjs'

const STRIP = process.argv.includes('--strip-heading')
const HEADING = /^\s*(第\s*[一二三四五六七八九十\d]+\s*[节章讲部]|chapter\s*\d+)/im

mkdirSync('predictions', { recursive: true })
let count = 0
for (const doc of loadDocs({ stripHeading: STRIP })) {
  const boundaries = []
  for (const page of doc.pages) {
    const head = String(page.text || '').split('\n').slice(0, 3).join('\n')
    if (page.index === 1 || HEADING.test(head)) boundaries.push(page.index)
  }
  writeFileSync(`predictions/${doc.id}.json`, JSON.stringify({ id: doc.id, boundaries }))
  count += 1
}
console.log(`section-heading baseline${STRIP ? ' (strip-heading)' : ''}: ${count} prediction(s)`)
