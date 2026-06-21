import { useEffect, useRef } from 'react'
import { useNotesStore } from '../store/notes'

declare global {
  interface Window {
    api?: {
      writeNote: (fileName: string, content: string) => Promise<void>
      readNotes: () => Promise<{ fileName: string; content: string }[]>
      deleteNote: (fileName: string) => Promise<void>
      writeScratch: (fileName: string, content: string) => Promise<void>
      deleteScratch: (fileName: string) => Promise<void>
    }
  }
}

export function useAutosave(noteId: string | null, content: string) {
  const updateNote = useNotesStore(s => s.updateNote)
  const getNote = useNotesStore(s => s.getNote)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!noteId) return

    if (timer.current) clearTimeout(timer.current)

    timer.current = setTimeout(() => {
      const note = getNote(noteId)
      if (!note) return

      updateNote(noteId, { content })

      const fileName = `${note.title.replace(/[^a-zA-Z0-9-_ ]/g, '').replace(/\s+/g, '-').toLowerCase() || 'untitled'}.md`
      const fullContent = `# ${note.title}\n\n${content}`

      if (window.api) {
        if (note.isScratch) {
          window.api.writeScratch(fileName, fullContent)
        } else {
          window.api.writeNote(fileName, fullContent)
        }
      }
    }, 2000)

    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [noteId, content, updateNote, getNote])
}
