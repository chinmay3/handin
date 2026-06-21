import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNotesStore } from '../../store/notes'
import { useTasksStore } from '../../store/tasks'
import { useUIStore } from '../../store/ui'
import { spring } from '../../lib/transitions'
import { getDocumentHeadings } from '../../lib/headings'
import ArrowIcon from '../ArrowIcon'
import EyeIcon from '../EyeIcon'
import ItemMarker from '../ItemMarker'
import { getNoteTreeIds } from '../../lib/noteTree'
import { scrollToDocumentLine } from '../../lib/documentNavigation'

export default function Sidebar() {
  const notes = useNotesStore(s => s.getRootNotes())
  const allNotes = useNotesStore(s => s.notes)
  const getChildren = useNotesStore(s => s.getChildren)
  const getNote = useNotesStore(s => s.getNote)
  const addNote = useNotesStore(s => s.addNote)
  const deleteNote = useNotesStore(s => s.deleteNote)
  const taskLists = useTasksStore(s => s.taskLists)
  const tasks = useTasksStore(s => s.tasks)
  const addTaskList = useTasksStore(s => s.addTaskList)
  const {
    openNote, goHome, openTaskOverlay, toggleSidebar,
    toggleAccount, toggleHelp, toggleSidebarProjects,
    toggleSidebarTaskLists, activeNoteId
  } = useUIStore()
  const sidebarProjectsVisible = useUIStore(s => s.sidebarProjectsVisible)
  const sidebarTaskListsVisible = useUIStore(s => s.sidebarTaskListsVisible)

  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creatingTaskList, setCreatingTaskList] = useState(false)
  const [newTaskListName, setNewTaskListName] = useState('')
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const activeNote = activeNoteId ? getNote(activeNoteId) : null
  const documentHeadings = activeNote ? getDocumentHeadings(activeNote.content) : []

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }))

  const createProject = () => {
    const title = newProjectName.trim()
    if (!title) return
    const note = addNote({ title })
    setNewProjectName('')
    setCreatingProject(false)
    openNote(note.id)
  }

  const createTaskList = () => {
    const name = newTaskListName.trim()
    if (!name) return
    addTaskList(name, activeNoteId)
    setNewTaskListName('')
    setCreatingTaskList(false)
  }

  const projectToDelete = deletingProjectId ? notes.find(note => note.id === deletingProjectId) : null
  const deletePhrase = projectToDelete ? `delete ${projectToDelete.title || 'Untitled'}` : ''
  const canDeleteProject = deleteConfirmation.trim() === deletePhrase

  const closeDeleteProject = () => {
    setDeletingProjectId(null)
    setDeleteConfirmation('')
  }

  const confirmDeleteProject = () => {
    if (!projectToDelete || !canDeleteProject) return
    getNoteTreeIds(allNotes, projectToDelete.id).forEach(id => window.api?.deleteNote(id))
    deleteNote(projectToDelete.id)
    if (activeNoteId === projectToDelete.id || getChildren(projectToDelete.id).some(child => child.id === activeNoteId)) {
      goHome()
    }
    closeDeleteProject()
  }

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 220, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={spring}
      className="h-full border-r border-border bg-surface flex flex-col overflow-hidden pt-10"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={goHome}
          className="handin-wordmark text-xs tracking-widest uppercase transition-colors"
        >
          handin
        </button>
        <button
          onClick={toggleSidebar}
          className="text-dim hover:text-fg transition-colors text-xl leading-none"
        >
          <ArrowIcon direction="left" className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto px-2">
        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="text-xs text-dim font-medium tracking-wider uppercase">projects</div>
            <div className="flex items-center gap-1">
              {sidebarProjectsVisible && (
                <button
                  onClick={() => setCreatingProject(true)}
                  className="w-7 h-7 rounded text-sm leading-none text-subtle hover:text-fg hover:bg-raised transition-colors"
                  title="New project"
                >
                  +
                </button>
              )}
              <button
                onClick={toggleSidebarProjects}
                className="w-7 h-7 rounded flex items-center justify-center text-subtle hover:text-fg hover:bg-raised transition-colors"
                title={sidebarProjectsVisible ? 'Hide projects' : 'Show projects'}
              >
                <EyeIcon visible={sidebarProjectsVisible} className="w-3 h-3" />
              </button>
            </div>
          </div>
          {sidebarProjectsVisible && (
            <>
          {creatingProject && (
            <div className="px-2 pb-2">
              <input
                value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createProject()
                  if (e.key === 'Escape') {
                    setNewProjectName('')
                    setCreatingProject(false)
                  }
                }}
                onBlur={() => {
                  if (!newProjectName.trim()) setCreatingProject(false)
                }}
                autoFocus
                placeholder="project name..."
                className="w-full bg-raised border border-border rounded px-2 py-1 text-xs text-fg placeholder:text-subtle"
              />
            </div>
          )}
          {notes.length === 0 && (
            <div className="text-xs text-muted px-2 py-1">no projects yet</div>
          )}
          {notes.map(note => {
            const children = getChildren(note.id)
            const hasChildren = children.length > 0
            const isExpanded = expanded[note.id] !== false

            return (
              <div key={note.id}>
                <div className="flex items-center group">
                  {hasChildren ? (
                    <button
                      onClick={() => toggle(note.id)}
                      className="text-[10px] text-subtle hover:text-dim transition-colors w-4 text-center shrink-0"
                    >
                      {isExpanded ? '▾' : '▸'}
                    </button>
                  ) : (
                    <span className="flex w-4 shrink-0 items-center justify-center">
                      <ItemMarker kind="note" />
                    </span>
                  )}
                  <button
                    onClick={() => openNote(note.id)}
                    className={`
                      flex-1 text-left px-1 py-1 rounded text-xs truncate transition-colors
                      ${activeNoteId === note.id ? 'bg-raised text-fg' : 'text-dim hover:bg-raised/50 hover:text-fg'}
                    `}
                  >
                    {note.title || 'Untitled'}
                  </button>
                  <button
                    onClick={() => {
                      setDeletingProjectId(note.id)
                      setDeleteConfirmation('')
                    }}
                    className="w-5 h-5 rounded text-[10px] text-subtle hover:text-dim hover:bg-raised opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    title="Delete project"
                  >
                    ✕
                  </button>
                </div>
                {hasChildren && isExpanded && (
                  <div className="ml-4 border-l border-border/50 pl-1">
                    {children.map(child => (
                      <button
                        key={child.id}
                        onClick={() => openNote(child.id)}
                        className={`
                          w-full text-left px-2 py-0.5 rounded text-[11px] flex items-center gap-1.5 transition-colors
                          ${activeNoteId === child.id ? 'bg-raised text-fg' : 'text-subtle hover:bg-raised/50 hover:text-dim'}
                        `}
                      >
                        <ItemMarker kind="note" className="h-1 w-1" />
                        <span className="truncate">{child.title || 'Untitled'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
            </>
          )}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between px-2 py-2">
            <div className="text-xs text-dim font-medium tracking-wider uppercase">task lists</div>
            <div className="flex items-center gap-1">
              {sidebarTaskListsVisible && (
                <button
                  onClick={() => setCreatingTaskList(true)}
                  className="w-7 h-7 rounded text-sm leading-none text-subtle hover:text-fg hover:bg-raised transition-colors"
                  title="New task list"
                >
                  +
                </button>
              )}
              <button
                onClick={toggleSidebarTaskLists}
                className="w-7 h-7 rounded flex items-center justify-center text-subtle hover:text-fg hover:bg-raised transition-colors"
                title={sidebarTaskListsVisible ? 'Hide task lists' : 'Show task lists'}
              >
                <EyeIcon visible={sidebarTaskListsVisible} className="w-3 h-3" />
              </button>
            </div>
          </div>
          {sidebarTaskListsVisible && (
            <>
          {creatingTaskList && (
            <div className="px-2 pb-2">
              <input
                value={newTaskListName}
                onChange={e => setNewTaskListName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') createTaskList()
                  if (e.key === 'Escape') {
                    setNewTaskListName('')
                    setCreatingTaskList(false)
                  }
                }}
                onBlur={() => {
                  if (!newTaskListName.trim()) setCreatingTaskList(false)
                }}
                autoFocus
                placeholder="list name..."
                className="w-full bg-raised border border-border rounded px-2 py-1 text-xs text-fg placeholder:text-subtle"
              />
            </div>
          )}
          {taskLists.length === 0 && (
            <div className="text-xs text-muted px-2 py-1">no lists yet</div>
          )}
          {taskLists.map(list => {
            const count = tasks.filter(t => t.listId === list.id && !t.completedAt).length
            const attachedNotes = allNotes.filter(note => note.taskListId === list.id)
            const origin = list.originNoteId ? allNotes.find(note => note.id === list.originNoteId) : null
            const connectedNotes = origin && !attachedNotes.some(note => note.id === origin.id)
              ? [origin, ...attachedNotes]
              : attachedNotes
            return (
              <div key={list.id}>
                <button
                  onClick={() => openTaskOverlay(list.id)}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData('application/handin-task-list', list.id)
                    e.dataTransfer.setData('text/plain', list.id)
                    e.dataTransfer.effectAllowed = 'copy'
                  }}
                  className="w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between text-dim hover:bg-raised/50 hover:text-fg transition-colors cursor-grab active:cursor-grabbing"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <ItemMarker kind="task" />
                    <span className="truncate">{list.name}</span>
                  </span>
                  {count > 0 && (
                    <span className="text-[10px] text-subtle">{count}</span>
                  )}
                </button>

                {connectedNotes.length > 0 && (
                  <div className="ml-6 space-y-0.5">
                    {connectedNotes.map(note => (
                      <button
                        key={note.id}
                        onClick={() => openNote(note.id)}
                        className={`w-full min-w-0 rounded px-2 py-0.5 text-left text-[10px] flex items-center gap-1 transition-colors ${
                          activeNoteId === note.id
                            ? 'bg-raised text-fg'
                            : 'text-subtle hover:bg-raised/50 hover:text-dim'
                        }`}
                      >
                        <ArrowIcon variant="arrow" className="w-3 h-3 shrink-0" />
                        <span className="truncate">{note.title || 'Untitled'}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
            </>
          )}
        </div>

        {activeNote && documentHeadings.length > 0 && (
          <div className="mb-4">
            <div className="px-2 py-2 text-xs text-dim font-medium tracking-wider uppercase">this document</div>
            <div className="space-y-0.5">
              {documentHeadings.map(heading => (
                <button
                  key={heading.id}
                  onClick={() => scrollToDocumentLine(heading.line)}
                  className="w-full text-left px-2 py-1 rounded text-xs flex items-center gap-2 text-dim hover:bg-raised/50 hover:text-fg transition-colors"
                >
                  <span className="text-subtle text-[10px]">-</span>
                  <span className="truncate">{heading.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-14 shrink-0 px-4 flex items-center justify-between">
        <button
          onClick={toggleAccount}
          className="text-xs text-dim font-medium hover:text-fg transition-colors tracking-wider uppercase"
        >
          ◎ settings
        </button>
        <button
          onClick={toggleHelp}
          className="text-lg text-dim hover:text-fg transition-colors"
        >
          ?
        </button>
      </div>

      {projectToDelete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center px-6"
          onClick={e => {
            if (e.target === e.currentTarget) closeDeleteProject()
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={spring}
            className="w-full max-w-md bg-bg border border-border rounded-lg shadow-2xl p-6"
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <div className="text-[10px] text-muted tracking-widest uppercase mb-1">delete project</div>
                <div className="text-sm text-fg">{projectToDelete.title || 'Untitled'}</div>
              </div>
              <button onClick={closeDeleteProject} className="text-muted hover:text-fg transition-colors text-sm">
                ✕
              </button>
            </div>

            <div className="text-xs text-dim leading-relaxed mb-4">
              Are you sure you want to delete it? Type <span className="text-fg">{deletePhrase}</span> to confirm.
            </div>

            <input
              value={deleteConfirmation}
              onChange={e => setDeleteConfirmation(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmDeleteProject()
                if (e.key === 'Escape') closeDeleteProject()
              }}
              autoFocus
              className="w-full bg-bg border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-subtle"
              placeholder={deletePhrase}
            />

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeDeleteProject}
                className="px-3 py-1.5 border border-border rounded text-xs text-dim hover:text-fg hover:bg-surface transition-colors"
              >
                cancel
              </button>
              <button
                onClick={confirmDeleteProject}
                disabled={!canDeleteProject}
                className={`px-3 py-1.5 border rounded text-xs transition-colors ${
                  canDeleteProject
                    ? 'border-border text-fg hover:bg-surface'
                    : 'border-border text-subtle opacity-50 cursor-not-allowed'
                }`}
              >
                delete
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

    </motion.div>
  )
}
