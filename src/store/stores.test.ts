import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useNotesStore } from './notes'
import { useTasksStore } from './tasks'
import { useEventsStore } from './events'
import { useUIStore } from './ui'

beforeEach(() => {
  localStorage.clear()
  useNotesStore.setState({ notes: [] })
  useTasksStore.setState({ taskLists: [], tasks: [] })
  useEventsStore.setState({ events: [] })
  useUIStore.setState({
    sidebarOpen: true,
    activeScreen: 'home',
    activeNoteId: null,
    noteHistory: [],
    taskOverlayListId: null,
    taskOverlayTaskId: null,
    commandPaletteOpen: false,
    helpOpen: false,
    searchFocused: false,
    accountOpen: false,
    rightPanelOpen: true,
    quotesEnabled: true,
    darkMode: false,
    sidebarProjectsVisible: true,
    sidebarTaskListsVisible: true
  })
})

describe('stores', () => {
  it('creates notes with complete defaults and supports queries', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100)
    const root = useNotesStore.getState().addNote({ title: 'Root' })
    const child = useNotesStore.getState().addNote({ title: 'Child', parentId: root.id })
    const scratch = useNotesStore.getState().addNote({ title: 'Scratch', isScratch: true })

    expect(root).toMatchObject({
      title: 'Root',
      content: '',
      parentId: null,
      isScratch: false,
      scratchExpiresAt: null,
      taskListId: null,
      createdAt: 100,
      updatedAt: 100,
      editSessions: []
    })
    expect(useNotesStore.getState().getRootNotes()).toEqual([root])
    expect(useNotesStore.getState().getChildren(root.id)).toEqual([child])
    expect(useNotesStore.getState().getScratchNotes()).toEqual([scratch])
  })

  it('updates and hydrates notes', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(100)
    const original = useNotesStore.getState().addNote({ title: 'Original' })
    clock.mockReturnValue(200)
    useNotesStore.getState().updateNote(original.id, { title: 'Updated', content: 'Body' })
    expect(useNotesStore.getState().getNote(original.id)).toMatchObject({ title: 'Updated', content: 'Body', updatedAt: 200 })

    useNotesStore.getState().hydrateNotes([original])
    expect(useNotesStore.getState().notes).toEqual([original])
  })

  it('deletes nested notes recursively', () => {
    const root = useNotesStore.getState().addNote({ title: 'Root' })
    const child = useNotesStore.getState().addNote({ title: 'Child', parentId: root.id })
    useNotesStore.getState().addNote({ title: 'Grandchild', parentId: child.id })

    useNotesStore.getState().deleteNote(root.id)
    expect(useNotesStore.getState().notes).toEqual([])
  })

  it.fails('shows notes with a missing parent as recoverable root notes', () => {
    const orphan = useNotesStore.getState().addNote({ title: 'Orphan', parentId: 'missing' })
    expect(useNotesStore.getState().getRootNotes()).toContainEqual(orphan)
  })

  it('deletes every task when its list is deleted', () => {
    const list = useTasksStore.getState().addTaskList('Work')
    useTasksStore.getState().addTask(list.id, 'First')
    useTasksStore.getState().addTask(list.id, 'Second')

    useTasksStore.getState().deleteTaskList(list.id)
    expect(useTasksStore.getState().taskLists).toEqual([])
    expect(useTasksStore.getState().tasks).toEqual([])
  })

  it('renames task lists and manages task status timestamps', () => {
    const list = useTasksStore.getState().addTaskList('Old')
    useTasksStore.getState().updateTaskListName(list.id, 'New')
    expect(useTasksStore.getState().taskLists[0].name).toBe('New')

    const task = useTasksStore.getState().addTask(list.id, 'Task')
    vi.spyOn(Date, 'now').mockReturnValue(500)
    useTasksStore.getState().updateTaskStatus(task.id, 'doing')
    expect(useTasksStore.getState().tasks[0]).toMatchObject({ status: 'doing', completedAt: null })
    useTasksStore.getState().completeTask(task.id)
    expect(useTasksStore.getState().tasks[0]).toMatchObject({ status: 'done', completedAt: 500 })
    useTasksStore.getState().uncompleteTask(task.id)
    expect(useTasksStore.getState().tasks[0]).toMatchObject({ status: 'todo', completedAt: null })
  })

  it('preserves the original completion date when done is assigned twice', () => {
    const list = useTasksStore.getState().addTaskList('List')
    const task = useTasksStore.getState().addTask(list.id, 'Task')
    vi.spyOn(Date, 'now').mockReturnValueOnce(100).mockReturnValueOnce(200)
    useTasksStore.getState().updateTaskStatus(task.id, 'done')
    useTasksStore.getState().updateTaskStatus(task.id, 'done')
    expect(useTasksStore.getState().tasks[0].completedAt).toBe(100)
  })

  it('manages descriptions, subtasks, and links', () => {
    const list = useTasksStore.getState().addTaskList('List')
    const task = useTasksStore.getState().addTask(list.id, 'Task')
    useTasksStore.getState().updateTaskDescription(task.id, 'Description')
    useTasksStore.getState().addSubtask(task.id, 'Subtask')
    useTasksStore.getState().addTaskLink(task.id, 'https://example.com')
    let current = useTasksStore.getState().tasks[0]
    expect(current.description).toBe('Description')
    expect(current.subtasks[0].name).toBe('Subtask')
    expect(current.links[0]).toMatchObject({ url: 'https://example.com', title: 'example.com' })

    vi.spyOn(Date, 'now').mockReturnValue(300)
    useTasksStore.getState().completeSubtask(task.id, current.subtasks[0].id)
    current = useTasksStore.getState().tasks[0]
    expect(current.subtasks[0].completedAt).toBe(300)
    useTasksStore.getState().completeSubtask(task.id, current.subtasks[0].id)
    useTasksStore.getState().deleteTaskLink(task.id, current.links[0].id)
    useTasksStore.getState().deleteSubtask(task.id, current.subtasks[0].id)
    expect(useTasksStore.getState().tasks[0]).toMatchObject({ subtasks: [], links: [] })
  })

  it.fails('normalizes task links without a protocol', () => {
    const list = useTasksStore.getState().addTaskList('List')
    const task = useTasksStore.getState().addTask(list.id, 'Task')
    useTasksStore.getState().addTaskLink(task.id, 'example.com')
    expect(useTasksStore.getState().tasks[0].links[0].url).toBe('https://example.com')
  })

  it('returns tasks due only on the requested normal day', () => {
    const list = useTasksStore.getState().addTaskList('List')
    const day = new Date(2026, 5, 20, 12).getTime()
    const task = useTasksStore.getState().addTask(list.id, 'Due', null, null, day)
    useTasksStore.getState().addTask(list.id, 'Later', null, null, new Date(2026, 5, 21, 12).getTime())
    expect(useTasksStore.getState().getTasksDueOn(day)).toEqual([task])
  })

  it.fails('does not include the next day during the spring DST transition', () => {
    const list = useTasksStore.getState().addTaskList('List')
    const requestedDay = new Date(2026, 2, 8, 12).getTime()
    useTasksStore.getState().addTask(list.id, 'Next day', null, null, new Date(2026, 2, 9, 0, 30).getTime())
    expect(useTasksStore.getState().getTasksDueOn(requestedDay)).toEqual([])
  })

  it('adds, sorts, updates, and deletes events', () => {
    vi.spyOn(Date, 'now').mockReturnValue(100)
    const date = new Date(2026, 5, 20).getTime()
    const late = useEventsStore.getState().addEvent({ name: 'Late', description: '', date, time: '15:00', reminder: '', links: [] })
    const early = useEventsStore.getState().addEvent({ name: 'Early', description: '', date, time: '09:00', reminder: '', links: [] })
    expect(useEventsStore.getState().getEventsByDay(date)).toEqual([early, late])

    useEventsStore.getState().updateEvent(late.id, { name: 'Updated', time: '08:00' })
    expect(useEventsStore.getState().getEventsByDay(date)[0].name).toBe('Updated')
    useEventsStore.getState().deleteEvent(early.id)
    expect(useEventsStore.getState().events).toHaveLength(1)
  })

  it('navigates notes and returns through history', () => {
    useUIStore.getState().openNote('one')
    useUIStore.getState().openNote('two')
    expect(useUIStore.getState()).toMatchObject({ activeScreen: 'note', activeNoteId: 'two', noteHistory: ['one'] })
    useUIStore.getState().goBack()
    expect(useUIStore.getState()).toMatchObject({ activeNoteId: 'one', noteHistory: [] })
    useUIStore.getState().goBack()
    expect(useUIStore.getState()).toMatchObject({ activeScreen: 'home', activeNoteId: null })
  })

  it.fails('does not add the current note to history when reopening it', () => {
    useUIStore.getState().openNote('same')
    useUIStore.getState().openNote('same')
    expect(useUIStore.getState().noteHistory).toEqual([])
  })

  it('opens a specific task and clears overlay state on close', () => {
    useUIStore.getState().openTaskOverlay('list', 'task')
    expect(useUIStore.getState()).toMatchObject({ taskOverlayListId: 'list', taskOverlayTaskId: 'task' })
    useUIStore.getState().closeTaskOverlay()
    expect(useUIStore.getState()).toMatchObject({ taskOverlayListId: null, taskOverlayTaskId: null })
  })

  it('toggles themes, panels, and sidebar list visibility', () => {
    useUIStore.getState().toggleDarkMode()
    useUIStore.getState().toggleRightPanel()
    useUIStore.getState().toggleSidebarLists()
    expect(useUIStore.getState()).toMatchObject({
      darkMode: true,
      rightPanelOpen: false,
      sidebarProjectsVisible: false,
      sidebarTaskListsVisible: false
    })
    useUIStore.getState().toggleSidebarLists()
    expect(useUIStore.getState()).toMatchObject({ sidebarProjectsVisible: true, sidebarTaskListsVisible: true })
  })
})
