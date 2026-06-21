export interface Note {
  id: string
  title: string
  content: string
  parentId: string | null
  isScratch: boolean
  scratchExpiresAt: number | null
  taskListId: string | null
  createdAt: number
  updatedAt: number
  editSessions: EditSession[]
}

export interface EditSession {
  timestamp: number
  lineStart: number
  lineEnd: number
}

export interface TaskList {
  id: string
  name: string
  originNoteId: string | null
  createdAt: number
}

export interface Task {
  id: string
  listId: string
  name: string
  status: TaskStatus
  description: string
  originNoteId: string | null
  originLine: number | null
  dueDate: number | null
  completedAt: number | null
  subtasks: SubTask[]
  links: TaskLink[]
}

export type TaskStatus = 'todo' | 'doing' | 'done'

export interface SubTask {
  id: string
  name: string
  completedAt: number | null
}

export interface TaskLink {
  id: string
  title: string
  url: string
}

export interface CalendarEvent {
  id: string
  name: string
  description: string
  date: number
  time: string
  reminder: string
  links: TaskLink[]
  createdAt: number
}

export type Screen = 'home' | 'note' | 'graph' | 'account'
