import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import type { Note } from '../src/lib/types'
import { deleteLegacyNoteFile, deleteNoteFile, readNoteFiles, writeNoteFile } from './noteFiles'

const HANDIN_DIR = join(app.getPath('home'), 'handin')
const NOTES_DIR = join(HANDIN_DIR, 'notes')
const SCRATCH_DIR = join(HANDIN_DIR, 'scratch')

function ensureDirs() {
  for (const dir of [HANDIN_DIR, NOTES_DIR, SCRATCH_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  ensureDirs()

  ipcMain.handle('write-note', (_, note: Note) => {
    writeNoteFile(note, NOTES_DIR, SCRATCH_DIR)
  })

  ipcMain.handle('read-notes', () => readNoteFiles(NOTES_DIR, SCRATCH_DIR))

  ipcMain.handle('delete-note', (_, id: string) => {
    deleteNoteFile(id, NOTES_DIR, SCRATCH_DIR)
  })

  ipcMain.handle('delete-legacy-note', (_, fileName: string, isScratch: boolean) => {
    deleteLegacyNoteFile(fileName, isScratch, NOTES_DIR, SCRATCH_DIR)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
