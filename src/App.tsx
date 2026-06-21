import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useUIStore } from './store/ui'
import { useNotesStore } from './store/notes'
import Home from './screens/Home'
import NoteScreen from './screens/Note'
import Graph from './screens/Graph'
import Account from './screens/Account'
import Calendar from './screens/Home/Calendar'
import Quote from './screens/Home/Quote'
import Sidebar from './components/Sidebar'
import TaskOverlay from './components/TaskOverlay'
import HelpNote from './components/HelpNote'
import ArrowIcon from './components/ArrowIcon'
import CommandPalette from './components/CommandPalette'
import { spring } from './lib/transitions'
import { setDocumentCursorPosition } from './lib/documentCursor'

export default function App() {
  const { activeScreen, activeNoteId, sidebarOpen, rightPanelOpen, taskOverlayListId, helpOpen, graphOpen, accountOpen, commandPaletteOpen, quotesEnabled, darkMode } = useUIStore()
  const notes = useNotesStore(s => s.notes)
  const deleteNote = useNotesStore(s => s.deleteNote)
  const toggleRightPanel = useUIStore(s => s.toggleRightPanel)
  const [calendarStripVisible, setCalendarStripVisible] = useState(false)

  const hideCalendarStrip = () => {
    setCalendarStripVisible(false)
  }

  const revealCalendarStrip = () => {
    setCalendarStripVisible(true)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      notes
        .filter(n => n.isScratch && n.scratchExpiresAt && n.scratchExpiresAt < now)
        .forEach(n => deleteNote(n.id))
    }, 60000)
    return () => clearInterval(interval)
  }, [notes, deleteNote])

  useEffect(() => {
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
        else if (ui.graphOpen) ui.toggleGraph()
        else if (ui.accountOpen) ui.toggleAccount()
        else if (ui.helpOpen) ui.toggleHelp()
        else if (ui.taskOverlayListId) ui.closeTaskOverlay()
        else if (ui.activeScreen === 'note') ui.goBack()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

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
        {graphOpen && <Graph key="graph" />}
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
