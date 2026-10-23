#!/usr/bin/env node
/**
 * Layout baseline: a page opens a chapter when its title font is clearly larger
 * than the document's median title size (≥1.5×). Only documents that carry
 * `heading.size` (layout track) get a prediction.
 *
 *   node baselines/font-size.mjs && node eval/run.mjs --pred predictions
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadDocs } from '../eval/dataset.mjs'

mkdirSync('predictions', { recursive: true })
let count = 0
for (const doc of loadDocs()) {
  const sized = doc.pages.filter((p) => Number(p.heading?.size) > 0)
  if (sized.length < doc.pages.length * 0.5) continue // not a layout document
  const sizes = sized.map((p) => Number(p.heading.size)).sort((a, b) => a - b)
  const median = sizes[Math.floor(sizes.length / 2)]
  const boundaries = []
  for (const page of doc.pages) {
    const size = Number(page.heading?.size) || 0
    if (page.index === 1 || (median > 0 && size >= median * 1.5)) boundaries.push(page.index)
  }
  writeFileSync(`predictions/${doc.id}.json`, JSON.stringify({ id: doc.id, boundaries }))
  count += 1
}
console.log(`font-size baseline: ${count} layout document(s)`)
