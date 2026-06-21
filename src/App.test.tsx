import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { Note } from './lib/types'
import { useNotesStore } from './store/notes'
import { useUIStore } from './store/ui'
import { resetStores } from './test/resetStores'

beforeEach(resetStores)

function diskNote(updates: Partial<Note> = {}): Note {
  return {
    id: 'disk-note',
    title: 'Disk note',
    content: 'From disk',
    parentId: null,
    isScratch: false,
    scratchExpiresAt: null,
    taskListId: null,
    createdAt: 1,
    updatedAt: 2,
    editSessions: [],
    ...updates
  }
}

describe('app lifecycle', () => {
  it('hydrates notes from disk and persists the merged result', async () => {
    const writeNote = vi.fn().mockResolvedValue(undefined)
    window.api = {
      writeNote,
      readNotes: vi.fn().mockResolvedValue([diskNote()]),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      deleteLegacyNote: vi.fn().mockResolvedValue(undefined)
    }
    render(<App />)
    await waitFor(() => expect(useNotesStore.getState().notes).toEqual([diskNote()]))
    expect(writeNote).toHaveBeenCalledWith(diskNote())
  })

  it('migrates and removes a legacy file only after writing it', async () => {
    const calls: string[] = []
    const legacy = { ...diskNote(), legacyFileName: 'disk-note.md', legacyScratch: false }
    window.api = {
      writeNote: vi.fn().mockImplementation(async () => { calls.push('write') }),
      readNotes: vi.fn().mockResolvedValue([legacy]),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      deleteLegacyNote: vi.fn().mockImplementation(async () => { calls.push('delete legacy') })
    }
    render(<App />)
    await waitFor(() => expect(calls).toEqual(['write', 'delete legacy']))
  })

  it('keeps local notes when disk hydration fails', async () => {
    const local = useNotesStore.getState().addNote({ title: 'Local' })
    window.api = {
      writeNote: vi.fn().mockResolvedValue(undefined),
      readNotes: vi.fn().mockRejectedValue(new Error('disk failed')),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      deleteLegacyNote: vi.fn().mockResolvedValue(undefined)
    }
    render(<App />)
    await act(() => Promise.resolve())
    expect(useNotesStore.getState().notes).toEqual([local])
  })

  it('removes expired scratch notes immediately', async () => {
    const scratch = useNotesStore.getState().addNote({ title: 'Scratch', isScratch: true, scratchExpiresAt: Date.now() - 1 })
    const deleteNote = vi.fn().mockResolvedValue(undefined)
    window.api = undefined
    render(<App />)
    await waitFor(() => expect(useNotesStore.getState().getNote(scratch.id)).toBeUndefined())
    expect(deleteNote).not.toHaveBeenCalled()
  })

  it('opens and closes the command palette with keyboard shortcuts', async () => {
    render(<App />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(await screen.findByPlaceholderText('type a command...')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByPlaceholderText('type a command...')).not.toBeInTheDocument())
  })

  it('applies the persisted dark theme to every root', async () => {
    useUIStore.setState({ darkMode: true })
    const root = document.createElement('div')
    root.id = 'root'
    document.body.appendChild(root)
    render(<App />, { container: root })
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'))
    expect(document.body.dataset.theme).toBe('dark')
    expect(root.dataset.theme).toBe('dark')
  })
})
