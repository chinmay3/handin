import { useState, useRef, useEffect } from 'react'
import { useNotesStore } from '../../store/notes'
import { useUIStore } from '../../store/ui'
import { useTasksStore } from '../../store/tasks'
import ArrowIcon from '../../components/ArrowIcon'
import { setDocumentCursorPosition } from '../../lib/documentCursor'
import ItemMarker from '../../components/ItemMarker'

interface Props {
  noteId: string | null
  onNoteCreated?: (id: string) => void
  taskListDragOver?: boolean
}

const EDITOR_FONT = '"Merta Sans", "Avenir Next", Avenir, Helvetica, Arial, sans-serif'
const EDITOR_FONT_SIZE = 14
const EDITOR_LINE_HEIGHT = 1.2
const EDITOR_LINE_HEIGHT_PX = EDITOR_FONT_SIZE * EDITOR_LINE_HEIGHT
const ARROW_TOKEN = String.fromCharCode(8594)
const TOKEN_REGEX = new RegExp(`(https?:\\/\\/[^\\s]+|${ARROW_TOKEN})`, 'g')
const SUBNOTE_TOKEN_REGEX = /^\[\[subnote:([^\]]+)\]\]$/
const LEGACY_SUBNOTE_TOKEN_REGEX = /^\[\[subnote:([^:\]]+):([^\]]+)\]\]$/

const editorTextStyle = {
  fontFamily: EDITOR_FONT,
  fontSize: `${EDITOR_FONT_SIZE}px`,
  lineHeight: EDITOR_LINE_HEIGHT,
  fontWeight: 400,
  letterSpacing: '0px'
}

function migrateLegacySubnoteTokens(content: string, notes: { id: string; title: string }[]) {
  return content.replace(/\[\[subnote:([^:\]\n]+):([^\]\n]+)\]\]/g, (_, noteId: string, encodedTitle: string) => {
    const title = notes.find(note => note.id === noteId)?.title || decodeURIComponent(encodedTitle)
    return `[[subnote:${encodeURIComponent(title)}]]`
  })
}

function renderLine(
  line: string,
  onOpenNote: (noteId: string) => void,
  selectedSubnoteToken: string | null,
  childNotes: { id: string; title: string }[]
) {
  const trimmedLine = line.trim()
  const legacySubnote = trimmedLine.match(LEGACY_SUBNOTE_TOKEN_REGEX)
  const subnote = trimmedLine.match(SUBNOTE_TOKEN_REGEX)
  if (subnote) {
    const title = decodeURIComponent(legacySubnote?.[2] || subnote[1])
    const noteId = legacySubnote?.[1] || childNotes.find(note => note.title === title)?.id
    const selected = selectedSubnoteToken === trimmedLine
    return (
      <button
        onMouseDown={event => event.preventDefault()}
        onClick={() => noteId && onOpenNote(noteId)}
        disabled={!noteId}
        className={`pointer-events-auto select-none inline-flex h-[15.5px] items-center gap-1 rounded-[3px] border px-1.5 text-[10px] transition-colors ${
          selected
            ? 'border-fg bg-fg text-bg'
            : 'border-border bg-raised/50 text-dim hover:border-subtle hover:bg-raised hover:text-fg'
        }`}
        title="Open sub-note"
      >
        <span className={selected ? 'text-bg' : 'text-subtle'}>◇</span>
        <span>{title}</span>
        <ArrowIcon variant="arrow" className="h-2.5 w-2.5" />
      </button>
    )
  }

  return line.split(TOKEN_REGEX).map((part, index) => {
    if (part === ARROW_TOKEN) {
      return <ArrowIcon key={index} variant="arrow" className="inline-block h-[0.9em] w-[1.45em] align-[-0.08em]" />
    }

    return /^https?:\/\/[^\s]+$/.test(part) ? (
      <span key={index} className="underline decoration-[1.5px] underline-offset-2" style={{ color: 'rgb(var(--color-link))' }}>
        {part}
      </span>
    ) : (
      <span key={index}>{part}</span>
    )
  })
}

function normalizeArrows(value: string, cursorPos: number) {
  const nextValue = value.replace(/->/g, ARROW_TOKEN)
  if (nextValue === value) return { value, cursorPos }
  return {
    value: nextValue,
    cursorPos: value.substring(0, cursorPos).replace(/->/g, ARROW_TOKEN).length
  }
}

