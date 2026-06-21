import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { GitHubStatus } from './lib/github'
import type { Note } from './lib/types'
import { useNotesStore } from './store/notes'
import { useTasksStore } from './store/tasks'
import { useEventsStore } from './store/events'
import { useGitHubStore } from './store/github'
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

function authenticatedStatus(): GitHubStatus {
  return {
    authenticated: true,
    login: 'chinmay3',
    repoName: 'handin-notes',
    repoUrl: 'https://github.com/chinmay3/handin-notes.git',
    syncState: 'success',
    lastSyncedAt: Date.now(),
    error: null
  }
}

function authenticatedApi(overrides: Partial<NonNullable<Window['api']>> = {}): NonNullable<Window['api']> {
  const status = authenticatedStatus()
  return {
    writeNote: vi.fn().mockResolvedValue(undefined),
    readNotes: vi.fn().mockResolvedValue([]),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    deleteLegacyNote: vi.fn().mockResolvedValue(undefined),
    getGitHubStatus: vi.fn().mockResolvedValue(status),
    syncGitHub: vi.fn().mockResolvedValue({ ...status, updatedFromRemote: false }),
    ...overrides
  }
}

describe('app lifecycle', () => {
  it('shows GitHub sign in on first launch', async () => {
    const readNotes = vi.fn().mockResolvedValue([])
    const writeNote = vi.fn().mockResolvedValue(undefined)
    window.api = {
      writeNote,
      readNotes,
      deleteNote: vi.fn().mockResolvedValue(undefined),
      deleteLegacyNote: vi.fn().mockResolvedValue(undefined),
      getGitHubStatus: vi.fn().mockResolvedValue({
        authenticated: false,
        login: null,
        repoName: 'handin-notes',
        repoUrl: null,
        syncState: 'idle',
        lastSyncedAt: null,
        error: null
      })
    }
    render(<App />)
    expect(await screen.findByRole('button', { name: 'sign in with GitHub' })).toBeInTheDocument()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.queryByPlaceholderText('type a command...')).not.toBeInTheDocument()
    expect(useUIStore.getState().commandPaletteOpen).toBe(false)
    expect(readNotes).not.toHaveBeenCalled()
    expect(writeNote).not.toHaveBeenCalled()
  })

  it('syncs an authenticated workspace before reading disk notes', async () => {
    const calls: string[] = []
    const status = authenticatedStatus()
    window.api = authenticatedApi({
      readNotes: vi.fn().mockImplementation(async () => {
        calls.push('read')
        return []
      }),
      getGitHubStatus: vi.fn().mockResolvedValue(status),
      syncGitHub: vi.fn().mockImplementation(async () => {
        calls.push('sync')
        return { ...status, updatedFromRemote: false }
      })
    })
    render(<App />)
    await waitFor(() => expect(calls).toContain('read'))
    expect(calls.slice(0, 2)).toEqual(['sync', 'read'])
  })

  it('hydrates task and calendar state from the workspace file', async () => {
    const taskList = { id: 'list', name: 'List', originNoteId: null, createdAt: 1 }
    const event = {
      id: 'event',
      name: 'Event',
      description: '',
      date: 1,
      time: '',
      reminder: '',
      links: [],
      createdAt: 1
    }
    window.api = authenticatedApi({
      readWorkspace: vi.fn().mockResolvedValue({ version: 1, taskLists: [taskList], tasks: [], events: [event] })
    })
    render(<App />)
    await waitFor(() => expect(useTasksStore.getState().taskLists).toEqual([taskList]))
    expect(useEventsStore.getState().events).toEqual([event])
  })

  it('hydrates notes from disk and persists the merged result', async () => {
    const writeNote = vi.fn().mockResolvedValue(undefined)
    window.api = authenticatedApi({
      writeNote,
      readNotes: vi.fn().mockResolvedValue([diskNote()])
    })
    render(<App />)
    await waitFor(() => expect(useNotesStore.getState().notes).toEqual([diskNote()]))
    expect(writeNote).toHaveBeenCalledWith(diskNote())
  })

  it('migrates and removes a legacy file only after writing it', async () => {
    const calls: string[] = []
    const legacy = { ...diskNote(), legacyFileName: 'disk-note.md', legacyScratch: false }
    window.api = authenticatedApi({
      writeNote: vi.fn().mockImplementation(async () => { calls.push('write') }),
      readNotes: vi.fn().mockResolvedValue([legacy]),
      deleteLegacyNote: vi.fn().mockImplementation(async () => { calls.push('delete legacy') })
    })
    render(<App />)
    await waitFor(() => expect(calls).toEqual(['write', 'delete legacy']))
  })

  it('keeps local notes when disk hydration fails', async () => {
    const local = useNotesStore.getState().addNote({ title: 'Local' })
    window.api = authenticatedApi({ readNotes: vi.fn().mockRejectedValue(new Error('disk failed')) })
    render(<App />)
    await act(() => Promise.resolve())
    expect(useNotesStore.getState().notes).toEqual([local])
  })

  it('removes expired scratch notes immediately', async () => {
    const scratch = useNotesStore.getState().addNote({ title: 'Scratch', isScratch: true, scratchExpiresAt: Date.now() - 1 })
    const deleteNote = vi.fn().mockResolvedValue(undefined)
    window.api = authenticatedApi({ deleteNote })
    render(<App />)
    await waitFor(() => expect(useNotesStore.getState().getNote(scratch.id)).toBeUndefined())
    expect(deleteNote).toHaveBeenCalledWith(scratch.id)
  })

  it('opens and closes the command palette with keyboard shortcuts', async () => {
    useGitHubStore.setState({
      checking: false,
      status: authenticatedStatus()
    })
    window.api = authenticatedApi()
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
