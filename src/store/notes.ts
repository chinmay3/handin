import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Note } from '../lib/types'

interface NotesState {
  notes: Note[]
  hydrateNotes: (notes: Note[]) => void
  addNote: (note: Partial<Note> & { title: string }) => Note
  updateNote: (id: string, updates: Partial<Note>) => void
  deleteNote: (id: string) => void
  getNote: (id: string) => Note | undefined
  getChildren: (parentId: string) => Note[]
  getRootNotes: () => Note[]
  getScratchNotes: () => Note[]
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],

      hydrateNotes: (notes) => set({ notes }),

      addNote: (partial) => {
        const note: Note = {
          id: crypto.randomUUID(),
          title: partial.title,
          content: partial.content || '',
          parentId: partial.parentId || null,
          isScratch: partial.isScratch || false,
          scratchExpiresAt: partial.scratchExpiresAt || null,
          taskListId: partial.taskListId || null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          editSessions: []
        }
        set(s => ({ notes: [...s.notes, note] }))
        return note
      },

      updateNote: (id, updates) => {
        set(s => ({
          notes: s.notes.map(n =>
            n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n
          )
        }))
      },

      deleteNote: (id) => {
        set(s => {
          const ids = new Set<string>()
          const visit = (noteId: string) => {
            if (ids.has(noteId)) return
            ids.add(noteId)
            s.notes.filter(note => note.parentId === noteId).forEach(note => visit(note.id))
          }
          visit(id)
          return { notes: s.notes.filter(note => !ids.has(note.id)) }
        })
      },

      getNote: (id) => get().notes.find(n => n.id === id),

      getChildren: (parentId) => get().notes.filter(n => n.parentId === parentId),

      getRootNotes: () => get().notes.filter(n => !n.parentId && !n.isScratch),

      getScratchNotes: () => get().notes.filter(n => n.isScratch)
    }),
    { name: 'handin-notes' }
  )
)
