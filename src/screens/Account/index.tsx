import { motion } from 'framer-motion'
import { useUIStore } from '../../store/ui'
import { overlayBg, spring } from '../../lib/transitions'
import HeatMap from './HeatMap'
import { useGitHubStore } from '../../store/github'

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
  const github = useGitHubStore(s => s.status)
  const githubSigningIn = useGitHubStore(s => s.signingIn)
  const loginGitHub = useGitHubStore(s => s.login)
  const syncGitHub = useGitHubStore(s => s.sync)
  const logoutGitHub = useGitHubStore(s => s.logout)

  return (
    <motion.div
      {...overlayBg}
      className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) toggleAccount() }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={spring}
        className="bg-surface border border-border rounded-lg p-8 w-full max-w-lg"
      >
        <div className="flex items-center justify-between mb-8">
          <div id="settings-title" className="text-xs tracking-widest uppercase text-muted">settings</div>
          <button
            onClick={toggleAccount}
            className="text-muted hover:text-fg transition-colors text-sm"
            aria-label="Close settings"
          >
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

          <div className="pt-4 border-t border-border">
            <div className="text-[10px] text-muted tracking-wider uppercase mb-3">GitHub sync</div>
            {github.authenticated ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-xs text-fg">{github.login}</div>
                    {github.repoUrl && (
                      <a
                        href={github.repoUrl.replace(/\.git$/, '')}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-muted hover:text-dim"
                      >
                        {github.repoName}
                      </a>
                    )}
                  </div>
                  <div className="text-[10px] text-muted">
                    {github.syncState === 'syncing'
                      ? 'syncing...'
                      : github.lastSyncedAt
                        ? `synced ${new Date(github.lastSyncedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : github.syncState}
                  </div>
                </div>
                {github.error && <div className="text-[10px] leading-relaxed text-dim">{github.error}</div>}
                <div className="flex gap-2">
                  <button
                    onClick={() => syncGitHub()}
                    disabled={github.syncState === 'syncing'}
                    className="flex-1 rounded border border-border px-3 py-2 text-xs text-dim hover:bg-raised hover:text-fg disabled:opacity-50"
                  >
                    sync now
                  </button>
                  <button
                    onClick={() => logoutGitHub()}
                    className="rounded border border-border px-3 py-2 text-xs text-muted hover:bg-raised hover:text-fg"
                  >
                    disconnect
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => loginGitHub()}
                disabled={githubSigningIn}
                className="w-full rounded border border-border px-3 py-2 text-xs text-dim hover:bg-raised hover:text-fg disabled:opacity-50"
              >
                {githubSigningIn ? 'connecting...' : 'sign in with GitHub'}
              </button>
            )}
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
