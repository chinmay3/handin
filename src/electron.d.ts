import type { Note } from './lib/types'
import type { DiskNote } from './lib/notePersistence'
import type { GitHubLoginStart, GitHubStatus, GitHubSyncResult, WorkspaceData } from './lib/github'

declare global {
  interface Window {
    api?: {
      writeNote: (note: Note) => Promise<void>
      readNotes: () => Promise<DiskNote[]>
      deleteNote: (id: string) => Promise<void>
      deleteLegacyNote: (fileName: string, isScratch: boolean) => Promise<void>
      readWorkspace?: () => Promise<WorkspaceData | null>
      writeWorkspace?: (data: WorkspaceData) => Promise<void>
      getGitHubStatus?: () => Promise<GitHubStatus>
      startGitHubLogin?: () => Promise<GitHubLoginStart>
      completeGitHubLogin?: (sessionId: string) => Promise<GitHubSyncResult>
      syncGitHub?: () => Promise<GitHubSyncResult>
      logoutGitHub?: () => Promise<GitHubStatus>
      onGitHubWorkspaceUpdated?: (callback: (result: GitHubSyncResult) => void) => () => void
    }
  }
}

export {}
