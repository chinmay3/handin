import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUIStore } from './store/ui'
import { useNotesStore } from './store/notes'
import { useTasksStore } from './store/tasks'
import { useEventsStore } from './store/events'
import { useGitHubStore } from './store/github'
import Home from './screens/Home'
import NoteScreen from './screens/Note'
import Account from './screens/Account'
import Calendar from './screens/Home/Calendar'
import Quote from './screens/Home/Quote'
import Sidebar from './components/Sidebar'
import TaskOverlay from './components/TaskOverlay'
import HelpNote from './components/HelpNote'
import ArrowIcon from './components/ArrowIcon'
import CommandPalette from './components/CommandPalette'
import GitHubOnboarding from './components/GitHubOnboarding'
import { spring } from './lib/transitions'
import { setDocumentCursorPosition } from './lib/documentCursor'
import { mergeDiskNotes } from './lib/notePersistence'
import { getExpiredScratchIds, getNoteTreeIds } from './lib/noteTree'

export default function App() {
  const { activeScreen, activeNoteId, sidebarOpen, rightPanelOpen, taskOverlayListId, helpOpen, accountOpen, commandPaletteOpen, quotesEnabled, darkMode } = useUIStore()
  const deleteNote = useNotesStore(s => s.deleteNote)
  const hydrateNotes = useNotesStore(s => s.hydrateNotes)
  const toggleRightPanel = useUIStore(s => s.toggleRightPanel)
  const [calendarStripVisible, setCalendarStripVisible] = useState(false)
  const noteFilesInitialized = useRef(false)
  const workspaceInitialized = useRef(false)
  const githubStatus = useGitHubStore(s => s.status)
  const githubChecking = useGitHubStore(s => s.checking)
  const initializeGitHub = useGitHubStore(s => s.initialize)
  const applyGitHubStatus = useGitHubStore(s => s.applyStatus)

  const hideCalendarStrip = () => {
    setCalendarStripVisible(false)
  }

  const revealCalendarStrip = () => {
    setCalendarStripVisible(true)
  }

  useEffect(() => {
    initializeGitHub()
  }, [initializeGitHub])

  useEffect(() => {
    if (githubChecking || !githubStatus.authenticated || noteFilesInitialized.current || !window.api) return
    noteFilesInitialized.current = true
    const initializeFiles = async () => {
      if (githubStatus.authenticated && window.api?.syncGitHub) {
        const result = await window.api.syncGitHub()
        applyGitHubStatus(result)
      }

      const diskNotes = await window.api!.readNotes()
      const localNotes = githubStatus.authenticated ? [] : useNotesStore.getState().notes
      const merged = mergeDiskNotes(localNotes, diskNotes)
      hydrateNotes(merged.notes)
      await Promise.all(merged.notes.map(note => window.api!.writeNote(note)))
      await Promise.all(merged.legacyFiles.map(file => window.api!.deleteLegacyNote(file.fileName, file.isScratch)))

      if (window.api?.readWorkspace) {
        const data = await window.api.readWorkspace()
        if (data) {
          useTasksStore.setState({ taskLists: data.taskLists, tasks: data.tasks })
          useEventsStore.setState({ events: data.events })
        } else if (window.api.writeWorkspace) {
          const tasks = useTasksStore.getState()
          await window.api.writeWorkspace({
            version: 1,
            taskLists: tasks.taskLists,
            tasks: tasks.tasks,
            events: useEventsStore.getState().events
          })
        }
      }
    }

    initializeFiles().catch(() => undefined).finally(() => {
      workspaceInitialized.current = true
    })
  }, [applyGitHubStatus, githubChecking, githubStatus.authenticated, hydrateNotes])

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null
    const persistWorkspace = () => {
      if (!workspaceInitialized.current || !window.api?.writeWorkspace) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        const tasks = useTasksStore.getState()
        window.api?.writeWorkspace?.({
          version: 1,
          taskLists: tasks.taskLists,
          tasks: tasks.tasks,
          events: useEventsStore.getState().events
        })
      }, 300)
    }
    const unsubscribeTasks = useTasksStore.subscribe(persistWorkspace)
    const unsubscribeEvents = useEventsStore.subscribe(persistWorkspace)
    return () => {
      if (timer) clearTimeout(timer)
      unsubscribeTasks()
      unsubscribeEvents()
    }
  }, [])

  useEffect(() => {
    if (!window.api?.onGitHubWorkspaceUpdated) return
    return window.api.onGitHubWorkspaceUpdated(async result => {
      applyGitHubStatus(result)
      if (!result.updatedFromRemote || !window.api) return
      try {
        const [diskNotes, data] = await Promise.all([
          window.api.readNotes(),
          window.api.readWorkspace ? window.api.readWorkspace() : Promise.resolve(null)
        ])
        hydrateNotes(mergeDiskNotes([], diskNotes).notes)
        if (data) {
          useTasksStore.setState({ taskLists: data.taskLists, tasks: data.tasks })
          useEventsStore.setState({ events: data.events })
        }
      } catch {
        applyGitHubStatus({ ...result, syncState: 'error', error: 'GitHub updated files could not be loaded' })
      }
    })
  }, [applyGitHubStatus, hydrateNotes])

  useEffect(() => {
    if (!githubStatus.authenticated) return
    const removeExpiredScratchNotes = () => {
      const currentNotes = useNotesStore.getState().notes
      const expiredIds = getExpiredScratchIds(currentNotes, Date.now())
      const idsToDelete = new Set(expiredIds.flatMap(id => getNoteTreeIds(currentNotes, id)))
      idsToDelete.forEach(id => {
        deleteNote(id)
        window.api?.deleteNote(id)
      })
    }
    removeExpiredScratchNotes()
    const interval = setInterval(removeExpiredScratchNotes, 60000)
    return () => clearInterval(interval)
  }, [deleteNote, githubStatus.authenticated])

  useEffect(() => {
    if (!githubStatus.authenticated) return
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        const ui = useUIStore.getState()
        const activeElement = document.activeElement
        if (ui.activeNoteId && activeElement instanceof HTMLTextAreaElement && activeElement.dataset.noteEditor === ui.activeNoteId) {
          setDocumentCursorPosition(ui.activeNoteId, activeElement.selectionStart)
          useNotesStore.getState().updateNote(ui.activeNoteId, { content: activeElement.value })
        }
        ui.setCommandPaletteOpen(!ui.commandPaletteOpen)
        return
      }
      if (e.key === 'Escape') {
        const ui = useUIStore.getState()
        if (ui.commandPaletteOpen) ui.setCommandPaletteOpen(false)
        else if (ui.accountOpen) ui.toggleAccount()
        else if (ui.helpOpen) ui.toggleHelp()
        else if (ui.taskOverlayListId) ui.closeTaskOverlay()
        else if (ui.activeScreen === 'note') ui.goBack()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [githubStatus.authenticated])

  useEffect(() => {
    const theme = darkMode ? 'dark' : 'light'
    const root = document.documentElement
    const appRoot = document.getElementById('root')
    root.dataset.theme = theme
    document.body.dataset.theme = theme
    if (appRoot) appRoot.dataset.theme = theme
    return () => {
      delete root.dataset.theme
      delete document.body.dataset.theme
      if (appRoot) delete appRoot.dataset.theme
    }
  }, [darkMode])

  useEffect(() => {
    if (rightPanelOpen) {
      setCalendarStripVisible(false)
    }
  }, [rightPanelOpen])

  if (githubChecking) {
    return <div className="flex h-screen w-screen items-center justify-center bg-bg text-xs text-muted">handin</div>
  }

  if (!githubStatus.authenticated) return <GitHubOnboarding />

  return (
    <div data-theme={darkMode ? 'dark' : 'light'} className="flex h-screen w-screen bg-bg text-fg overflow-hidden">
      <div className="drag-region absolute top-0 left-0 right-0 h-8 z-50" />

      {!sidebarOpen && (
        <button
          onClick={() => useUIStore.getState().toggleSidebar()}
          className={`fixed left-4 z-30 flex h-6 w-6 items-center justify-center text-dim hover:text-fg transition-colors text-lg leading-none no-drag ${
            activeScreen === 'home' ? 'top-[50px]' : 'top-9'
          }`}
          title="Open sidebar"
        >
          ☰
        </button>
      )}

      <AnimatePresence mode="wait">
        {sidebarOpen && <Sidebar key="sidebar" />}
      </AnimatePresence>

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          {activeScreen === 'home' && <Home key="home" />}
          {activeScreen === 'note' && activeNoteId && (
            <NoteScreen key={activeNoteId} noteId={activeNoteId} />
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence mode="wait">
        {rightPanelOpen ? (
          <motion.aside
            key="calendar-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 256, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={spring}
            className="h-full border-l border-border px-5 py-4 pt-10 overflow-auto space-y-6 no-focus-capture shrink-0"
          >
            <div className="flex justify-end -mt-1 mb-2">
              <button
                onClick={toggleRightPanel}
                className="text-dim hover:text-fg transition-colors text-xl leading-none"
                title="Close calendar"
              >
                <ArrowIcon direction="right" className="w-4 h-4" />
              </button>
            </div>
            <Calendar />
            {quotesEnabled && <Quote />}
          </motion.aside>
        ) : (
          <motion.div
            key="calendar-strip"
            initial={{ width: 0 }}
            animate={{ width: calendarStripVisible ? 40 : 10 }}
            exit={{ width: 0 }}
            transition={spring}
            onMouseEnter={revealCalendarStrip}
            onMouseLeave={hideCalendarStrip}
            className="h-full shrink-0 relative"
          >
            <button
              onClick={toggleRightPanel}
              onFocus={revealCalendarStrip}
              onBlur={hideCalendarStrip}
              className={`absolute inset-0 border-l border-border text-dim hover:text-fg hover:bg-surface transition-all flex items-center justify-center ${
                calendarStripVisible ? 'opacity-100' : 'opacity-0'
              }`}
              title="Open calendar"
            >
              <ArrowIcon direction="left" className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {taskOverlayListId && <TaskOverlay key="task-overlay" listId={taskOverlayListId} />}
      </AnimatePresence>

      <AnimatePresence>
        {accountOpen && <Account key="account" />}
      </AnimatePresence>

      <AnimatePresence>
        {helpOpen && <HelpNote key="help" />}
      </AnimatePresence>

      <AnimatePresence>
        {commandPaletteOpen && <CommandPalette key="command-palette" />}
      </AnimatePresence>
    </div>
  )
}
