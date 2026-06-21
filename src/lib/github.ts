import type { CalendarEvent, Task, TaskList } from './types'

export type GitHubSyncState = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

export interface GitHubStatus {
  authenticated: boolean
  login: string | null
  repoName: string
  repoUrl: string | null
  syncState: GitHubSyncState
  lastSyncedAt: number | null
  error: string | null
}

export interface GitHubLoginStart {
  sessionId: string
  userCode: string
  verificationUri: string
  expiresAt: number
}

export interface GitHubSyncResult extends GitHubStatus {
  updatedFromRemote: boolean
}

export interface WorkspaceData {
  version: 1
  taskLists: TaskList[]
  tasks: Task[]
  events: CalendarEvent[]
}
