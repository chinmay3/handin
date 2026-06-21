import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { useNotesStore } from '../store/notes'

export function useResurfacing(currentNoteId: string | null, currentTitle: string) {
  const notes = useNotesStore(s => s.notes)

  const suggestion = useMemo(() => {
    if (!currentNoteId || !currentTitle.trim()) return null

    const others = notes.filter(n => n.id !== currentNoteId && !n.isScratch && n.content.length > 0)
    if (others.length === 0) return null

    const fuse = new Fuse(others, {
      keys: ['title', 'content'],
      threshold: 0.4,
      includeScore: true
    })

    const results = fuse.search(currentTitle)
    if (results.length === 0 || !results[0].score || results[0].score > 0.4) return null

    const match = results[0].item
    const daysAgo = Math.floor((Date.now() - match.updatedAt) / 86400000)

    return {
      noteId: match.id,
      title: match.title,
      daysAgo
    }
  }, [currentNoteId, currentTitle, notes])

  return suggestion
}
