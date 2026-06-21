import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CommandPalette from '.'
import { setDocumentCursorPosition } from '../../lib/documentCursor'
import { useNotesStore } from '../../store/notes'
import { useTasksStore } from '../../store/tasks'
import { useUIStore } from '../../store/ui'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

function mockApi() {
  const writeNote = vi.fn().mockResolvedValue(undefined)
  window.api = {
    writeNote,
    readNotes: vi.fn().mockResolvedValue([]),
    deleteNote: vi.fn().mockResolvedValue(undefined),
    deleteLegacyNote: vi.fn().mockResolvedValue(undefined)
  }
  return writeNote
}

describe('command palette workflows', () => {
  it('hides document-only commands on Home and excludes removed commands', () => {
    render(<CommandPalette />)
    expect(screen.queryByText('up')).not.toBeInTheDocument()
    expect(screen.queryByText('down')).not.toBeInTheDocument()
    expect(screen.queryByText('add-task')).not.toBeInTheDocument()
    expect(screen.queryByText('new-note')).not.toBeInTheDocument()
    expect(screen.queryByText('create-tasklist')).not.toBeInTheDocument()
  })

  it('adds a task to the document-connected list', async () => {
    const user = userEvent.setup()
    const list = useTasksStore.getState().addTaskList('Launch')
    const note = useNotesStore.getState().addNote({ title: 'Plan', taskListId: list.id })
    useUIStore.getState().openNote(note.id)
    useUIStore.getState().setCommandPaletteOpen(true)
    render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText('type a command...'), 'add-task Ship it{Enter}')

    expect(useTasksStore.getState().tasks[0]).toMatchObject({ listId: list.id, name: 'Ship it', originNoteId: note.id })
    expect(useUIStore.getState().commandPaletteOpen).toBe(false)
  })

  it('explains when the document has no connected list', async () => {
    const user = userEvent.setup()
    const note = useNotesStore.getState().addNote({ title: 'Plan' })
    useUIStore.getState().openNote(note.id)
    render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText('type a command...'), 'add-task Ship it{Enter}')
    expect(screen.getByText('Connect a task list to this document first')).toBeInTheDocument()
    expect(useTasksStore.getState().tasks).toEqual([])
  })

  it('creates a sub-note at the remembered cursor and persists its parent', async () => {
    const user = userEvent.setup()
    const writeNote = mockApi()
    const parent = useNotesStore.getState().addNote({ title: 'Parent', content: 'alpha beta' })
    useUIStore.getState().openNote(parent.id)
    setDocumentCursorPosition(parent.id, 5)
    render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText('type a command...'), 'new-sub-note Child{Enter}')

    const child = useNotesStore.getState().notes.find(note => note.parentId === parent.id)
    expect(child?.title).toBe('Child')
    expect(useNotesStore.getState().getNote(parent.id)?.content).toBe('alpha\n[[subnote:Child]]\n beta')
    expect(useUIStore.getState().activeNoteId).toBe(child?.id)
    expect(writeNote).toHaveBeenCalledOnce()
  })

  it('creates and saves a scratch note', async () => {
    const user = userEvent.setup()
    const writeNote = mockApi()
    useUIStore.getState().setCommandPaletteOpen(true)
    const view = render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText('type a command...'), 'scratch{Enter}')
    const scratch = useNotesStore.getState().notes[0]
    expect(scratch).toMatchObject({ title: 'Scratch', isScratch: true })

    view.unmount()
    useUIStore.getState().setCommandPaletteOpen(true)
    render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText('type a command...'), 'save{Enter}')
    expect(useNotesStore.getState().getNote(scratch.id)).toMatchObject({ isScratch: false, scratchExpiresAt: null })
    expect(writeNote).toHaveBeenCalledOnce()
  })

  it('returns an error when down is used before up', async () => {
    const user = userEvent.setup()
    const note = useNotesStore.getState().addNote({ title: 'Plan' })
    useUIStore.getState().openNote(note.id)
    const scrollArea = document.createElement('div')
    scrollArea.dataset.documentScroll = 'true'
    document.body.appendChild(scrollArea)
    render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText('type a command...'), 'down{Enter}')
    expect(screen.getByText('Use up first to remember your place')).toBeInTheDocument()
    scrollArea.remove()
  })

  it('opens settings and toggles the two side panels', async () => {
    const user = userEvent.setup()
    let view = render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText('type a command...'), 'settings{Enter}')
    expect(useUIStore.getState().accountOpen).toBe(true)

    view.unmount()
    useUIStore.getState().setCommandPaletteOpen(true)
    view = render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText('type a command...'), 'toggle-sidebar{Enter}')
    expect(useUIStore.getState().sidebarOpen).toBe(false)

    view.unmount()
    useUIStore.getState().setCommandPaletteOpen(true)
    render(<CommandPalette />)
    await user.type(screen.getByPlaceholderText('type a command...'), 'toggle-calendar{Enter}')
    expect(useUIStore.getState().rightPanelOpen).toBe(false)
  })
})
