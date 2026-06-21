import type { Note } from './types'

export interface DiskNote extends Note {
  legacyFileName?: string
  legacyScratch?: boolean
}

export function mergeDiskNotes(localNotes: Note[], diskNotes: DiskNote[]) {
  const merged = new Map<string, Note>()
  const matchedLocalIds = new Set<string>()
  const legacyFiles: { fileName: string; isScratch: boolean }[] = []

  for (const diskNote of diskNotes) {
    const localById = localNotes.find(note => note.id === diskNote.id)
    const localByTitle = diskNote.legacyFileName
      ? localNotes.find(note =>
          !matchedLocalIds.has(note.id) &&
          note.title.trim().toLowerCase() === diskNote.title.trim().toLowerCase() &&
          note.isScratch === diskNote.isScratch
        )
      : undefined
    const local = localById || localByTitle
    const chosen = local && local.updatedAt > diskNote.updatedAt
      ? local
      : local
        ? { ...local, title: diskNote.title, content: diskNote.content, updatedAt: diskNote.updatedAt }
        : diskNote
    const { legacyFileName, legacyScratch, ...note } = chosen as DiskNote
    merged.set(note.id, note)
    if (local) matchedLocalIds.add(local.id)
    if (diskNote.legacyFileName) {
      legacyFiles.push({
        fileName: diskNote.legacyFileName,
        isScratch: diskNote.legacyScratch ?? diskNote.isScratch
      })
    }
  }

  for (const note of localNotes) {
    if (!matchedLocalIds.has(note.id) && !merged.has(note.id)) merged.set(note.id, note)
  }

  return { notes: [...merged.values()], legacyFiles }
}
