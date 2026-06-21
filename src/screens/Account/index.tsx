import { motion } from 'framer-motion'
import { useUIStore } from '../../store/ui'
import { overlayBg, spring } from '../../lib/transitions'
import HeatMap from './HeatMap'

export default function Account() {
  const toggleAccount = useUIStore(s => s.toggleAccount)
  const toggleQuotes = useUIStore(s => s.toggleQuotes)
  const toggleDarkMode = useUIStore(s => s.toggleDarkMode)
  const toggleSidebarLists = useUIStore(s => s.toggleSidebarLists)
  const quotesEnabled = useUIStore(s => s.quotesEnabled)
  const darkMode = useUIStore(s => s.darkMode)
  const sidebarProjectsVisible = useUIStore(s => s.sidebarProjectsVisible)
  const sidebarTaskListsVisible = useUIStore(s => s.sidebarTaskListsVisible)
  const hideSidebarLists = !sidebarProjectsVisible && !sidebarTaskListsVisible

  return (
    <motion.div
      {...overlayBg}
      className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) toggleAccount() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={spring}
        className="bg-surface border border-border rounded-lg p-8 w-full max-w-lg"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="text-xs tracking-widest uppercase text-muted">settings</div>
          <button onClick={toggleAccount} className="text-muted hover:text-fg transition-colors text-sm">
            ✕
          </button>
        </div>

        <HeatMap />

        <div className="mt-8 pt-6 border-t border-border space-y-4">
          <div className="text-[10px] text-muted tracking-wider uppercase mb-3">settings</div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-dim">writer quotes on home</span>
            <SettingButton active={quotesEnabled} onClick={toggleQuotes} label="Writer quotes on home" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-dim">dark mode</span>
            <SettingButton active={darkMode} onClick={toggleDarkMode} label="Dark mode" />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-dim">hide sidebar lists</span>
            <SettingButton active={hideSidebarLists} onClick={toggleSidebarLists} label="Hide sidebar lists" />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SettingButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`h-7 w-7 shrink-0 rounded border text-sm leading-none transition-colors ${
        active
          ? 'border-fg bg-fg text-bg hover:bg-dim'
          : 'border-border bg-bg text-transparent hover:border-subtle hover:bg-raised'
      }`}
    >
      ✓
    </button>
  )
}
