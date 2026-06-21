import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearch } from '../../hooks/useSearch'
import { useUIStore } from '../../store/ui'
import { spring } from '../../lib/transitions'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [focused, setFocused] = useState(false)
  const results = useSearch(query)
  const openNote = useUIStore(s => s.openNote)

  return (
    <div className="relative no-focus-capture">
      <div className={`
        flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors
        ${focused ? 'border-subtle bg-raised' : 'border-border bg-surface'}
      `}>
        <span className="text-dim text-sm">◇</span>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder="search notes, tasks..."
          className="flex-1 bg-transparent text-sm text-fg placeholder:text-muted"
        />
      </div>

      <AnimatePresence>
        {focused && query.trim() && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={spring}
            className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-2xl overflow-hidden z-50"
          >
            {results.map(r => (
              <button
                key={r.id}
                onMouseDown={() => {
                  if (r.type === 'note') openNote(r.id)
                  setQuery('')
                }}
                className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-raised transition-colors"
              >
                <span className="text-[10px] text-subtle">
                  {r.type === 'note' ? '◇' : '▫'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-fg truncate">{r.title}</div>
                  {r.body && (
                    <div className="text-[10px] text-muted truncate">{r.body.substring(0, 60)}</div>
                  )}
                </div>
                <span className="text-[10px] text-subtle">{r.type}</span>
              </button>
            ))}
          </motion.div>
        )}

        {focused && query.trim() && results.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg p-4 text-center z-50"
          >
            <span className="text-xs text-subtle/40">no results</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
