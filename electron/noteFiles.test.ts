import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Note } from '../src/lib/types'
import {
  deleteLegacyNoteFile,
  deleteNoteFile,
  parseNoteFile,
  readNoteFiles,
  serializeNote,
  writeNoteFile
} from './noteFiles'

const temporaryDirectories: string[] = []

function makeDirectories() {
  const root = mkdtempSync(join(tmpdir(), 'handin-'))
  const notes = join(root, 'notes')
  const scratch = join(root, 'scratch')
  mkdirSync(notes)
  mkdirSync(scratch)
  temporaryDirectories.push(root)
  return { root, notes, scratch }
}

function makeNote(updates: Partial<Note> = {}): Note {
  return {
    id: 'note-123',
    title: 'Example note',
    content: '- heading\nbody',
    parentId: null,
    isScratch: false,
    scratchExpiresAt: null,
    taskListId: 'list-1',
    createdAt: 100,
    updatedAt: 200,
    editSessions: [],
    ...updates
  }
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true }))
})

describe('note files', () => {
  it('round-trips note metadata and content', () => {
    const { notes } = makeDirectories()
    const path = join(notes, 'note-123.md')
    const note = makeNote()
    writeFileSync(path, serializeNote(note))

    expect(parseNoteFile(path, readFileSync(path, 'utf-8'), false)).toEqual(note)
  })

  it('detects content changed outside the app', () => {
    const { notes } = makeDirectories()
    const path = join(notes, 'note-123.md')
    const note = makeNote()
    writeFileSync(path, serializeNote(note).replace('body', 'changed body'))

    const parsed = parseNoteFile(path, readFileSync(path, 'utf-8'), false)
    expect(parsed.content).toContain('changed body')
    expect(parsed.updatedAt).toBeGreaterThan(note.updatedAt)
  })

  it('moves scratch notes into permanent notes', () => {
    const { notes, scratch } = makeDirectories()
    const scratchNote = makeNote({ isScratch: true, scratchExpiresAt: 500 })
    writeNoteFile(scratchNote, notes, scratch)
    expect(existsSync(join(scratch, 'note-123.md'))).toBe(true)

    writeNoteFile({ ...scratchNote, isScratch: false, scratchExpiresAt: null }, notes, scratch)
    expect(existsSync(join(notes, 'note-123.md'))).toBe(true)
    expect(existsSync(join(scratch, 'note-123.md'))).toBe(false)
  })

  it('reads and removes legacy notes safely', () => {
    const { notes, scratch } = makeDirectories()
    writeFileSync(join(notes, 'old-note.md'), '# Old note\n\nlegacy body')
    const [legacy] = readNoteFiles(notes, scratch)

    expect(legacy.title).toBe('Old note')
    expect(legacy.content).toBe('legacy body')
    expect(legacy.legacyFileName).toBe('old-note.md')

    deleteLegacyNoteFile('old-note.md', false, notes, scratch)
    expect(existsSync(join(notes, 'old-note.md'))).toBe(false)
  })

  it('deletes a note from either storage directory', () => {
    const { notes, scratch } = makeDirectories()
    writeNoteFile(makeNote(), notes, scratch)
    deleteNoteFile('note-123', notes, scratch)
    expect(existsSync(join(notes, 'note-123.md'))).toBe(false)
  })
})
