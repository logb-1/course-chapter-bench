#!/usr/bin/env node
/**
 * Convert MIT-licensed lecture decks (LearningOS/os-lectures) into benchmark
 * records.
 *
 * The course author already splits every lecture into `pN-*.md` parts, so the
 * chapter boundaries are objective: **the first slide of each part file**.
 * Within a file, Marp's `---` separates slides (pages).
 *
 *   node tools/fetch-lectures.mjs lec1 lec2
 */
import { createHash } from 'node:crypto'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OWNER = 'LearningOS'
const REPO = 'os-lectures'
const API = `https://api.github.com/repos/${OWNER}/${REPO}/contents`
const RAW = `https://raw.githubusercontent.com/${OWNER}/${REPO}/master`
const LECTURES = process.argv.slice(2).filter((a) => /^lec\d+$/.test(a))
if (!LECTURES.length) LECTURES.push('lec1')

const headers = { 'user-agent': 'course-chapter-bench', accept: 'application/vnd.github+json' }

/** dev = lec1-2, train = lec3-10, test = lec11-14 (by lecture, never by slide). */
function splitOf(dir) {
  const n = Number(String(dir).replace(/\D/g, '')) || 0
  if (n <= 2) return 'dev'
  if (n <= 10) return 'train'
  return 'test'
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** GitHub throws ECONNRESET fairly often on raw.githubusercontent; retry with backoff. */
async function request(url, { json = false } = {}) {
  let last = null
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(url, { headers })
      if (res.ok) return json ? await res.json() : await res.text()
      last = new Error(`HTTP ${res.status} ${url}`)
      if (res.status === 404) throw last
    } catch (error) {
      last = error
    }
    await sleep(600 * (attempt + 1))
  }
  throw last
}

async function listDir(dir) {
  const list = await request(`${API}/${dir}`, { json: true })
  if (!Array.isArray(list)) throw new Error(`list ${dir}: unexpected response`)
  return list
}

async function readFile(path) {
  try {
    return await request(`${RAW}/${path}`)
  } catch {
    const json = await request(`${API}/${path}`, { json: true })
    return Buffer.from(json.content, 'base64').toString('utf8')
  }
}

/** Marp: `---` on its own line separates slides. */
function splitSlides(markdown) {
  // drop the YAML front matter (marp: true / theme / paginate …) first, or the
  // opening `---` becomes a slide and every title reads "---"
  const body = String(markdown)
    .replace(/^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n/, '')
    .replace(/\r/g, '')
  return body
    .split(/\n-{3,}\n/)
    .map((slide) => slide.trim())
    .filter(Boolean)
}

function stripMarkdown(text) {
  return text
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/^\s*-{2,}\s*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function titleOfSlides(slides) {
  for (const slide of slides) {
    const heading = /^#{1,2}\s+(.+)$/m.exec(slide)
    if (heading) return heading[1].trim().slice(0, 60)
    const line = slide
      .split('\n')
      .map((l) => stripMarkdown(l))
      .find((l) => l.length >= 2 && !/^-{2,}$/.test(l))
    if (line) return line.slice(0, 60)
  }
  return ''
}

async function convertLecture(dir) {
  const entries = await listDir(dir)
  let parts = entries
    .filter((e) => e.type === 'file' && /^p\d+.*\.md$/i.test(e.name))
    .sort((a, b) => Number(a.name.match(/^p(\d+)/i)[1]) - Number(b.name.match(/^p(\d+)/i)[1]))

  // some lectures ship one `slides.md`: fall back to the author's own
  // 「第N节」 headings as chapter boundaries
  if (parts.length < 2) {
    const single = entries.find((e) => e.type === 'file' && /\.md$/i.test(e.name) && !/^(readme|cmd)/i.test(e.name))
    if (!single) return null
    parts = []
    const markdown = await readFile(single.path)
    const slides = splitSlides(markdown)
    if (!slides.length) return null
    const pages = []
    const boundaries = []
    const titles = []
    for (const slide of slides) {
      const heading = /^\s*#{1,3}\s*(第\s*[一二三四五六七八九十\d]+\s*[节章][^\n]*)/m.exec(slide)
      if (heading || pages.length === 0) {
        boundaries.push(pages.length + 1)
        titles.push((heading ? heading[1] : titleOfSlides([slide])).slice(0, 60))
      }
      pages.push({ index: pages.length + 1, title: titleOfSlides([slide]), text: stripMarkdown(slide) })
    }
    if (boundaries.length < 2) return null
    const sha = createHash('sha256').update(markdown).digest('hex').slice(0, 16)
    return {
      id: `os-${dir}`,
      title: `操作系统课程讲义 · ${dir}`,
      source: { kind: 'slides', url: `https://github.com/${OWNER}/${REPO}/tree/master/${dir}`, author: OWNER, license: 'MIT', sha256: sha },
      text_included: true,
      split: splitOf(dir),
      pages,
      gold: {
        boundaries,
        titles,
        annotators: ['author-section-headings'],
        notes: '单文件讲义：章节边界 = 作者自己的「第N节」标题所在幻灯片',
      },
    }
  }

  const pages = []
  const boundaries = []
  const titles = []
  const sources = []
  for (const part of parts) {
    const markdown = await readFile(part.path)
    sources.push(`--- ${part.path}\n${markdown}`)
    const slides = splitSlides(markdown)
    if (!slides.length) continue
    boundaries.push(pages.length + 1)
    // every pN file repeats the lecture H1, so the section line is the useful title
    const section = slides
      .map((slide) => (/^\s*#{0,6}\s*(第[一二三四五六七八九十\d]+节[^\n]*)/m.exec(slide) || [])[1])
      .find(Boolean)
    titles.push((section || titleOfSlides(slides) || part.name.replace(/\.md$/i, '')).slice(0, 60))
    for (const slide of slides) {
      pages.push({
        index: pages.length + 1,
        title: titleOfSlides([slide]),
        text: stripMarkdown(slide),
      })
    }
  }

  const sha = createHash('sha256').update(sources.join('\n')).digest('hex').slice(0, 16)
  return {
    id: `os-${dir}`,
    title: `操作系统课程讲义 · ${dir}`,
    source: {
      kind: 'slides',
      url: `https://github.com/${OWNER}/${REPO}/tree/master/${dir}`,
      author: OWNER,
      license: 'MIT',
      sha256: sha,
    },
    text_included: true,
    // split by lecture: the same course must not appear in two splits
    split: splitOf(dir),
    pages,
    gold: {
      boundaries,
      titles,
      annotators: ['author-part-files'],
      notes: '章节边界 = 每个 pN-*.md 的第一张幻灯片（作者自己的分讲结构）；页 = Marp 的 --- 分隔',
    },
  }
}

mkdirSync('data', { recursive: true })
const records = []
for (const dir of LECTURES) {
  const record = await convertLecture(dir)
  if (!record) {
    console.log(`SKIP ${dir}: 没有可用于切分的结构（单文件且无「第N节」标题）`)
    continue
  }
  records.push(record)
  console.log(`${record.id}: ${record.pages.length} 页, ${record.gold.boundaries.length} 章, sha ${record.source.sha256}`)
  writeFileSync(join('data', `${record.id}.jsonl`), `${JSON.stringify(record)}\n`)
}
console.log(`wrote ${records.length} file(s) to data/`)
