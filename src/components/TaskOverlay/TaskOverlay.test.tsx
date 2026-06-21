import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskOverlay from '.'
import { useNotesStore } from '../../store/notes'
import { useTasksStore } from '../../store/tasks'
import { useUIStore } from '../../store/ui'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

function createListWithTask() {
  const list = useTasksStore.getState().addTaskList('Launch')
  const task = useTasksStore.getState().addTask(list.id, 'Ship release')
  return { list, task }
}

describe('task overlay workflows', () => {
  it('opens in execution mode and groups statuses', () => {
    const { list, task } = createListWithTask()
    const doing = useTasksStore.getState().addTask(list.id, 'Review')
    const done = useTasksStore.getState().addTask(list.id, 'Archive')
    useTasksStore.getState().updateTaskStatus(doing.id, 'doing')
    useTasksStore.getState().updateTaskStatus(done.id, 'done')
    render(<TaskOverlay listId={list.id} />)

    expect(screen.getByRole('button', { name: 'execution' })).toHaveClass('bg-surface')
    expect(screen.getByRole('button', { name: task.name })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: doing.name })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: done.name })).toBeInTheDocument()
  })

  it.fails('exposes the task list as a named modal dialog', () => {
    const { list } = createListWithTask()
    render(<TaskOverlay listId={list.id} />)
    expect(screen.getByRole('dialog', { name: 'Launch' })).toHaveAttribute('aria-modal', 'true')
  })

  it.fails('opens an execution card with the Space key', () => {
    const { list, task } = createListWithTask()
    render(<TaskOverlay listId={list.id} />)
    fireEvent.keyDown(screen.getByRole('button', { name: task.name }), { key: ' ' })
    expect(screen.getByPlaceholderText('description...')).toBeInTheDocument()
  })

  it.fails('exposes task completion controls as named checkboxes', async () => {
    const user = userEvent.setup()
    const { list, task } = createListWithTask()
    render(<TaskOverlay listId={list.id} />)
    await user.click(screen.getByRole('button', { name: 'list' }))
    expect(screen.getByRole('checkbox', { name: `Complete ${task.name}` })).not.toBeChecked()
  })

  it.fails('closes the task list with Escape', () => {
    const { list } = createListWithTask()
    useUIStore.getState().openTaskOverlay(list.id)
    render(<TaskOverlay listId={list.id} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(useUIStore.getState().taskOverlayListId).toBeNull()
  })

  it('adds a task and renames its list', async () => {
    const user = userEvent.setup()
    const { list } = createListWithTask()
    render(<TaskOverlay listId={list.id} />)
    await user.type(screen.getByPlaceholderText('add task...'), 'Write notes{Enter}')
    expect(useTasksStore.getState().tasks.some(task => task.name === 'Write notes')).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Rename task list' }))
    const input = screen.getByLabelText('Task list name')
    await user.clear(input)
    await user.type(input, 'Release{Enter}')
    expect(useTasksStore.getState().taskLists[0].name).toBe('Release')
  })

  it.fails('attributes overlay-created tasks to the currently open note', async () => {
    const user = userEvent.setup()
    const original = useNotesStore.getState().addNote({ title: 'Original' })
    const current = useNotesStore.getState().addNote({ title: 'Current' })
    const list = useTasksStore.getState().addTaskList('Launch', original.id)
    useUIStore.getState().openNote(current.id)
    render(<TaskOverlay listId={list.id} />)
    await user.type(screen.getByPlaceholderText('add task...'), 'Current work{Enter}')
    expect(useTasksStore.getState().tasks[0].originNoteId).toBe(current.id)
  })

  it('detaches notes and deletes tasks with a list', async () => {
    const user = userEvent.setup()
    const { list } = createListWithTask()
    const note = useNotesStore.getState().addNote({ title: 'Plan', taskListId: list.id })
    const writeNote = vi.fn().mockResolvedValue(undefined)
    window.api = {
      writeNote,
      readNotes: vi.fn().mockResolvedValue([]),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      deleteLegacyNote: vi.fn().mockResolvedValue(undefined)
    }
    render(<TaskOverlay listId={list.id} />)
    await user.click(screen.getByRole('button', { name: 'Delete task list' }))
    await user.click(screen.getByRole('button', { name: /^delete$/ }))

    expect(useTasksStore.getState()).toMatchObject({ taskLists: [], tasks: [] })
    expect(useNotesStore.getState().getNote(note.id)?.taskListId).toBeNull()
    expect(writeNote).toHaveBeenCalledOnce()
    expect(useUIStore.getState().taskOverlayListId).toBeNull()
  })

  it('opens a requested task detail and edits its fields', async () => {
    const user = userEvent.setup()
    const { list, task } = createListWithTask()
    useUIStore.getState().openTaskOverlay(list.id, task.id)
    render(<TaskOverlay listId={list.id} />)

    await user.type(screen.getByPlaceholderText('description...'), 'Ready')
    await user.type(screen.getByPlaceholderText('add subtask...'), 'Checklist{Enter}')
    await user.type(screen.getByPlaceholderText('add link...'), 'https://example.com{Enter}')
    expect(useTasksStore.getState().tasks[0]).toMatchObject({
      description: 'Ready',
      subtasks: [{ name: 'Checklist', completedAt: null }],
      links: [{ url: 'https://example.com', title: 'example.com' }]
    })
  })

  it('switches to list mode and completes a task', async () => {
    const user = userEvent.setup()
    const { list, task } = createListWithTask()
    render(<TaskOverlay listId={list.id} />)
    await user.click(screen.getByRole('button', { name: 'list' }))
    const row = screen.getByRole('button', { name: /Ship release/ })
    const checkbox = row.querySelector('button')
    expect(checkbox).not.toBeNull()
    fireEvent.click(checkbox!)
    expect(useTasksStore.getState().tasks.find(item => item.id === task.id)?.status).toBe('done')
  })
})
