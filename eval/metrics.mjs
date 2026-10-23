/**
 * Chapter-boundary metrics, aligned with how the segmentation literature
 * reports them (Pk, WindowDiff) plus page-level extras.
 *
 * All inputs are boolean arrays: `flags[i] === true` means page i+1 opens a
 * chapter. Keep them the same length.
 */

/** boolean[] → 0-based chapter labels */
export function labelsOf(flags) {
  let current = 0
  return flags.map((flag, i) => {
    if (i > 0 && flag) current += 1
    return current
  })
}

const defaultWindow = (flags) => {
  const n = flags.length
  const chapters = flags.filter(Boolean).length
  return Math.max(1, Math.round(n / (2 * Math.max(1, chapters))))
}

/**
 * Pk (Beeferman et al. 1999): share of positions where the "same segment as
 * k pages later" judgement differs. Lower is better.
 */
export function pk(ref, hyp, k) {
  if (ref.length !== hyp.length || !ref.length) return 1
  const n = ref.length
  const kk = k || defaultWindow(ref)
  const a = labelsOf(ref)
  const b = labelsOf(hyp)
  let err = 0
  let total = 0
  for (let i = 0; i + kk < n; i += 1) {
    if ((a[i] === a[i + kk]) !== (b[i] === b[i + kk])) err += 1
    total += 1
  }
  return total ? round(err / total) : 0
}

/**
 * WindowDiff (Pevzner & Hearst 2002): share of windows whose boundary counts
 * differ. Lower is better.
 */
export function windowDiff(ref, hyp, k) {
  if (ref.length !== hyp.length || !ref.length) return 1
  const n = ref.length
  const kk = k || defaultWindow(ref)
  const countIn = (flags, from, to) => {
    let n2 = 0
    for (let i = from; i < to; i += 1) if (flags[i]) n2 += 1
    return n2
  }
  let err = 0
  let total = 0
  for (let i = 0; i + kk < n; i += 1) {
    if (countIn(ref, i + 1, i + kk + 1) !== countIn(hyp, i + 1, i + kk + 1)) err += 1
    total += 1
  }
  return total ? round(err / total) : 0
}

/** ±tolerance page boundary F1 (a boundary one page off still helps a reader). */
export function boundaryF1(ref, hyp, tolerance = 1) {
  const r = ref.reduce((acc, flag, i) => (flag && i > 0 ? [...acc, i] : acc), [])
  const h = hyp.reduce((acc, flag, i) => (flag && i > 0 ? [...acc, i] : acc), [])
  if (!r.length && !h.length) return { precision: 1, recall: 1, f1: 1 }
  const used = new Set()
  let matched = 0
  for (const target of r) {
    let best = -1
    let bestGap = Infinity
    h.forEach((candidate, index) => {
      if (used.has(index)) return
      const gap = Math.abs(candidate - target)
      if (gap <= tolerance && gap < bestGap) {
        best = index
        bestGap = gap
      }
    })
    if (best >= 0) {
      used.add(best)
      matched += 1
    }
  }
  const precision = h.length ? matched / h.length : 0
  const recall = r.length ? matched / r.length : 0
  return {
    precision: round(precision),
    recall: round(recall),
    f1: round(precision + recall ? (2 * precision * recall) / (precision + recall) : 0),
  }
}

/**
 * Boundary Similarity (Fournier's windowed F1): a prediction within `window`
 * pages of a gold boundary is a hit. Tolerant to segmentation-granularity noise.
 */
export function boundarySimilarity(ref, hyp, window = 2) {
  const near = (list, target) => list.some((candidate) => Math.abs(candidate - target) <= window)
  const r = ref.reduce((acc, flag, i) => (flag && i > 0 ? [...acc, i] : acc), [])
  const h = hyp.reduce((acc, flag, i) => (flag && i > 0 ? [...acc, i] : acc), [])
  if (!r.length && !h.length) return { precision: 1, recall: 1, f1: 1 }
  const precision = h.length ? h.filter((page) => near(r, page)).length / h.length : 0
  const recall = r.length ? r.filter((page) => near(h, page)).length / r.length : 0
  return {
    precision: round(precision),
    recall: round(recall),
    f1: round(precision + recall ? (2 * precision * recall) / (precision + recall) : 0),
  }
}

/** Absolute chapter-count error (lower is better). */
export function countErr(ref, hyp) {
  return Math.abs(ref.filter(Boolean).length - hyp.filter(Boolean).length)
}

const round = (value) => Math.round(value * 1000) / 1000

/** One call for one document. */
export function evaluate(refFlags, hypFlags, { tolerance = 1, window = 2 } = {}) {
  return {
    windowDiff: windowDiff(refFlags, hypFlags),
    pk: pk(refFlags, hypFlags),
    boundaryF1: boundaryF1(refFlags, hypFlags, tolerance).f1,
    boundarySimilarity: boundarySimilarity(refFlags, hypFlags, window).f1,
    countErr: countErr(refFlags, hypFlags),
    chapters: { gold: refFlags.filter(Boolean).length, predicted: hypFlags.filter(Boolean).length },
  }
}

/** Page-level boundary list → flags of a known page count. */
export function flagsFromBoundaries(boundaries, pageCount) {
  const flags = new Array(pageCount).fill(false)
  for (const page of boundaries || []) {
    if (Number.isInteger(page) && page >= 1 && page <= pageCount) flags[page - 1] = true
  }
  flags[0] = true
  return flags
}
