import { createHash } from 'crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync
} from 'fs'
import { basename, extname, join } from 'path'
import type { Note } from '../src/lib/types'

export interface DiskNote extends Note {
  legacyFileName?: string
  legacyScratch?: boolean
}

const metadataPattern = /^<!-- handin:(.+) -->\n/

function safeNoteId(id: string) {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error('Invalid note id')
  return id
}

function normalizeTitle(title: string) {
  return title.replace(/[\r\n]+/g, ' ').trim() || 'Untitled'
}

function contentHash(title: string, content: string) {
  return createHash('sha1').update(`${normalizeTitle(title)}\n${content}`).digest('hex')
}

export function serializeNote(note: Note) {
  const title = normalizeTitle(note.title)
  const metadata = JSON.stringify({
    id: note.id,
    parentId: note.parentId,
    isScratch: note.isScratch,
    scratchExpiresAt: note.scratchExpiresAt,
    taskListId: note.taskListId,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
    editSessions: note.editSessions,
    contentHash: contentHash(title, note.content)
  })
  return `<!-- handin:${metadata} -->\n# ${title}\n\n${note.content}`
}

export function parseNoteFile(fileName: string, raw: string, isScratch: boolean): DiskNote {
  const metadataMatch = raw.match(metadataPattern)
  const stats = statSync(fileName)

  if (metadataMatch) {
    const body = raw.slice(metadataMatch[0].length)
    const headingEnd = body.indexOf('\n')
    const title = body.startsWith('# ')
      ? body.slice(2, headingEnd === -1 ? undefined : headingEnd).trim()
      : basename(fileName, extname(fileName))
    const content = headingEnd === -1 ? '' : body.slice(headingEnd + 1).replace(/^\n/, '')
    let metadata: Partial<Note> & { contentHash?: string }
    try {
      metadata = JSON.parse(metadataMatch[1]) as Partial<Note> & { contentHash?: string }
    } catch {
      return {
        id: basename(fileName, extname(fileName)),
        title: normalizeTitle(title),
        content,
        parentId: null,
        isScratch,
        scratchExpiresAt: isScratch ? stats.mtimeMs + 86400000 : null,
        taskListId: null,
        createdAt: stats.birthtimeMs || stats.mtimeMs,
        updatedAt: stats.mtimeMs,
        editSessions: []
      }
    }
    return {
      id: String(metadata.id || basename(fileName, extname(fileName))),
      title: normalizeTitle(title),
      content,
      parentId: metadata.parentId || null,
      isScratch,
      scratchExpiresAt: metadata.scratchExpiresAt || null,
      taskListId: metadata.taskListId || null,
      createdAt: metadata.createdAt || stats.birthtimeMs || stats.mtimeMs,
      updatedAt: metadata.contentHash === contentHash(title, content)
        ? metadata.updatedAt || stats.mtimeMs
        : Math.max(metadata.updatedAt || 0, stats.mtimeMs),
      editSessions: Array.isArray(metadata.editSessions) ? metadata.editSessions : []
    }
  }

  const lines = raw.split('\n')
  const firstLine = lines[0]?.trim() || ''
  const title = firstLine.startsWith('# ')
    ? firstLine.slice(2).trim()
    : basename(fileName, extname(fileName)).replace(/-/g, ' ')
  const content = firstLine.startsWith('# ')
    ? lines.slice(1).join('\n').replace(/^\n/, '')
    : raw
  const legacyKey = `${isScratch ? 'scratch' : 'note'}:${basename(fileName)}`

  return {
    id: `legacy-${createHash('sha1').update(legacyKey).digest('hex').slice(0, 20)}`,
    title: normalizeTitle(title),
    content,
    parentId: null,
    isScratch,
    scratchExpiresAt: isScratch ? stats.mtimeMs + 86400000 : null,
    taskListId: null,
    createdAt: stats.birthtimeMs || stats.mtimeMs,
    updatedAt: stats.mtimeMs,
    editSessions: [],
    legacyFileName: basename(fileName),
    legacyScratch: isScratch
  }
}

export function readNoteFiles(notesDir: string, scratchDir: string) {
  const readDirectory = (directory: string, isScratch: boolean) => {
    if (!existsSync(directory)) return []
    return readdirSync(directory)
      .filter(fileName => fileName.endsWith('.md'))
      .map(fileName => {
        const path = join(directory, fileName)
        return parseNoteFile(path, readFileSync(path, 'utf-8'), isScratch)
      })
  }

  return [...readDirectory(notesDir, false), ...readDirectory(scratchDir, true)]
}

export function writeNoteFile(note: Note, notesDir: string, scratchDir: string) {
  const id = safeNoteId(note.id)
  const targetDir = note.isScratch ? scratchDir : notesDir
  const previousDir = note.isScratch ? notesDir : scratchDir
  mkdirSync(targetDir, { recursive: true })
  mkdirSync(previousDir, { recursive: true })
  const target = join(targetDir, `${id}.md`)
  const temporary = `${target}.tmp`
  writeFileSync(temporary, serializeNote(note), 'utf-8')
  renameSync(temporary, target)
  const previous = join(previousDir, `${id}.md`)
  if (existsSync(previous)) unlinkSync(previous)
}

export function deleteNoteFile(id: string, notesDir: string, scratchDir: string) {
  const safeId = safeNoteId(id)
  for (const directory of [notesDir, scratchDir]) {
    const path = join(directory, `${safeId}.md`)
    if (existsSync(path)) unlinkSync(path)
  }
}

export function deleteLegacyNoteFile(fileName: string, isScratch: boolean, notesDir: string, scratchDir: string) {
  if (basename(fileName) !== fileName || !fileName.endsWith('.md')) throw new Error('Invalid legacy file name')
  const path = join(isScratch ? scratchDir : notesDir, fileName)
  if (existsSync(path)) unlinkSync(path)
}
