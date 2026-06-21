import { describe, expect, it } from 'vitest'
import type { Note } from './types'
import { mergeDiskNotes } from './notePersistence'
import { getExpiredScratchIds, getNoteTreeIds } from './noteTree'

function note(id: string, updates: Partial<Note> = {}): Note {
  return {
    id,
    title: id,
    content: '',
    parentId: null,
    isScratch: false,
    scratchExpiresAt: null,
    taskListId: null,
    createdAt: 1,
    updatedAt: 1,
    editSessions: [],
    ...updates
  }
}

describe('note persistence helpers', () => {
  it('preserves local identity while migrating a legacy title file', () => {
    const local = note('local-id', { title: 'Project', taskListId: 'list-1', updatedAt: 5 })
    const disk = {
      ...note('legacy-id', { title: 'Project', content: 'from disk', updatedAt: 10 }),
      legacyFileName: 'project.md',
      legacyScratch: false
    }
    const result = mergeDiskNotes([local], [disk])

    expect(result.notes).toEqual([{ ...local, content: 'from disk', updatedAt: 10 }])
    expect(result.legacyFiles).toEqual([{ fileName: 'project.md', isScratch: false }])
  })

  it('collects every descendant for recursive deletion', () => {
    const notes = [
      note('root'),
      note('child', { parentId: 'root' }),
      note('grandchild', { parentId: 'child' }),
      note('other')
    ]
    expect(getNoteTreeIds(notes, 'root')).toEqual(['root', 'child', 'grandchild'])
  })

  it('finds only expired scratch notes', () => {
    const notes = [
      note('expired', { isScratch: true, scratchExpiresAt: 10 }),
      note('active', { isScratch: true, scratchExpiresAt: 30 }),
      note('permanent', { scratchExpiresAt: 10 })
    ]
    expect(getExpiredScratchIds(notes, 20)).toEqual(['expired'])
  })

  it('keeps a newer local structured note', () => {
    const local = note('same-id', { content: 'local', updatedAt: 20 })
    const disk = note('same-id', { content: 'disk', updatedAt: 10 })
    expect(mergeDiskNotes([local], [disk]).notes).toEqual([local])
  })

  it('uses a newer structured disk note', () => {
    const local = note('same-id', { content: 'local', updatedAt: 10 })
    const disk = note('same-id', { content: 'disk', updatedAt: 20 })
    expect(mergeDiskNotes([local], [disk]).notes).toEqual([disk])
  })

  it('keeps notes that exist on only one side', () => {
    const local = note('local')
    const disk = note('disk')
    expect(mergeDiskNotes([local], [disk]).notes).toEqual([disk, local])
  })

  it.fails('honors deletion of a structured note from disk after initialization', () => {
    const deletedOnDisk = note('deleted')
    expect(mergeDiskNotes([deletedOnDisk], []).notes).toEqual([])
  })

  it('does not match a scratch legacy note to a permanent note', () => {
    const local = note('local', { title: 'Same' })
    const disk = {
      ...note('legacy', { title: 'Same', isScratch: true, scratchExpiresAt: 20 }),
      legacyFileName: 'same.md',
      legacyScratch: true
    }
    expect(mergeDiskNotes([local], [disk]).notes.map(item => item.id)).toEqual(['legacy', 'local'])
  })

  it('handles cyclic parent data without looping', () => {
    const notes = [
      note('one', { parentId: 'two' }),
      note('two', { parentId: 'one' })
    ]
    expect(getNoteTreeIds(notes, 'one')).toEqual(['one', 'two'])
  })
})
