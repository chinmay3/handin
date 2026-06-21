import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, unlinkSync } from 'fs'

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
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  ensureDirs()

  ipcMain.handle('write-note', (_, fileName: string, content: string) => {
    writeFileSync(join(NOTES_DIR, fileName), content, 'utf-8')
  })

  ipcMain.handle('read-notes', () => {
    if (!existsSync(NOTES_DIR)) return []
    return readdirSync(NOTES_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => ({
        fileName: f,
        content: readFileSync(join(NOTES_DIR, f), 'utf-8')
      }))
  })

  ipcMain.handle('delete-note', (_, fileName: string) => {
    const p = join(NOTES_DIR, fileName)
    if (existsSync(p)) unlinkSync(p)
  })

  ipcMain.handle('write-scratch', (_, fileName: string, content: string) => {
    writeFileSync(join(SCRATCH_DIR, fileName), content, 'utf-8')
  })

  ipcMain.handle('delete-scratch', (_, fileName: string) => {
    const p = join(SCRATCH_DIR, fileName)
    if (existsSync(p)) unlinkSync(p)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
