import { app, BrowserWindow, ipcMain, safeStorage, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import type { Note } from '../src/lib/types'
import type { GitHubSyncResult, WorkspaceData } from '../src/lib/github'
import { deleteLegacyNoteFile, deleteNoteFile, readNoteFiles, writeNoteFile } from './noteFiles'
import { GitHubSyncService } from './githubSync'
import { readWorkspaceData, writeWorkspaceData } from './workspaceData'

const HANDIN_DIR = join(app.getPath('home'), 'handin')
const NOTES_DIR = join(HANDIN_DIR, 'notes')
const SCRATCH_DIR = join(HANDIN_DIR, 'scratch')
const GITHUB_CLIENT_ID = 'Iv23li5s9dgBKzIvplc3'
const GITHUB_REPO_NAME = 'handin-notes'
let mainWindow: BrowserWindow | null = null
let github: GitHubSyncService

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
      preload: join(__dirname, '../preload/index.cjs'),
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

  mainWindow = win
  win.on('closed', () => {
    if (mainWindow === win) mainWindow = null
  })
}

function broadcastWorkspaceUpdate(result: GitHubSyncResult) {
  if (result.updatedFromRemote && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('github-workspace-updated', result)
  }
}

app.whenReady().then(() => {
  ensureDirs()
  github = new GitHubSyncService({
    clientId: GITHUB_CLIENT_ID,
    repoName: GITHUB_REPO_NAME,
    directory: HANDIN_DIR,
    authFile: join(app.getPath('userData'), 'github-auth.bin'),
    encryption: {
      available: () => safeStorage.isEncryptionAvailable(),
      encrypt: value => safeStorage.encryptString(value),
      decrypt: value => safeStorage.decryptString(value)
    },
    openExternal: url => shell.openExternal(url)
  })

  const scheduleSync = () => github.scheduleSync(broadcastWorkspaceUpdate)

  ipcMain.handle('write-note', (_, note: Note) => {
    writeNoteFile(note, NOTES_DIR, SCRATCH_DIR)
    scheduleSync()
  })

  ipcMain.handle('read-notes', () => readNoteFiles(NOTES_DIR, SCRATCH_DIR))

  ipcMain.handle('delete-note', (_, id: string) => {
    deleteNoteFile(id, NOTES_DIR, SCRATCH_DIR)
    scheduleSync()
  })

  ipcMain.handle('delete-legacy-note', (_, fileName: string, isScratch: boolean) => {
    deleteLegacyNoteFile(fileName, isScratch, NOTES_DIR, SCRATCH_DIR)
    scheduleSync()
  })

  ipcMain.handle('read-workspace', () => readWorkspaceData(HANDIN_DIR))

  ipcMain.handle('write-workspace', (_, data: WorkspaceData) => {
    writeWorkspaceData(HANDIN_DIR, data)
    scheduleSync()
  })

  ipcMain.handle('github-status', () => github.getStatus())
  ipcMain.handle('github-start-login', () => github.startLogin())
  ipcMain.handle('github-complete-login', async (_, sessionId: string) => {
    const result = await github.completeLogin(sessionId)
    broadcastWorkspaceUpdate(result)
    return result
  })
  ipcMain.handle('github-sync', async () => {
    const result = await github.sync()
    broadcastWorkspaceUpdate(result)
    return result
  })
  ipcMain.handle('github-logout', () => github.logout())

  createWindow()
  if (github.getStatus().authenticated) {
    github.sync().then(broadcastWorkspaceUpdate).catch(() => undefined)
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
