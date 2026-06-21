import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TaskList, Task, SubTask, TaskLink, TaskStatus } from '../lib/types'

interface TasksState {
  taskLists: TaskList[]
  tasks: Task[]
  addTaskList: (name: string, originNoteId?: string | null) => TaskList
  deleteTaskList: (id: string) => void
  addTask: (listId: string, name: string, originNoteId?: string | null, originLine?: number | null, dueDate?: number | null) => Task
  completeTask: (id: string) => void
  uncompleteTask: (id: string) => void
  updateTaskStatus: (id: string, status: TaskStatus) => void
  deleteTask: (id: string) => void
  updateTaskDescription: (id: string, description: string) => void
  addSubtask: (taskId: string, name: string) => void
  completeSubtask: (taskId: string, subtaskId: string) => void
  deleteSubtask: (taskId: string, subtaskId: string) => void
  addTaskLink: (taskId: string, url: string, title?: string) => void
  deleteTaskLink: (taskId: string, linkId: string) => void
  getTasksByList: (listId: string) => Task[]
  getTasksDueOn: (date: number) => Task[]
  getAllCompletedDates: () => number[]
}

export const useTasksStore = create<TasksState>()(
  persist(
    (set, get) => ({
      taskLists: [],
      tasks: [],

      addTaskList: (name, originNoteId = null) => {
        const list: TaskList = {
          id: crypto.randomUUID(),
          name,
          originNoteId,
          createdAt: Date.now()
        }
        set(s => ({ taskLists: [...s.taskLists, list] }))
        return list
      },

      deleteTaskList: (id) => {
        set(s => ({
          taskLists: s.taskLists.filter(l => l.id !== id),
          tasks: s.tasks.filter(t => t.listId !== id)
        }))
      },

      addTask: (listId, name, originNoteId = null, originLine = null, dueDate = null) => {
        const task: Task = {
          id: crypto.randomUUID(),
          listId,
          name,
          status: 'todo',
          description: '',
          originNoteId,
          originLine,
          dueDate,
          completedAt: null,
          subtasks: [],
          links: []
        }
        set(s => ({ tasks: [...s.tasks, task] }))
        return task
      },

      completeTask: (id) => {
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === id ? { ...t, status: 'done', completedAt: Date.now() } : t
          )
        }))
      },

      uncompleteTask: (id) => {
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === id ? { ...t, status: 'todo', completedAt: null } : t
          )
        }))
      },

      updateTaskStatus: (id, status) => {
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === id
              ? { ...t, status, completedAt: status === 'done' ? (t.completedAt || Date.now()) : null }
              : t
          )
        }))
      },

      deleteTask: (id) => {
        set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }))
      },

      updateTaskDescription: (id, description) => {
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === id ? { ...t, description } : t
          )
        }))
      },

      addSubtask: (taskId, name) => {
        const subtask: SubTask = {
          id: crypto.randomUUID(),
          name,
          completedAt: null
        }
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === taskId ? { ...t, subtasks: [...(t.subtasks || []), subtask] } : t
          )
        }))
      },

      completeSubtask: (taskId, subtaskId) => {
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === taskId
              ? {
                  ...t,
                  subtasks: (t.subtasks || []).map(st =>
                    st.id === subtaskId
                      ? { ...st, completedAt: st.completedAt ? null : Date.now() }
                      : st
                  )
                }
              : t
          )
        }))
      },

      deleteSubtask: (taskId, subtaskId) => {
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === taskId
              ? { ...t, subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId) }
              : t
          )
        }))
      },

      addTaskLink: (taskId, url, title) => {
        const link: TaskLink = {
          id: crypto.randomUUID(),
          url,
          title: title || url.replace(/^https?:\/\//, '').replace(/\/$/, '')
        }
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === taskId ? { ...t, links: [...(t.links || []), link] } : t
          )
        }))
      },

      deleteTaskLink: (taskId, linkId) => {
        set(s => ({
          tasks: s.tasks.map(t =>
            t.id === taskId ? { ...t, links: (t.links || []).filter(l => l.id !== linkId) } : t
          )
        }))
      },

      getTasksByList: (listId) => get().tasks.filter(t => t.listId === listId),

      getTasksDueOn: (date) => {
        const d = new Date(date)
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
        const end = start + 86400000
        return get().tasks.filter(t => t.dueDate && t.dueDate >= start && t.dueDate < end)
      },

      getAllCompletedDates: () =>
        get().tasks.filter(t => t.completedAt).map(t => t.completedAt!)
    }),
    { name: 'handin-tasks' }
  )
)
