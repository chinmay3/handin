import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Command, useCommands } from '../../hooks/useCommands'
import { useNotesStore } from '../../store/notes'
import { useTasksStore } from '../../store/tasks'
import { useUIStore } from '../../store/ui'
import { spring } from '../../lib/transitions'
import { getDocumentCursorPosition } from '../../lib/documentCursor'
import ArrowIcon from '../ArrowIcon'

const inputCommands = new Set(['new-sub-note', 'add-task'])
const documentReturnPositions = new Map<string, number>()

function insertSubnoteToken(content: string, position: number, title: string) {
  const safePosition = Math.max(0, Math.min(position, content.length))
  const before = content.slice(0, safePosition)
  const after = content.slice(safePosition)
  const token = `[[subnote:${encodeURIComponent(title)}]]`
  const leadingBreak = before && !before.endsWith('\n') ? '\n' : ''
  const trailingBreak = after && !after.startsWith('\n') ? '\n' : ''
  return `${before}${leadingBreak}${token}${trailingBreak}${after}`
}

export default function CommandPalette() {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const commandToken = query.trimStart().split(/\s+/)[0].toLowerCase()
  const { commands: matchingCommands } = useCommands(commandToken)

  const activeNoteId = useUIStore(s => s.activeNoteId)
  const accountOpen = useUIStore(s => s.accountOpen)
  const setCommandPaletteOpen = useUIStore(s => s.setCommandPaletteOpen)
  const openNote = useUIStore(s => s.openNote)
  const goHome = useUIStore(s => s.goHome)
  const toggleAccount = useUIStore(s => s.toggleAccount)
  const toggleSidebar = useUIStore(s => s.toggleSidebar)
  const toggleRightPanel = useUIStore(s => s.toggleRightPanel)
  const notes = useNotesStore(s => s.notes)
  const addNote = useNotesStore(s => s.addNote)
  const updateNote = useNotesStore(s => s.updateNote)
  const taskLists = useTasksStore(s => s.taskLists)
  const addTask = useTasksStore(s => s.addTask)
  const commands = activeNoteId
    ? matchingCommands
    : matchingCommands.filter(command => command.context !== 'document')

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
    setError('')
  }, [commandToken])

  const close = () => setCommandPaletteOpen(false)

  const fail = (message: string) => {
    setError(message)
    inputRef.current?.focus()
  }

  const execute = (command: Command) => {
    const exactCommand = commandToken === command.name
    if (inputCommands.has(command.name) && !exactCommand) {
      setQuery(`${command.name} `)
      setError('')
      requestAnimationFrame(() => inputRef.current?.focus())
      return
    }

    const args = exactCommand ? query.trim().slice(command.name.length).trim() : ''

    switch (command.name) {
      case 'new-sub-note': {
        if (!activeNoteId) {
          fail('Open a note before creating a sub-note')
          return
        }
        const parentNote = notes.find(item => item.id === activeNoteId)
        if (!parentNote) {
          fail('The current document was not found')
          return
        }
        const note = addNote({ title: args || 'Untitled', parentId: activeNoteId })
        const cursorPosition = getDocumentCursorPosition(activeNoteId, parentNote.content.length)
        const nextContent = insertSubnoteToken(parentNote.content, cursorPosition, note.title)
        updateNote(parentNote.id, { content: nextContent })
        const savedParent = useNotesStore.getState().getNote(parentNote.id)
        if (savedParent) window.api?.writeNote(savedParent)
        close()
        openNote(note.id)
        return
      }
      case 'add-task': {
        const note = activeNoteId ? notes.find(item => item.id === activeNoteId) : null
        if (!note) {
          fail('Open a document before adding a task')
          return
        }
        if (!note.taskListId) {
          fail('Connect a task list to this document first')
          return
        }
        const list = taskLists.find(item => item.id === note.taskListId)
        if (!list) {
          fail('The connected task list was not found')
          return
        }
        if (!args) {
          fail('Type a task name after add-task')
          return
        }
        addTask(list.id, args, activeNoteId, null)
        close()
        return
      }
      case 'scratch': {
        const note = addNote({ title: 'Scratch', isScratch: true, scratchExpiresAt: Date.now() + 86400000 })
        close()
        openNote(note.id)
        return
      }
      case 'save': {
        const note = activeNoteId ? notes.find(item => item.id === activeNoteId) : null
        if (!note?.isScratch) {
          fail('Open a scratch note before using save')
          return
        }
        updateNote(note.id, { isScratch: false, scratchExpiresAt: null })
        const savedNote = useNotesStore.getState().getNote(note.id)
        if (savedNote) window.api?.writeNote(savedNote)
        close()
        return
      }
      case 'up': {
        if (!activeNoteId) return
        const scrollContainer = document.querySelector<HTMLElement>('[data-document-scroll="true"]')
        if (!scrollContainer) {
          fail('Document scroll area was not found')
          return
        }
        if (scrollContainer.scrollTop > 0) {
          documentReturnPositions.set(activeNoteId, scrollContainer.scrollTop)
        }
        scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
        close()
        return
      }
      case 'down': {
        if (!activeNoteId) return
        const scrollContainer = document.querySelector<HTMLElement>('[data-document-scroll="true"]')
        const returnPosition = documentReturnPositions.get(activeNoteId)
        if (!scrollContainer || returnPosition === undefined) {
          fail('Use up first to remember your place')
          return
        }
        scrollContainer.scrollTo({ top: returnPosition, behavior: 'smooth' })
        close()
        return
      }
      case 'home':
        close()
        goHome()
        return
      case 'settings':
        close()
        if (!accountOpen) toggleAccount()
        return
      case 'toggle-sidebar':
        toggleSidebar()
        close()
        return
      case 'toggle-calendar':
        toggleRightPanel()
        close()
        return
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedIndex(index => Math.min(index + 1, commands.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedIndex(index => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && commands[selectedIndex]) {
      event.preventDefault()
      execute(commands[selectedIndex])
    } else if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-black/25 backdrop-blur-sm flex items-start justify-center px-6 pt-[14vh]"
      onMouseDown={event => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -10 }}
        transition={spring}
        className="w-full max-w-xl rounded-lg border border-border bg-surface shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <span className="text-xs text-subtle">⌘</span>
          <input
            ref={inputRef}
            value={query}
            onChange={event => {
              setQuery(event.target.value.replace(/^\//, ''))
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="type a command..."
            className="flex-1 bg-transparent text-sm text-fg placeholder:text-muted"
          />
          <span className="text-[10px] text-muted">esc</span>
        </div>

        {error && (
          <div className="border-b border-border px-4 py-2 text-[10px] text-muted">
            {error}
          </div>
        )}

        <div className="max-h-[360px] overflow-auto py-1">
          {commands.length > 0 ? commands.map((command, index) => (
            <button
              key={command.name}
              onMouseDown={event => event.preventDefault()}
              onClick={() => execute(command)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
                index === selectedIndex ? 'bg-raised' : 'hover:bg-raised/50'
              }`}
            >
              <span className="w-4 flex items-center justify-center text-xs text-subtle">
                {command.name === 'up' ? (
                  <ArrowIcon direction="up" variant="arrow" className="w-3.5 h-3.5" />
                ) : command.name === 'down' ? (
                  <ArrowIcon direction="down" variant="arrow" className="w-3.5 h-3.5" />
                ) : command.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-fg">{command.name}</span>
                <span className="block text-[10px] text-muted truncate">{command.description}</span>
              </span>
              <span className="text-[10px] text-subtle">{command.usage}</span>
            </button>
          )) : (
            <div className="px-4 py-8 text-center text-xs text-subtle">no command found</div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
