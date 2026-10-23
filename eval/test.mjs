#!/usr/bin/env node
/**
 * Metric self-checks. Run: node eval/test.mjs
 */
import assert from 'node:assert/strict'
import { boundaryF1, boundarySimilarity, countErr, evaluate, flagsFromBoundaries, pk, windowDiff } from './metrics.mjs'

const flags = (pages, boundaries) => flagsFromBoundaries(boundaries, pages)

// perfect prediction
{
  const ref = flags(20, [1, 6, 11, 16])
  const same = evaluate(ref, ref)
  assert.equal(same.windowDiff, 0, 'windowDiff 完全一致应为 0')
  assert.equal(same.pk, 0, 'Pk 完全一致应为 0')
  assert.equal(same.boundaryF1, 1, 'F1 完全一致应为 1')
  assert.equal(same.boundarySimilarity, 1, 'BS 完全一致应为 1')
  assert.equal(same.countErr, 0)
}

// one boundary shifted by one page: tolerant metrics should still be high
{
  const ref = flags(20, [1, 6, 11, 16])
  const hyp = flags(20, [1, 7, 11, 16])
  assert.ok(boundaryF1(ref, hyp, 1).f1 >= 0.9, `±1 容差应基本满分，实际 ${boundaryF1(ref, hyp, 1).f1}`)
  assert.ok(boundarySimilarity(ref, hyp, 2).f1 >= 0.9, 'BS 窗口内应满分')
  assert.ok(pk(ref, hyp) >= 0 && pk(ref, hyp) <= 1)
  assert.ok(windowDiff(ref, hyp) >= 0 && windowDiff(ref, hyp) <= 1)
}

// clearly wrong segmentation
{
  const ref = flags(20, [1, 6, 11, 16])
  const hyp = flags(20, [1, 10])
  assert.ok(boundaryF1(ref, hyp, 1).f1 <= 0.6, `边界缺失应低分，实际 ${boundaryF1(ref, hyp, 1).f1}`)
  assert.equal(countErr(ref, hyp), 2)
}

// empty / degenerate input never throws
{
  assert.equal(windowDiff([], []), 1)
  assert.equal(pk([], []), 1)
  assert.equal(boundaryF1([], []).f1, 1)
}

console.log('PASS  metrics: Pk / WindowDiff / F1 / BS / countErr')
