import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  writeNote: (fileName: string, content: string) => ipcRenderer.invoke('write-note', fileName, content),
  readNotes: () => ipcRenderer.invoke('read-notes'),
  deleteNote: (fileName: string) => ipcRenderer.invoke('delete-note', fileName),
  writeScratch: (fileName: string, content: string) => ipcRenderer.invoke('write-scratch', fileName, content),
  deleteScratch: (fileName: string) => ipcRenderer.invoke('delete-scratch', fileName)
})
