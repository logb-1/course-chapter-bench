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

async function listDir(dir) {
  const res = await fetch(`${API}/${dir}`, { headers })
  if (!res.ok) throw new Error(`list ${dir}: HTTP ${res.status}`)
  return res.json()
}

async function readFile(path) {
  const raw = await fetch(`${RAW}/${path}`, { headers })
  if (raw.ok) return raw.text()
  const res = await fetch(`${API}/${path}`, { headers })
  const json = await res.json()
  return Buffer.from(json.content, 'base64').toString('utf8')
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
  const parts = entries
    .filter((e) => e.type === 'file' && /^p\d+.*\.md$/i.test(e.name))
    .sort((a, b) => Number(a.name.match(/^p(\d+)/i)[1]) - Number(b.name.match(/^p(\d+)/i)[1]))
  if (parts.length < 2) throw new Error(`${dir}: 只找到 ${parts.length} 个 part 文件`)

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
    split: dir === 'lec1' || dir === 'lec2' ? 'dev' : 'train',
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
  records.push(record)
  console.log(`${record.id}: ${record.pages.length} 页, ${record.gold.boundaries.length} 章, sha ${record.source.sha256}`)
  writeFileSync(join('data', `${record.id}.jsonl`), `${JSON.stringify(record)}\n`)
}
console.log(`wrote ${records.length} file(s) to data/`)
