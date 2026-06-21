import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotesStore } from '../../store/notes'
import { useUIStore } from '../../store/ui'
import { useTasksStore } from '../../store/tasks'
import { useResurfacing } from '../../hooks/useResurfacing'
import { scaleIn, fadeIn } from '../../lib/transitions'
import Editor from './Editor'
import ArrowIcon from '../../components/ArrowIcon'

interface Props {
  noteId: string
}

export default function NoteScreen({ noteId }: Props) {
  const note = useNotesStore(s => s.getNote(noteId))
  const updateNote = useNotesStore(s => s.updateNote)
  const taskLists = useTasksStore(s => s.taskLists)
  const notes = useNotesStore(s => s.notes)
  const openNote = useUIStore(s => s.openNote)
  const sidebarOpen = useUIStore(s => s.sidebarOpen)
  const [taskListDragOver, setTaskListDragOver] = useState(false)
  const [scrollProgress, setScrollProgress] = useState(0)
  const [documentScrollable, setDocumentScrollable] = useState(false)
  const documentScrollRef = useRef<HTMLDivElement>(null)

  const suggestion = useResurfacing(noteId, note?.title || '')

  const breadcrumbs = useMemo(() => {
    if (!note?.parentId) return []
    const trail: { id: string; title: string }[] = []
    let current = note
    while (current?.parentId) {
      const parent = notes.find(n => n.id === current!.parentId)
      if (parent) {
        trail.unshift({ id: parent.id, title: parent.title })
        current = parent
      } else break
    }
    return trail
  }, [note, notes])

  const lastEditedAgo = useMemo(() => {
    if (!note) return null
    const diff = Date.now() - note.updatedAt
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return 'yesterday'
    return `${days} days ago`
  }, [note])

  const scratchTimeLeft = useMemo(() => {
    if (!note?.isScratch || !note.scratchExpiresAt) return null
    const remaining = note.scratchExpiresAt - Date.now()
    if (remaining <= 0) return 'expiring...'
    const hours = Math.floor(remaining / 3600000)
    const minutes = Math.floor((remaining % 3600000) / 60000)
    if (hours > 1) return `${hours}h remaining`
    return `${minutes}m remaining`
  }, [note])

  const updateScrollDepth = () => {
    const element = documentScrollRef.current
    if (!element) return
    const maxScroll = element.scrollHeight - element.clientHeight
    setDocumentScrollable(maxScroll > 1)
    setScrollProgress(maxScroll > 0 ? element.scrollTop / maxScroll : 0)
  }

  useEffect(() => {
    const element = documentScrollRef.current
    if (!element) return
    const frame = requestAnimationFrame(updateScrollDepth)
    const observer = new ResizeObserver(updateScrollDepth)
    observer.observe(element)
    if (element.firstElementChild) observer.observe(element.firstElementChild)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [noteId, note?.content, note?.taskListId])

  if (!note) return null

  const acceptsTaskListDrag = (event: React.DragEvent) =>
    Array.from(event.dataTransfer.types).includes('application/handin-task-list')

  const handleTaskListDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!acceptsTaskListDrag(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setTaskListDragOver(true)
  }

  const handleTaskListDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const listId = event.dataTransfer.getData('application/handin-task-list')
    setTaskListDragOver(false)
    if (!listId || !taskLists.some(list => list.id === listId)) return
    event.preventDefault()
    updateNote(noteId, { taskListId: listId })
  }

  return (
    <motion.div
      {...scaleIn}
      className={`h-full flex flex-col ${sidebarOpen ? 'pt-10' : 'pt-16'}`}
      onDragOver={handleTaskListDragOver}
      onDragLeave={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setTaskListDragOver(false)
      }}
      onDrop={handleTaskListDrop}
    >
      <div className="flex items-center justify-between px-6 py-2">
        <div className="flex items-center gap-2 text-xs">
          {breadcrumbs.map((b, index) => (
            <span key={b.id} className="flex items-center gap-2">
              {index > 0 && <ArrowIcon className="w-3 h-3 text-subtle" />}
              <button
                onClick={() => openNote(b.id)}
                className="text-subtle hover:text-dim transition-colors"
              >
                {b.title}
              </button>
            </span>
          ))}
          {breadcrumbs.length > 0 && <ArrowIcon className="w-3 h-3 text-subtle" />}
          {breadcrumbs.length > 0 && <span className="text-dim">{note.title}</span>}
        </div>

      </div>

      {note.isScratch && scratchTimeLeft && (
        <motion.div {...fadeIn} className="mx-6 mb-2 px-3 py-1.5 bg-raised border border-border rounded text-[10px] text-muted">
          scratch note — {scratchTimeLeft} — use save in the command palette to keep
        </motion.div>
      )}

      {lastEditedAgo && lastEditedAgo !== 'today' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.4 }}
          transition={{ delay: 0.3 }}
          className="px-6 text-[10px] text-subtle"
        >
          last edited {lastEditedAgo}
        </motion.div>
      )}

      <div className="relative flex-1 min-h-0">
        <div
          ref={documentScrollRef}
          data-document-scroll="true"
          onScroll={updateScrollDepth}
          className="document-scroll h-full px-6 py-3 overflow-auto"
        >
          <Editor noteId={noteId} taskListDragOver={taskListDragOver} />
        </div>

        {documentScrollable && (
          <div className="pointer-events-none absolute right-2 top-3 bottom-3 w-px bg-border/60">
            <div
              className="absolute left-1/2 h-5 w-[3px] rounded-full bg-muted transition-[top,transform] duration-150"
              style={{
                top: `${scrollProgress * 100}%`,
                transform: `translate(-50%, -${scrollProgress * 100}%)`
              }}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-6 py-3 border-t border-border flex justify-center"
          >
            <button
              onClick={() => openNote(suggestion.noteId)}
              className="text-[10px] text-subtle hover:text-dim transition-colors inline-flex items-center justify-center gap-1 text-center"
            >
              <span>you wrote something related {suggestion.daysAgo > 0 ? `${suggestion.daysAgo} days ago` : 'recently'}</span>
              <ArrowIcon variant="arrow" className="w-3 h-3" />
              <span>{suggestion.title}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
