import type { Note } from './types'

export function getNoteTreeIds(notes: Note[], rootId: string) {
  const ids = new Set<string>()
  const visit = (id: string) => {
    if (ids.has(id)) return
    ids.add(id)
    notes.filter(note => note.parentId === id).forEach(note => visit(note.id))
  }
  visit(rootId)
  return [...ids]
}

export function getExpiredScratchIds(notes: Note[], now: number) {
  return notes
    .filter(note => note.isScratch && note.scratchExpiresAt !== null && note.scratchExpiresAt <= now)
    .map(note => note.id)
}
