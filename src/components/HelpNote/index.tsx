import { motion } from 'framer-motion'
import { useUIStore } from '../../store/ui'
import { overlayBg, spring } from '../../lib/transitions'

const commands = [
  ['new-sub-note [name]', 'create a linked sub-note'],
  ['add-task [task]', "add to this document's connected list"],
  ['scratch', 'temporary note (24h)'],
  ['save', 'convert scratch to permanent'],
  ['up', 'remember position and go to document top'],
  ['down', 'return to remembered position'],
  ['home', 'go to home'],
  ['settings', 'open settings'],
  ['toggle-sidebar', 'show or hide sidebar'],
  ['toggle-calendar', 'show or hide calendar']
]

const navigation = [['sidebar', 'notes + task lists']]

const keyboard = [
  ['⌘ + K', 'command palette'],
  ['Escape', 'go back / close overlay']
]

const concepts = [
  'notes are markdown files stored in ~/handin/notes/',
  'sub-notes link to parent notes via breadcrumbs',
  'tasks backlink to the note they were created from',
  'scratch notes auto-delete after 24 hours',
  'everything autosaves every few seconds'
]

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
          <button
            onClick={toggleHelp}
            className="h-8 w-8 rounded text-muted hover:bg-raised hover:text-fg transition-colors text-sm"
            title="Close help"
            aria-label="Close help"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 text-xs text-dim">
          <div className="mb-6 text-sm text-fg">handin — quick reference</div>
          <HelpRows title="commands (press ⌘ + K)" rows={commands} />
          <HelpRows title="navigation" rows={navigation} />
          <HelpRows title="keyboard" rows={keyboard} />
          <section>
            <div className="mb-3 text-[10px] uppercase tracking-widest text-muted">concepts</div>
            <div className="space-y-2 leading-relaxed">
              {concepts.map(concept => <div key={concept}>{concept}</div>)}
            </div>
          </section>
        </div>
      </motion.div>
    </motion.div>
  )
}

function HelpRows({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="mb-6">
      <div className="mb-3 text-[10px] uppercase tracking-widest text-muted">{title}</div>
      <div className="grid grid-cols-[minmax(170px,auto)_1fr] gap-x-8 gap-y-2 leading-relaxed">
        {rows.map(([label, description]) => (
          <div key={label} className="contents">
            <div className="whitespace-nowrap text-fg">{label}</div>
            <div>{description}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
