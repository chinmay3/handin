import { useState } from 'react'
import { motion } from 'framer-motion'
import { useUIStore } from '../../store/ui'
import { useNotesStore } from '../../store/notes'
import { useTasksStore } from '../../store/tasks'
import SearchBar from '../../components/SearchBar'
import { fadeIn } from '../../lib/transitions'

export default function Home() {
  const openNote = useUIStore(s => s.openNote)
  const openTaskOverlay = useUIStore(s => s.openTaskOverlay)
  const notes = useNotesStore(s => s.getRootNotes())
  const getChildren = useNotesStore(s => s.getChildren)
  const addNote = useNotesStore(s => s.addNote)
  const taskLists = useTasksStore(s => s.taskLists)
  const tasks = useTasksStore(s => s.tasks)
  const addTaskList = useTasksStore(s => s.addTaskList)

  const [creatingProject, setCreatingProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [creatingTaskList, setCreatingTaskList] = useState(false)
  const [newTaskListName, setNewTaskListName] = useState('')

  const hasNotes = notes.length > 0

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
    addTaskList(name)
    setNewTaskListName('')
    setCreatingTaskList(false)
  }

  return (
    <motion.div {...fadeIn} className="h-full flex flex-col pt-10">
      <div className="px-12 pb-4">
        <SearchBar />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col px-6 py-4 overflow-auto">
          <section>
            <div className="flex items-center justify-between px-3 py-2">
              <div className="text-xs text-dim font-medium tracking-wider uppercase">projects</div>
              <button
                onClick={() => setCreatingProject(true)}
                className="h-6 w-6 flex items-center justify-center text-subtle hover:text-fg hover:bg-surface rounded transition-colors"
                title="New project"
              >
                +
              </button>
            </div>

            {creatingProject && (
              <div className="px-3 pb-2 flex items-center gap-2">
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
                  autoFocus
                  placeholder="project name..."
                  className="flex-1 bg-surface border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-subtle"
                />
                <button
                  onClick={createProject}
                  className="h-8 w-8 rounded border border-border text-dim hover:text-fg hover:bg-surface transition-colors"
                >
                  +
                </button>
              </div>
            )}

            {hasNotes ? (
              <div className="space-y-1">
                {notes.map(note => {
                  const children = getChildren(note.id)
                  return (
                    <div key={note.id}>
                      <button
                        onClick={() => openNote(note.id)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface transition-colors flex items-center gap-3 group"
                      >
                        <span className="text-subtle text-xs">{children.length > 0 ? '▪' : '◇'}</span>
                        <span className="text-sm text-fg group-hover:text-fg">{note.title || 'Untitled'}</span>
                      </button>
                      {children.length > 0 && (
                        <div className="ml-8 space-y-0.5">
                          {children.map(child => (
                            <button
                              key={child.id}
                              onClick={() => openNote(child.id)}
                              className="w-full text-left px-3 py-1 rounded hover:bg-surface transition-colors flex items-center gap-2"
                            >
                              <span className="text-subtle text-[10px]">◇</span>
                              <span className="text-xs text-dim">{child.title || 'Untitled'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-3 py-2 text-xs text-muted">no projects yet</div>
            )}
          </section>

          <section className="mt-8 pb-8">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="text-xs text-dim font-medium tracking-wider uppercase">task lists</div>
              <button
                onClick={() => setCreatingTaskList(true)}
                className="h-6 w-6 flex items-center justify-center text-subtle hover:text-fg hover:bg-surface rounded transition-colors"
                title="New task list"
              >
                +
              </button>
            </div>

            {creatingTaskList && (
              <div className="px-3 pb-2 flex items-center gap-2">
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
                  autoFocus
                  placeholder="list name..."
                  className="flex-1 bg-surface border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-subtle"
                />
                <button
                  onClick={createTaskList}
                  className="h-8 w-8 rounded border border-border text-dim hover:text-fg hover:bg-surface transition-colors"
                >
                  +
                </button>
              </div>
            )}

            {taskLists.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted">no task lists yet</div>
            ) : (
              <div className="space-y-1">
                {taskLists.map(list => {
                  const count = tasks.filter(task => task.listId === list.id && !task.completedAt).length
                  return (
                    <button
                      key={list.id}
                      onClick={() => openTaskOverlay(list.id)}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('application/handin-task-list', list.id)
                        e.dataTransfer.setData('text/plain', list.id)
                        e.dataTransfer.effectAllowed = 'copy'
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface transition-colors flex items-center justify-between gap-3 cursor-grab active:cursor-grabbing"
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span className="text-subtle text-xs">▫</span>
                        <span className="text-sm text-fg truncate">{list.name}</span>
                      </span>
                      {count > 0 && <span className="text-xs text-subtle">{count}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </section>
        </div>

      </div>
    </motion.div>
  )
}
