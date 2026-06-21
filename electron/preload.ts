import { contextBridge, ipcRenderer } from 'electron'
import type { Note } from '../src/lib/types'
import type { GitHubSyncResult, WorkspaceData } from '../src/lib/github'

contextBridge.exposeInMainWorld('api', {
  writeNote: (note: Note) => ipcRenderer.invoke('write-note', note),
  readNotes: () => ipcRenderer.invoke('read-notes'),
  deleteNote: (id: string) => ipcRenderer.invoke('delete-note', id),
  deleteLegacyNote: (fileName: string, isScratch: boolean) => ipcRenderer.invoke('delete-legacy-note', fileName, isScratch),
  readWorkspace: () => ipcRenderer.invoke('read-workspace'),
  writeWorkspace: (data: WorkspaceData) => ipcRenderer.invoke('write-workspace', data),
  getGitHubStatus: () => ipcRenderer.invoke('github-status'),
  startGitHubLogin: () => ipcRenderer.invoke('github-start-login'),
  completeGitHubLogin: (sessionId: string) => ipcRenderer.invoke('github-complete-login', sessionId),
  syncGitHub: () => ipcRenderer.invoke('github-sync'),
  logoutGitHub: () => ipcRenderer.invoke('github-logout'),
  onGitHubWorkspaceUpdated: (callback: (result: GitHubSyncResult) => void) => {
    const listener = (_: Electron.IpcRendererEvent, result: GitHubSyncResult) => callback(result)
    ipcRenderer.on('github-workspace-updated', listener)
    return () => ipcRenderer.removeListener('github-workspace-updated', listener)
  }
})
