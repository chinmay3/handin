import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Home from '.'
import SearchBar from '../../components/SearchBar'
import { useNotesStore } from '../../store/notes'
import { useTasksStore } from '../../store/tasks'
import { useUIStore } from '../../store/ui'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

describe('home workflows', () => {
  it('creates a project and opens it', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByTitle('New project'))
    const input = screen.getByPlaceholderText('project name...')
    await user.type(input, 'Research{Enter}')

    const [note] = useNotesStore.getState().notes
    expect(note.title).toBe('Research')
    expect(useUIStore.getState()).toMatchObject({ activeScreen: 'note', activeNoteId: note.id })
  })

  it('creates and opens a task list', async () => {
    const user = userEvent.setup()
    render(<Home />)
    await user.click(screen.getByTitle('New task list'))
    await user.type(screen.getByPlaceholderText('list name...'), 'Launch{Enter}')

    const [list] = useTasksStore.getState().taskLists
    expect(list.name).toBe('Launch')
    await user.click(screen.getByRole('button', { name: 'Launch' }))
    expect(useUIStore.getState().taskOverlayListId).toBe(list.id)
  })

  it('shows active task counts only', () => {
    const list = useTasksStore.getState().addTaskList('Launch')
    const active = useTasksStore.getState().addTask(list.id, 'Active')
    const done = useTasksStore.getState().addTask(list.id, 'Done')
    useTasksStore.getState().completeTask(done.id)
    render(<Home />)
    expect(screen.getByRole('button', { name: /Launch 1/ })).toBeInTheDocument()
    expect(useTasksStore.getState().tasks.find(task => task.id === active.id)?.completedAt).toBeNull()
  })

  it.fails('shows deeply nested sub-notes', () => {
    const root = useNotesStore.getState().addNote({ title: 'Root' })
    const child = useNotesStore.getState().addNote({ title: 'Child', parentId: root.id })
    useNotesStore.getState().addNote({ title: 'Grandchild', parentId: child.id })
    render(<Home />)
    expect(screen.getByText('Grandchild')).toBeInTheDocument()
  })

  it('opens note search results', async () => {
    const user = userEvent.setup()
    const note = useNotesStore.getState().addNote({ title: 'Database design', content: 'normal forms' })
    render(<SearchBar />)
    await user.type(screen.getByPlaceholderText('search notes, tasks...'), 'database')
    await user.click(screen.getByRole('button', { name: /Database design/ }))
    expect(useUIStore.getState().activeNoteId).toBe(note.id)
  })

  it('opens task search results directly in task detail', async () => {
    const user = userEvent.setup()
    const list = useTasksStore.getState().addTaskList('Launch')
    const task = useTasksStore.getState().addTask(list.id, 'Deploy application')
    render(<SearchBar />)
    await user.type(screen.getByPlaceholderText('search notes, tasks...'), 'deploy')
    await user.click(screen.getByRole('button', { name: /Deploy application/ }))
    expect(useUIStore.getState()).toMatchObject({ taskOverlayListId: list.id, taskOverlayTaskId: task.id })
  })

  it('shows an empty search result state', () => {
    render(<SearchBar />)
    fireEvent.focus(screen.getByPlaceholderText('search notes, tasks...'))
    fireEvent.change(screen.getByPlaceholderText('search notes, tasks...'), { target: { value: 'missing' } })
    expect(screen.getByText('no results')).toBeInTheDocument()
  })
})
