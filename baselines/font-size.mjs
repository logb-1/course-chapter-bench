#!/usr/bin/env node
/**
 * Layout baseline: a page opens a chapter when its title font stands out from
 * its *local* neighbourhood, not from the document-wide median.
 *
 * For page i take the median title size of the W pages before it (`before`) and
 * of the W pages after it (`after`); page i is a boundary when
 *
 *     size >= before * RATIO  &&  size >= after * RATIO
 *
 * i.e. the title is larger than both the context it leaves and the body it
 * opens. Page 1 (the cover) is always a boundary. Pages without a following
 * window (the tail of the deck) cannot be boundaries: a chapter opener has to
 * have pages after it to open.
 *
 * Why local instead of a fixed threshold: in real decks the chapter divider is
 * only ~10-30% larger than the body text (ics-ch3 40pt vs 36pt, deck-800 32pt
 * vs 25pt), so "≥1.5× the document median" mostly matched cover pages and
 * scored F1 0. A window median also survives an outlier cover page (50pt in deck-800)
 * that would otherwise drag a whole-document baseline up.
 *
 * Only documents that carry `heading.size` (layout track) get a prediction.
 *
 *   node baselines/font-size.mjs                          # W=3, RATIO=1.05
 *   node baselines/font-size.mjs --window=5 --ratio=1.3   # other operating points
 *   node baselines/font-size.mjs && node eval/run.mjs --pred predictions
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadDocs } from '../eval/dataset.mjs'

const numericFlag = (name, fallback) => {
  const at = process.argv.slice(2).findIndex((arg) => arg.startsWith(`--${name}=`))
  if (at < 0) return fallback
  const value = Number(process.argv.slice(2)[at].split('=')[1])
  return Number.isFinite(value) && value > 0 ? value : fallback
}
const WINDOW = Math.round(numericFlag('window', 3))
const RATIO = numericFlag('ratio', 1.05)

/** Median of a page's title sizes; null for an empty window (document edge). */
function median(sizes) {
  if (!sizes.length) return null
  const sorted = [...sizes].sort((a, b) => a - b)
  const mid = sorted.length >> 1
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

mkdirSync('predictions', { recursive: true })
let count = 0
for (const doc of loadDocs()) {
  const sizes = doc.pages.map((page) => Number(page.heading?.size) || 0)
  if (sizes.filter((size) => size > 0).length < doc.pages.length * 0.5) continue // not a layout document

  const boundaries = []
  for (const page of doc.pages) {
    if (page.index === 1) {
      boundaries.push(page.index) // the cover always opens the document
      continue
    }
    const i = page.index - 1
    const size = sizes[i]
    const before = median(sizes.slice(Math.max(0, i - WINDOW), i))
    const after = median(sizes.slice(i + 1, i + 1 + WINDOW))
    if (after === null) continue // last pages: nothing after them to open
    const risesAboveContext = before === null || size >= before * RATIO
    if (risesAboveContext && size >= after * RATIO) boundaries.push(page.index)
  }
  writeFileSync(`predictions/${doc.id}.json`, JSON.stringify({ id: doc.id, boundaries }))
  count += 1
}
console.log(`font-size baseline (local window W=${WINDOW}, ratio=${RATIO}): ${count} layout document(s)`)
