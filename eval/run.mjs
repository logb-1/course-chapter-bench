#!/usr/bin/env node
/**
 * Evaluate predictions against the gold set.
 *
 *   node eval/run.mjs --gold data --pred predictions
 *   node eval/run.mjs --gold data --pred predictions --json
 *
 * Prediction files: `<id>.json` containing `{ id, boundaries:[...], titles?:[] }`.
 * Documents whose gold record has `text_included: false` still count for the
 * boundary track; they are simply not usable by text-only baselines.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'
import { evaluate, flagsFromBoundaries } from './metrics.mjs'

const args = process.argv.slice(2)
const arg = (name, fallback = '') => {
  const at = args.indexOf(name)
  return at >= 0 ? args[at + 1] || fallback : fallback
}
const GOLD = arg('--gold', 'data')
const PRED = arg('--pred', 'predictions')
const AS_JSON = args.includes('--json')
// --self-check scores the gold against itself: verifies the plumbing in CI
const SELF_CHECK = args.includes('--self-check')

function readJsonl(file) {
  return readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line))
}

function loadGold(dir) {
  if (!existsSync(dir)) throw new Error(`gold 目录不存在：${dir}`)
  const docs = new Map()
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.jsonl'))) {
    for (const doc of readJsonl(join(dir, name))) {
      const pageCount = doc.pages?.length
      if (!pageCount) throw new Error(`${doc.id} 缺少 pages（无法确定页数）`)
      docs.set(doc.id, { doc, pageCount })
    }
  }
  return docs
}

function loadPred(dir) {
  const preds = new Map()
  if (!existsSync(dir)) return preds
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const value = JSON.parse(readFileSync(join(dir, name), 'utf8'))
    preds.set(value.id || basename(name, '.json'), value)
  }
  return preds
}

const gold = loadGold(GOLD)
const preds = loadPred(PRED)
const rows = []
for (const [id, { doc, pageCount }] of gold) {
  const pred = preds.get(id) || (SELF_CHECK ? { id, boundaries: doc.gold?.boundaries || [] } : null)
  if (!pred) {
    rows.push({ id, missing: true })
    continue
  }
  const refFlags = flagsFromBoundaries(doc.gold?.boundaries || [], pageCount)
  const hypFlags = flagsFromBoundaries(pred.boundaries || [], pageCount)
  rows.push({ id, kind: doc.source?.kind || 'unknown', ...evaluate(refFlags, hypFlags) })
}

const scored = rows.filter((row) => !row.missing)
const mean = (key) => (scored.length ? scored.reduce((sum, row) => sum + row[key], 0) / scored.length : 0)
const summary = {
  documents: gold.size,
  scored: scored.length,
  missing: rows.length - scored.length,
  windowDiff: round(mean('windowDiff')),
  pk: round(mean('pk')),
  boundaryF1: round(mean('boundaryF1')),
  boundarySimilarity: round(mean('boundarySimilarity')),
  countErr: round(mean('countErr')),
}

function round(value) {
  return Math.round(value * 1000) / 1000
}

if (AS_JSON) {
  console.log(JSON.stringify({ summary, rows }, null, 2))
} else {
  console.log('id'.padEnd(28), 'kind'.padEnd(9), 'WD'.padStart(6), 'Pk'.padStart(6), 'F1'.padStart(6), 'BS'.padStart(6), 'Δch'.padStart(5))
  for (const row of rows) {
    if (row.missing) {
      console.log(`${row.id.padEnd(28)} MISSING`)
      continue
    }
    console.log(
      row.id.padEnd(28),
      String(row.kind).padEnd(9),
      String(row.windowDiff).padStart(6),
      String(row.pk).padStart(6),
      String(row.boundaryF1).padStart(6),
      String(row.boundarySimilarity).padStart(6),
      String(row.countErr).padStart(5),
    )
  }
  console.log(
    `\nmean  windowDiff=${summary.windowDiff}  Pk=${summary.pk}  boundaryF1=${summary.boundaryF1}  BS=${summary.boundarySimilarity}  Δchapters=${summary.countErr}` +
      `\n${summary.scored}/${summary.documents} docs${summary.missing ? `，${summary.missing} 份缺预测` : ''}`,
  )
}
