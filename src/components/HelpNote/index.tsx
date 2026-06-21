import { motion } from 'framer-motion'
import { useUIStore } from '../../store/ui'
import { overlayBg, spring } from '../../lib/transitions'

const helpContent = `handin — quick reference

commands (press ⌘ + K)

  new-sub-note [name]          create a linked sub-note
  add-task [task]              add to this document's connected list
  scratch                      temporary note (24h)
  save                         convert scratch to permanent
  history                      toggle edit timestamps
  up                           remember position and go to document top
  down                         return to remembered position
  home                         go to home
  settings                     open settings
  toggle-sidebar               show or hide sidebar
  toggle-calendar              show or hide calendar

navigation

  sidebar                      notes + task lists
  ◎ graph map                  visual note connections
  ◷ history                    when sections were written

keyboard

  ⌘ + K                        command palette
  Escape                       go back / close overlay

concepts

  notes are markdown files stored in ~/handin/notes/
  sub-notes link to parent notes via breadcrumbs
  tasks backlink to the note they were created from
  scratch notes auto-delete after 24 hours
  everything autosaves every few seconds`

export default function HelpNote() {
  const toggleHelp = useUIStore(s => s.toggleHelp)

  return (
    <motion.div
      {...overlayBg}
      className="fixed inset-0 z-40 bg-bg/90 backdrop-blur-sm flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) toggleHelp() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={spring}
        className="bg-surface border border-border rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="text-[10px] text-muted tracking-widest uppercase">help</div>
          <button onClick={toggleHelp} className="text-muted hover:text-fg transition-colors text-sm">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4">
          <pre className="text-xs text-dim leading-relaxed whitespace-pre-wrap font-mono">
            {helpContent}
          </pre>
        </div>
      </motion.div>
    </motion.div>
  )
}
