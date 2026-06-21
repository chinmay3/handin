import { contextBridge, ipcRenderer } from 'electron'
import type { Note } from '../src/lib/types'

contextBridge.exposeInMainWorld('api', {
  writeNote: (note: Note) => ipcRenderer.invoke('write-note', note),
  readNotes: () => ipcRenderer.invoke('read-notes'),
  deleteNote: (id: string) => ipcRenderer.invoke('delete-note', id),
  deleteLegacyNote: (fileName: string, isScratch: boolean) => ipcRenderer.invoke('delete-legacy-note', fileName, isScratch)
})
