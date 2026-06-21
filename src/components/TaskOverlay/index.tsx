import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTasksStore } from '../../store/tasks'
import { useNotesStore } from '../../store/notes'
import { useUIStore } from '../../store/ui'
import { spring } from '../../lib/transitions'
import { Task, TaskStatus } from '../../lib/types'
import ArrowIcon from '../ArrowIcon'

interface Props {
  listId: string
}

export default function TaskOverlay({ listId }: Props) {
  const taskList = useTasksStore(s => s.taskLists.find(l => l.id === listId))
  const tasks = useTasksStore(s => s.getTasksByList(listId))
  const completeTask = useTasksStore(s => s.completeTask)
  const uncompleteTask = useTasksStore(s => s.uncompleteTask)
  const updateTaskStatus = useTasksStore(s => s.updateTaskStatus)
  const deleteTask = useTasksStore(s => s.deleteTask)
  const addTask = useTasksStore(s => s.addTask)
  const addSubtask = useTasksStore(s => s.addSubtask)
  const completeSubtask = useTasksStore(s => s.completeSubtask)
  const deleteSubtask = useTasksStore(s => s.deleteSubtask)
  const updateTaskDescription = useTasksStore(s => s.updateTaskDescription)
  const addTaskLink = useTasksStore(s => s.addTaskLink)
  const deleteTaskLink = useTasksStore(s => s.deleteTaskLink)
  const getNote = useNotesStore(s => s.getNote)
  const openNote = useUIStore(s => s.openNote)
  const closeTaskOverlay = useUIStore(s => s.closeTaskOverlay)
  const activeNoteId = useUIStore(s => s.activeNoteId)

  const [newTaskName, setNewTaskName] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [newSubtaskName, setNewSubtaskName] = useState('')
  const [newLinkUrl, setNewLinkUrl] = useState('')
  const [executionMode, setExecutionMode] = useState(true)
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null)

  useEffect(() => {
    setExecutionMode(true)
  }, [listId])

  if (!taskList) return null

  const pending = tasks.filter(t => getTaskStatus(t) !== 'done')
  const completed = tasks.filter(t => getTaskStatus(t) === 'done')
  const originNoteId = taskList.originNoteId || activeNoteId
  const selectedTask = selectedTaskId ? tasks.find(t => t.id === selectedTaskId) : null

  const createTask = () => {
    const name = newTaskName.trim()
    if (!name) return
    addTask(taskList.id, name, originNoteId)
    setNewTaskName('')
  }

  const createSubtask = (taskId: string) => {
    const name = newSubtaskName.trim()
    if (!name) return
    addSubtask(taskId, name)
    setNewSubtaskName('')
  }

  const createTaskLink = (taskId: string) => {
    const url = newLinkUrl.trim()
    if (!url) return
    addTaskLink(taskId, url)
    setNewLinkUrl('')
  }

  const moveTask = (taskId: string, status: TaskStatus) => {
    updateTaskStatus(taskId, status)
    setDraggedTaskId(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] flex items-center justify-center px-6"
      onClick={e => { if (e.target === e.currentTarget) closeTaskOverlay() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={spring}
        className={`w-full max-h-[78vh] bg-bg border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col ${executionMode ? 'max-w-5xl' : 'max-w-2xl'}`}
      >
        <div className="px-6 py-5 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[10px] text-muted tracking-widest uppercase mb-1">task list</div>
              <div className="text-sm tracking-wider text-fg">
                <span className="text-subtle">▪</span> {taskList.name}
                <span className="text-subtle ml-2">({pending.length})</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExecutionMode(false)}
                className={`px-3 py-1.5 rounded border text-[10px] tracking-wider uppercase transition-colors ${
                  !executionMode ? 'border-subtle text-fg bg-surface' : 'border-border text-muted hover:text-fg'
                }`}
              >
                list
              </button>
              <button
                onClick={() => setExecutionMode(true)}
                className={`px-3 py-1.5 rounded border text-[10px] tracking-wider uppercase transition-colors ${
                  executionMode ? 'border-subtle text-fg bg-surface' : 'border-border text-muted hover:text-fg'
                }`}
              >
                execution
              </button>
              <button onClick={closeTaskOverlay} className="text-muted hover:text-fg transition-colors text-sm ml-2">
                ✕
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <input
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') createTask()
              }}
              placeholder="add task..."
              className="flex-1 bg-bg border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-subtle"
            />
            <button
              onClick={createTask}
              className="w-9 h-9 rounded border border-border bg-bg text-dim hover:text-fg hover:border-subtle hover:bg-surface transition-colors"
              title="Add task"
            >
              +
            </button>
          </div>
        </div>

        {executionMode ? (
          <ExecutionBoard
            tasks={tasks}
            draggedTaskId={draggedTaskId}
            onDragStart={setDraggedTaskId}
            onMoveTask={moveTask}
            onOpenTask={setSelectedTaskId}
          />
        ) : (
          <div className="flex-1 overflow-auto px-6 py-4 space-y-1">
            {pending.length === 0 && completed.length === 0 && (
              <div className="text-xs text-subtle/40 text-center py-8">no tasks yet</div>
            )}

            {pending.map(task => {
              const origin = task.originNoteId ? getNote(task.originNoteId) : null

              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTaskId(task.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') setSelectedTaskId(task.id)
                  }}
                  className="group flex items-center gap-3 rounded px-2 py-2 hover:bg-surface/70 transition-colors cursor-pointer"
                >
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      completeTask(task.id)
                    }}
                    className="w-4 h-4 border border-subtle rounded-sm hover:border-dim transition-colors flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-fg text-left w-full leading-tight">
                      {task.name}
                    </div>
                    {origin && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          openNote(origin.id)
                          closeTaskOverlay()
                        }}
                        className="text-[10px] text-subtle hover:text-dim transition-colors flex items-center gap-1"
                      >
                        <ArrowIcon variant="arrow" className="w-3 h-3 shrink-0" />
                        <span className="truncate">{origin.title}</span>
                      </button>
                    )}
                  </div>
                  <ArrowIcon className="w-3 h-3 text-subtle opacity-35 group-hover:opacity-100 transition-opacity" />
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      if (selectedTaskId === task.id) setSelectedTaskId(null)
                      deleteTask(task.id)
                    }}
                    className="text-[10px] text-subtle hover:text-dim opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ✕
                  </button>
                </div>
              )
            })}

            {completed.length > 0 && (
              <div className="pt-4 mt-4 border-t border-border">
                <div className="text-[10px] text-subtle tracking-wider uppercase mb-2">
                  completed ({completed.length})
                </div>
                {completed.map(task => (
                  <div
                    key={task.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedTaskId(task.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') setSelectedTaskId(task.id)
                    }}
                    className="flex items-center gap-3 rounded px-2 py-2 hover:bg-surface/70 transition-colors cursor-pointer group"
                  >
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        uncompleteTask(task.id)
                      }}
                      className="w-4 h-4 border border-subtle bg-subtle/30 rounded-sm flex-shrink-0 flex items-center justify-center text-[8px] text-subtle"
                    >
                      ✓
                    </button>
                    <div className="flex-1 min-w-0 text-xs text-subtle line-through leading-tight">
                      {task.name}
                    </div>
                    <ArrowIcon className="w-3 h-3 text-subtle opacity-35 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {selectedTask && (
          <TaskDetailOverlay
            task={selectedTask}
            onClose={() => setSelectedTaskId(null)}
            onDescriptionChange={description => updateTaskDescription(selectedTask.id, description)}
            onAddSubtask={() => createSubtask(selectedTask.id)}
            onToggleSubtask={subtaskId => completeSubtask(selectedTask.id, subtaskId)}
            onDeleteSubtask={subtaskId => deleteSubtask(selectedTask.id, subtaskId)}
            newSubtaskName={newSubtaskName}
            onNewSubtaskNameChange={setNewSubtaskName}
            onAddLink={() => createTaskLink(selectedTask.id)}
            onDeleteLink={linkId => deleteTaskLink(selectedTask.id, linkId)}
            newLinkUrl={newLinkUrl}
            onNewLinkUrlChange={setNewLinkUrl}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface ExecutionBoardProps {
  tasks: Task[]
  draggedTaskId: string | null
  onDragStart: (taskId: string | null) => void
  onMoveTask: (taskId: string, status: TaskStatus) => void
  onOpenTask: (taskId: string) => void
}

const executionColumns: { status: TaskStatus; title: string }[] = [
  { status: 'todo', title: 'to-do' },
  { status: 'doing', title: 'doing' },
  { status: 'done', title: 'done' }
]

function ExecutionBoard({ tasks, draggedTaskId, onDragStart, onMoveTask, onOpenTask }: ExecutionBoardProps) {
  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid min-h-[360px] grid-cols-3 gap-4">
        {executionColumns.map(column => {
          const columnTasks = tasks.filter(task => getTaskStatus(task) === column.status)

          return (
            <div
              key={column.status}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId
                if (taskId) onMoveTask(taskId, column.status)
              }}
              className={`flex min-h-[360px] flex-col rounded border border-border bg-surface/35 transition-colors ${
                draggedTaskId ? 'border-subtle bg-surface/70' : ''
              }`}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <div className="text-[10px] text-muted tracking-wider uppercase">{column.title}</div>
                <div className="text-[10px] text-subtle">{columnTasks.length}</div>
              </div>

              <div className="flex-1 space-y-2 p-3">
                {columnTasks.map(task => {
                  const done = getTaskStatus(task) === 'done'
                  const subtasksCount = (task.subtasks || []).length
                  const linksCount = (task.links || []).length

                  return (
                    <div
                      key={task.id}
                      role="button"
                      tabIndex={0}
                      draggable
                      onClick={() => onOpenTask(task.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') onOpenTask(task.id)
                      }}
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', task.id)
                        e.dataTransfer.effectAllowed = 'move'
                        onDragStart(task.id)
                      }}
                      onDragEnd={() => onDragStart(null)}
                      className="group rounded border border-border bg-bg px-3 py-2 text-left shadow-sm hover:border-subtle hover:bg-bg transition-colors cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 min-w-0 text-xs leading-snug ${done ? 'text-subtle line-through' : 'text-fg'}`}>
                          {task.name}
                        </div>
                        <ArrowIcon className="w-3 h-3 text-subtle opacity-35 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {(subtasksCount > 0 || linksCount > 0) && (
                        <div className="mt-2 flex items-center gap-3 text-[10px] text-subtle">
                          {subtasksCount > 0 && <span>{subtasksCount} subtasks</span>}
                          {linksCount > 0 && <span>{linksCount} links</span>}
                        </div>
                      )}
                    </div>
                  )
                })}

                {columnTasks.length === 0 && (
                  <div className="flex h-24 items-center justify-center rounded border border-dashed border-border text-xs text-subtle/60">
                    drop tasks here
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getTaskStatus(task: Task): TaskStatus {
  if (task.completedAt || task.status === 'done') return 'done'
  if (task.status === 'doing') return 'doing'
  return 'todo'
}

interface TaskDetailOverlayProps {
  task: Task
  onClose: () => void
  onDescriptionChange: (description: string) => void
  onAddSubtask: () => void
  onToggleSubtask: (subtaskId: string) => void
  onDeleteSubtask: (subtaskId: string) => void
  newSubtaskName: string
  onNewSubtaskNameChange: (value: string) => void
  onAddLink: () => void
  onDeleteLink: (linkId: string) => void
  newLinkUrl: string
  onNewLinkUrlChange: (value: string) => void
}

function TaskDetailOverlay({
  task,
  onClose,
  onDescriptionChange,
  onAddSubtask,
  onToggleSubtask,
  onDeleteSubtask,
  newSubtaskName,
  onNewSubtaskNameChange,
  onAddLink,
  onDeleteLink,
  newLinkUrl,
  onNewLinkUrlChange
}: TaskDetailOverlayProps) {
  const subtasks = task.subtasks || []
  const links = task.links || []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] flex items-center justify-center px-6"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={spring}
        className="w-full max-w-xl max-h-[76vh] bg-bg border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] text-muted tracking-widest uppercase mb-1">task</div>
            <div className="text-base text-fg font-medium truncate">{task.name}</div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-fg transition-colors text-sm">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5 space-y-6">
          <div>
            <div className="text-[10px] text-muted tracking-wider uppercase mb-2">description</div>
            <textarea
              value={task.description || ''}
              onChange={e => onDescriptionChange(e.target.value)}
              placeholder="description..."
              className="w-full min-h-24 bg-bg border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-subtle"
            />
          </div>

          <div>
            <div className="text-[10px] text-muted tracking-wider uppercase mb-2">subtasks</div>
            <div className="space-y-1">
              {subtasks.map(subtask => (
                <div key={subtask.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => onToggleSubtask(subtask.id)}
                    className={`w-3.5 h-3.5 border rounded-sm flex-shrink-0 transition-colors ${
                      subtask.completedAt ? 'bg-subtle border-subtle' : 'border-subtle hover:border-dim'
                    }`}
                  />
                  <span className={`flex-1 text-xs ${subtask.completedAt ? 'text-subtle line-through' : 'text-fg'}`}>
                    {subtask.name}
                  </span>
                  <button
                    onClick={() => onDeleteSubtask(subtask.id)}
                    className="text-[10px] text-subtle hover:text-dim opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {subtasks.length === 0 && (
                <div className="text-xs text-subtle/50 py-1">no subtasks yet</div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={newSubtaskName}
                onChange={e => onNewSubtaskNameChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onAddSubtask()
                }}
                placeholder="add subtask..."
                className="flex-1 bg-bg border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-subtle"
              />
              <button
                onClick={onAddSubtask}
                className="w-9 h-9 rounded border border-border text-dim hover:text-fg hover:bg-surface transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <div>
            <div className="text-[10px] text-muted tracking-wider uppercase mb-2">links</div>
            <div className="space-y-1">
              {links.map(link => (
                <div key={link.id} className="flex items-center gap-2 group">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 min-w-0 text-xs text-dim hover:text-fg truncate"
                  >
                    {link.title}
                  </a>
                  <button
                    onClick={() => onDeleteLink(link.id)}
                    className="text-[10px] text-subtle hover:text-dim opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {links.length === 0 && (
                <div className="text-xs text-subtle/50 py-1">no links yet</div>
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={newLinkUrl}
                onChange={e => onNewLinkUrlChange(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onAddLink()
                }}
                placeholder="add link..."
                className="flex-1 bg-bg border border-border rounded px-3 py-2 text-xs text-fg placeholder:text-subtle"
              />
              <button
                onClick={onAddLink}
                className="w-9 h-9 rounded border border-border text-dim hover:text-fg hover:bg-surface transition-colors"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
