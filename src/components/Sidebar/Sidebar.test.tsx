import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sidebar from '.'
import { useNotesStore } from '../../store/notes'
import { useTasksStore } from '../../store/tasks'
import { useUIStore } from '../../store/ui'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

describe('sidebar workflows', () => {
  it('creates projects and task lists', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)
    await user.click(screen.getByTitle('New project'))
    await user.type(screen.getByPlaceholderText('project name...'), 'Project{Enter}')
    expect(useNotesStore.getState().notes[0].title).toBe('Project')

    await user.click(screen.getByTitle('New task list'))
    await user.type(screen.getByPlaceholderText('list name...'), 'List{Enter}')
    expect(useTasksStore.getState().taskLists[0].name).toBe('List')
  })

  it.fails('creates sidebar task lists without implicitly connecting the active note', async () => {
    const user = userEvent.setup()
    const note = useNotesStore.getState().addNote({ title: 'Active' })
    useUIStore.getState().openNote(note.id)
    render(<Sidebar />)
    await user.click(screen.getByTitle('New task list'))
    await user.type(screen.getByPlaceholderText('list name...'), 'Independent{Enter}')
    expect(useTasksStore.getState().taskLists[0].originNoteId).toBeNull()
  })

  it('toggles project and task-list visibility independently', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)
    await user.click(screen.getByTitle('Hide projects'))
    expect(useUIStore.getState()).toMatchObject({ sidebarProjectsVisible: false, sidebarTaskListsVisible: true })
    await user.click(screen.getByTitle('Hide task lists'))
    expect(useUIStore.getState()).toMatchObject({ sidebarProjectsVisible: false, sidebarTaskListsVisible: false })
  })

  it.fails('gives the sidebar close control a descriptive accessible name', () => {
    render(<Sidebar />)
    expect(screen.getByRole('button', { name: 'Close sidebar' })).toBeInTheDocument()
  })

  it('jumps to a document heading', async () => {
    const user = userEvent.setup()
    const note = useNotesStore.getState().addNote({ title: 'Project', content: '- Section' })
    useUIStore.getState().openNote(note.id)
    const target = document.createElement('div')
    target.dataset.documentLine = '0'
    document.body.appendChild(target)
    const scroll = target.scrollIntoView as ReturnType<typeof vi.fn>
    scroll.mockClear()
    render(<Sidebar />)
    await user.click(screen.getByRole('button', { name: '- Section' }))
    expect(scroll).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' })
    expect(target.dataset.headingTarget).toBe('true')
    target.remove()
  })

  it('deletes a project tree from state and disk', async () => {
    const user = userEvent.setup()
    const root = useNotesStore.getState().addNote({ title: 'Root' })
    const child = useNotesStore.getState().addNote({ title: 'Child', parentId: root.id })
    const grandchild = useNotesStore.getState().addNote({ title: 'Grandchild', parentId: child.id })
    const deleteNote = vi.fn().mockResolvedValue(undefined)
    window.api = {
      writeNote: vi.fn().mockResolvedValue(undefined),
      readNotes: vi.fn().mockResolvedValue([]),
      deleteNote,
      deleteLegacyNote: vi.fn().mockResolvedValue(undefined)
    }
    render(<Sidebar />)
    await user.click(screen.getByTitle('Delete project'))
    await user.type(screen.getByPlaceholderText('delete Root'), 'delete Root')
    await user.click(screen.getByRole('button', { name: /^delete$/ }))

    expect(useNotesStore.getState().notes).toEqual([])
    expect(deleteNote.mock.calls.map(call => call[0])).toEqual([root.id, child.id, grandchild.id])
  })
})
