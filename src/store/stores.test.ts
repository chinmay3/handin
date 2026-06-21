import { beforeEach, describe, expect, it } from 'vitest'
import { useNotesStore } from './notes'
import { useTasksStore } from './tasks'

beforeEach(() => {
  localStorage.clear()
  useNotesStore.setState({ notes: [] })
  useTasksStore.setState({ taskLists: [], tasks: [] })
})

describe('stores', () => {
  it('deletes nested notes recursively', () => {
    const root = useNotesStore.getState().addNote({ title: 'Root' })
    const child = useNotesStore.getState().addNote({ title: 'Child', parentId: root.id })
    useNotesStore.getState().addNote({ title: 'Grandchild', parentId: child.id })

    useNotesStore.getState().deleteNote(root.id)
    expect(useNotesStore.getState().notes).toEqual([])
  })

  it('deletes every task when its list is deleted', () => {
    const list = useTasksStore.getState().addTaskList('Work')
    useTasksStore.getState().addTask(list.id, 'First')
    useTasksStore.getState().addTask(list.id, 'Second')

    useTasksStore.getState().deleteTaskList(list.id)
    expect(useTasksStore.getState().taskLists).toEqual([])
    expect(useTasksStore.getState().tasks).toEqual([])
  })
})
