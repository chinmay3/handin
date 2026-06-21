import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NoteScreen from '.'
import { useNotesStore } from '../../store/notes'
import { useTasksStore } from '../../store/tasks'
import { useUIStore } from '../../store/ui'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

describe('note screen workflows', () => {
  it('renders breadcrumbs and opens an ancestor', async () => {
    const user = userEvent.setup()
    const root = useNotesStore.getState().addNote({ title: 'Root' })
    const child = useNotesStore.getState().addNote({ title: 'Child', parentId: root.id })
    const leaf = useNotesStore.getState().addNote({ title: 'Leaf', parentId: child.id })
    useUIStore.getState().openNote(leaf.id)
    render(<NoteScreen noteId={leaf.id} />)
    await user.click(screen.getByRole('button', { name: 'Root' }))
    expect(useUIStore.getState().activeNoteId).toBe(root.id)
  })

  it('attaches a dropped task list to the note', () => {
    const note = useNotesStore.getState().addNote({ title: 'Plan' })
    const list = useTasksStore.getState().addTaskList('Launch')
    const { container } = render(<NoteScreen noteId={note.id} />)
    const surface = container.firstElementChild!
    const dataTransfer = {
      types: ['application/handin-task-list'],
      dropEffect: 'none',
      getData: vi.fn().mockReturnValue(list.id)
    }
    fireEvent.dragOver(surface, { dataTransfer })
    fireEvent.drop(surface, { dataTransfer })
    expect(useNotesStore.getState().getNote(note.id)?.taskListId).toBe(list.id)
  })

  it('shows the previous edit day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-20T12:00:00'))
    const note = useNotesStore.getState().addNote({ title: 'Old' })
    useNotesStore.setState({
      notes: [{ ...note, updatedAt: new Date('2026-06-19T12:00:00').getTime() }]
    })
    render(<NoteScreen noteId={note.id} />)
    expect(screen.getByText('last edited yesterday')).toBeInTheDocument()
    vi.useRealTimers()
  })

  it.fails('shows one hour of scratch time as one hour', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-20T12:00:00'))
    const note = useNotesStore.getState().addNote({
      title: 'Scratch',
      isScratch: true,
      scratchExpiresAt: Date.now() + 3600000
    })
    render(<NoteScreen noteId={note.id} />)
    expect(screen.getByText(/1h remaining/)).toBeInTheDocument()
    vi.useRealTimers()
  })

  it('opens a resurfaced related note', async () => {
    const user = userEvent.setup()
    const related = useNotesStore.getState().addNote({ title: 'Launch plan', content: 'release launch plan' })
    const current = useNotesStore.getState().addNote({ title: 'Launch plan', content: 'current' })
    useUIStore.getState().openNote(current.id)
    render(<NoteScreen noteId={current.id} />)
    await user.click(screen.getByRole('button', { name: /you wrote something related.*Launch plan/ }))
    expect(useUIStore.getState().activeNoteId).toBe(related.id)
  })
})