export default function Editor({ noteId, onNoteCreated, taskListDragOver = false }: Props) {
  const note = useNotesStore(s => noteId ? s.getNote(noteId) : undefined)
  const allNotes = useNotesStore(s => s.notes)
  const updateNote = useNotesStore(s => s.updateNote)
  const addNote = useNotesStore(s => s.addNote)
  const openNote = useUIStore(s => s.openNote)
  const openTaskOverlay = useUIStore(s => s.openTaskOverlay)
  const addTask = useTasksStore(s => s.addTask)
  const taskLists = useTasksStore(s => s.taskLists)
  const tasks = useTasksStore(s => s.tasks)
  const completeTask = useTasksStore(s => s.completeTask)
  const uncompleteTask = useTasksStore(s => s.uncompleteTask)

  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [localNoteId, setLocalNoteId] = useState(noteId)
  const [newAttachedTaskName, setNewAttachedTaskName] = useState('')
  const [selectedSubnoteToken, setSelectedSubnoteToken] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (note) {
      const normalizedContent = migrateLegacySubnoteTokens(note.content, allNotes)
      setTitle(note.title)
      setContent(normalizedContent)
      setLocalNoteId(noteId)
      if (normalizedContent !== note.content) updateNote(note.id, { content: normalizedContent })
    } else if (!noteId) {
      setTitle('')
      setContent('')
      setLocalNoteId(null)
    }
  }, [noteId])

  useEffect(() => {
    if (!localNoteId) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      updateNote(localNoteId, { title, content })
      const savedNote = useNotesStore.getState().getNote(localNoteId)
      if (savedNote) window.api?.writeNote(savedNote)
    }, 2000)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [localNoteId, title, content, updateNote])

  const handleTitleChange = (value: string) => {
    setTitle(value)
    if (!localNoteId && value.trim()) {
      const n = addNote({ title: value })
      setLocalNoteId(n.id)
      onNoteCreated?.(n.id)
    } else if (localNoteId) {
      updateNote(localNoteId, { title: value })
    }
  }

  const handleScroll = () => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  const handleContentChange = (value: string) => {
    const rawCursorPos = textareaRef.current?.selectionStart || 0
    const next = normalizeArrows(value, rawCursorPos)
    setContent(next.value)
    if (localNoteId) setDocumentCursorPosition(localNoteId, next.cursorPos)

    if (next.value !== value) {
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = next.cursorPos
          textareaRef.current.selectionEnd = next.cursorPos
        }
      })
    }

    if (!localNoteId && title.trim()) {
      const n = addNote({ title })
      setLocalNoteId(n.id)
      onNoteCreated?.(n.id)
    }
  }

  const lines = content.split('\n')
  const visualLineCount = lines.reduce((count, line) => count + Math.max(1, Math.ceil(line.length / 120)), 0)
  const editorContentHeight = Math.max(420, visualLineCount * EDITOR_LINE_HEIGHT_PX + 80)
  const attachedTaskList = taskLists.find(list => list.id === note?.taskListId)
  const childNotes = allNotes.filter(item => item.parentId === localNoteId)
  const attachedTasks = attachedTaskList ? tasks.filter(task => task.listId === attachedTaskList.id) : []
  const showTaskListPanel = attachedTaskList || taskListDragOver
  const createAttachedTask = () => {
    const name = newAttachedTaskName.trim()
    if (!attachedTaskList || !name) return
    addTask(attachedTaskList.id, name, localNoteId, null)
    setNewAttachedTaskName('')
  }
  const handleEditorSelection = () => {
    if (localNoteId && textareaRef.current) {
      const textarea = textareaRef.current
      setDocumentCursorPosition(localNoteId, textarea.selectionStart)
      let selectedToken: string | null = null
      for (const match of textarea.value.matchAll(/\[\[subnote:[^\]]+\]\]/g)) {
        const start = match.index
        const end = start + match[0].length
        if (textarea.selectionStart < end && textarea.selectionEnd > start) {
          selectedToken = match[0]
          break
        }
      }
      setSelectedSubnoteToken(selectedToken)
    }
  }

  return (
    <div className="relative min-h-full flex flex-col">
      <input
        value={title}
        onChange={e => handleTitleChange(e.target.value)}
        placeholder="Untitled"
        autoFocus={!noteId}
        className={`w-full bg-transparent font-bold text-[20px] leading-[1.2] px-0 pt-1 pb-4 border-none placeholder:text-subtle ${note?.isScratch ? 'text-muted' : 'text-fg'}`}
        style={{ fontFamily: EDITOR_FONT, letterSpacing: '0px' }}
      />

      {showTaskListPanel && (
        <div
          className={`mb-4 w-full rounded border px-3 py-3 text-[10px] transition-colors ${
            taskListDragOver
              ? 'border-fg bg-raised text-fg'
              : 'border-border bg-surface text-dim'
          }`}
        >
          {attachedTaskList ? (
            <>
              <div className="flex items-center justify-between gap-3 mb-2">
                <button
                  onClick={() => openTaskOverlay(attachedTaskList.id)}
                  className="min-w-0 flex items-center gap-2 text-left hover:text-fg transition-colors"
                >
                  <ItemMarker kind="task" />
                  <span className="tracking-wider uppercase shrink-0">working with</span>
                  <span className="truncate text-fg">{attachedTaskList.name}</span>
                </button>
                {localNoteId && (
                  <button
                    onClick={() => updateNote(localNoteId, { taskListId: null })}
                    className="text-subtle hover:text-fg transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="space-y-1">
                {attachedTasks.length > 0 ? (
                  attachedTasks.map(task => {
                    const done = Boolean(task.completedAt || task.status === 'done')
                    return (
                      <div key={task.id} className="flex items-center gap-2 text-[10px]">
                        <button
                          onClick={() => done ? uncompleteTask(task.id) : completeTask(task.id)}
                          className={`h-3 w-3 shrink-0 rounded-sm border transition-colors ${
                            done ? 'border-subtle bg-subtle/30' : 'border-subtle hover:border-dim'
                          }`}
                        />
                        <span className={`truncate ${done ? 'text-subtle line-through' : 'text-fg'}`}>
                          {task.name}
                        </span>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-subtle">no tasks yet</div>
                )}
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  value={newAttachedTaskName}
                  onChange={e => setNewAttachedTaskName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') createAttachedTask()
                  }}
                  placeholder="add task..."
                  className="flex-1 min-w-0 bg-bg border border-border rounded px-2 py-1 text-[10px] text-fg placeholder:text-subtle"
                />
                <button
                  onClick={createAttachedTask}
                  className="h-6 w-6 shrink-0 rounded border border-border bg-bg text-dim hover:text-fg hover:border-subtle hover:bg-raised transition-colors"
                  title="Add task"
                >
                  +
                </button>
              </div>
            </>
          ) : (
            <div className="tracking-wider uppercase text-subtle">
              drop task list here
            </div>
          )}
        </div>
      )}

      <div className="flex-1 shrink-0 relative overflow-hidden" style={{ minHeight: editorContentHeight }}>
        <div
          ref={overlayRef}
          className="absolute inset-0 z-10 whitespace-pre-wrap break-words overflow-hidden pointer-events-none"
          style={editorTextStyle}
        >
          {content === '' ? (
            <span className="text-muted">start writing...</span>
          ) : (
            lines.map((line, i) => (
              <div
                key={i}
                data-document-line={i}
                className={line.trim().startsWith('- ') ? 'text-fg font-bold' : 'text-fg'}
              >
                {line ? renderLine(line, openNote, selectedSubnoteToken, childNotes) : '​'}
              </div>
            ))
          )}
        </div>

        <textarea
          ref={textareaRef}
          data-note-editor={localNoteId || undefined}
          value={content}
          onChange={e => handleContentChange(e.target.value)}
          onSelect={handleEditorSelection}
          onScroll={handleScroll}
          className={`note-editor-input absolute inset-0 z-0 w-full h-full bg-transparent text-transparent resize-none overflow-hidden ${
            selectedSubnoteToken ? 'subnote-selection-hidden' : ''
          }`}
          style={{ ...editorTextStyle, caretColor: 'rgb(var(--color-fg))' }}
        />
      </div>

    </div>
  )
}
