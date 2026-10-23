#!/usr/bin/env node
/**
 * Baseline: "every slide is a chapter" — the floor. Any real method must beat it.
 * Usage: node baselines/every-page.mjs && node eval/run.mjs --pred predictions
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'

mkdirSync('predictions', { recursive: true })
let count = 0
for (const name of readdirSync('data').filter((n) => n.endsWith('.jsonl'))) {
  for (const line of readFileSync(`data/${name}`, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const doc = JSON.parse(line)
    const boundaries = doc.pages.map((p) => p.index)
    writeFileSync(`predictions/${doc.id}.json`, JSON.stringify({ id: doc.id, boundaries }))
    count += 1
  }
}
console.log(`every-page baseline: ${count} prediction(s)`)
