import { useMemo } from 'react'
import Fuse from 'fuse.js'
import { useNotesStore } from '../store/notes'
import { useTasksStore } from '../store/tasks'

export function useSearch(query: string) {
  const notes = useNotesStore(s => s.notes)
  const tasks = useTasksStore(s => s.tasks)

  const fuse = useMemo(() => {
    const items = [
      ...notes.filter(n => !n.isScratch).map(n => ({
        type: 'note' as const,
        id: n.id,
        title: n.title,
        body: n.content,
        timestamp: n.updatedAt
      })),
      ...tasks.map(t => ({
        type: 'task' as const,
        id: t.id,
        listId: t.listId,
        title: t.name,
        body: '',
        timestamp: t.dueDate || 0
      }))
    ]

    return new Fuse(items, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'body', weight: 1 }
      ],
      threshold: 0.3,
      includeScore: true
    })
  }, [notes, tasks])

  const results = useMemo(() => {
    if (!query.trim()) return []
    return fuse.search(query).slice(0, 20).map(r => r.item)
  }, [fuse, query])

  return results
}
