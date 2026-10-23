/**
 * Dataset loader shared by baselines.
 *
 * `stripHeading: true` is the ablation view: the first heading line of each page
 * is removed, so a text-only baseline can no longer win by pattern-matching the
 * slide title. Gold boundaries are unchanged.
 */
import { readFileSync, readdirSync } from 'node:fs'

const HEADING = /^\s*(第\s*[一二三四五六七八九十\d]+\s*[节章讲部]|#{1,6}\s|[一二三四五六七八九十]+\s*[、.]|\d+(\.\d+)*\s*[、.)]?)/

export function loadDocs({ dir = 'data', stripHeading = false, only = [] } = {}) {
  const docs = []
  for (const name of readdirSync(dir).filter((n) => n.endsWith('.jsonl'))) {
    for (const line of readFileSync(`${dir}/${name}`, 'utf8').split(/\r?\n/).filter(Boolean)) {
      const doc = JSON.parse(line)
      if (only.length && !only.includes(doc.id)) continue
      if (stripHeading) {
        doc.pages = doc.pages.map((page) => {
          // remove every line that carries a structural cue (第N节/章、一、、1.),
          // not just the first one: lecture slides repeat them in body text
          const lines = String(page.text || '')
            .split('\n')
            .filter((line) => !HEADING.test(line))
          return { ...page, text: lines.join('\n') }
        })
      }
      docs.push(doc)
    }
  }
  return docs
}
