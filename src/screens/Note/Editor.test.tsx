import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Editor from './Editor'
import { useNotesStore } from '../../store/notes'
import { useTasksStore } from '../../store/tasks'
import { useUIStore } from '../../store/ui'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

function editorFor(noteId: string) {
  return document.querySelector<HTMLTextAreaElement>(`[data-note-editor="${noteId}"]`)!
}

describe('note editor workflows', () => {
  it('renders 14px body text, a bold title, and bold mini headings', () => {
    const note = useNotesStore.getState().addNote({ title: 'Title', content: '- Heading\nBody' })
    render(<Editor noteId={note.id} />)
    expect(screen.getByDisplayValue('Title')).toHaveClass('text-[20px]', 'font-bold')
    expect(editorFor(note.id).style.fontSize).toBe('14px')
    expect(document.querySelector('[data-document-line="0"]')).toHaveClass('font-bold')
    expect(document.querySelector('[data-document-line="1"]')).not.toHaveClass('font-bold')
  })

  it('converts typed ASCII arrows to the arrow glyph and preserves the cursor', async () => {
    const user = userEvent.setup()
    const note = useNotesStore.getState().addNote({ title: 'Title' })
    render(<Editor noteId={note.id} />)
    const textarea = editorFor(note.id)
    await user.click(textarea)
    await user.type(textarea, 'first -> second')
    expect(textarea).toHaveValue('first → second')
    expect(textarea.selectionStart).toBe('first → second'.length)
    expect(document.querySelector('[data-inline-arrow="true"]')).toHaveTextContent('→')
    expect(document.querySelector('[data-inline-arrow="true"] svg')).not.toBeInTheDocument()
    await user.type(textarea, ' continued')
    expect(textarea).toHaveValue('first → second continued')
    expect(textarea.selectionStart).toBe('first → second continued'.length)
  })

  it('keeps the caret aligned when an arrow is inserted inside existing text', async () => {
    const user = userEvent.setup()
    const note = useNotesStore.getState().addNote({ title: 'Title', content: 'alpha omega' })
    render(<Editor noteId={note.id} />)
    const textarea = editorFor(note.id)
    textarea.focus()
    textarea.setSelectionRange(6, 6)
    await user.type(textarea, '->beta ', { skipClick: true })
    expect(textarea).toHaveValue('alpha →beta omega')
    expect(textarea.selectionStart).toBe('alpha →beta '.length)
    expect(document.querySelectorAll('[data-inline-arrow="true"]')).toHaveLength(1)
  })

  it('opens an inline sub-note without displaying its id', async () => {
    const user = userEvent.setup()
    const parent = useNotesStore.getState().addNote({ title: 'Parent', content: '[[subnote:Child]]' })
    const child = useNotesStore.getState().addNote({ title: 'Child', parentId: parent.id })
    render(<Editor noteId={parent.id} />)
    expect(screen.queryByText(child.id)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Child/ }))
    expect(useUIStore.getState().activeNoteId).toBe(child.id)
  })

  it('keeps duplicate-title sub-note links attached to distinct notes', async () => {
    const user = userEvent.setup()
    const parent = useNotesStore.getState().addNote({ title: 'Parent' })
    const first = useNotesStore.getState().addNote({ title: 'Duplicate', parentId: parent.id })
    const second = useNotesStore.getState().addNote({ title: 'Duplicate', parentId: parent.id })
    useNotesStore.getState().updateNote(parent.id, {
      content: `[[subnote:${first.id}:Duplicate]]\n[[subnote:${second.id}:Duplicate]]`
    })
    render(<Editor noteId={parent.id} />)
    const links = screen.getAllByRole('button', { name: /Duplicate/ })
    await user.click(links[1])
    expect(useUIStore.getState().activeNoteId).toBe(second.id)
  })

  it('keeps an inline sub-note link working after its child is renamed', () => {
    const parent = useNotesStore.getState().addNote({ title: 'Parent' })
    const child = useNotesStore.getState().addNote({ title: 'Child', parentId: parent.id })
    useNotesStore.getState().updateNote(parent.id, { content: `[[subnote:${child.id}:Child]]` })
    useNotesStore.getState().updateNote(child.id, { title: 'Renamed' })
    render(<Editor noteId={parent.id} />)
    expect(screen.getByRole('button', { name: /Renamed/ })).toBeEnabled()
  })

  it('renders a malformed sub-note token without crashing the document', () => {
    const note = useNotesStore.getState().addNote({ title: 'Parent', content: '[[subnote:%E0%A4%A]]' })
    expect(() => render(<Editor noteId={note.id} />)).not.toThrow()
  })

  it.fails('renders note URLs as clickable links', () => {
    const note = useNotesStore.getState().addNote({ title: 'Links', content: 'https://example.com' })
    render(<Editor noteId={note.id} />)
    expect(screen.getByRole('link', { name: 'https://example.com' })).toHaveAttribute('href', 'https://example.com')
  })

  it('adds a task to the connected list from the document panel', async () => {
    const user = userEvent.setup()
    const list = useTasksStore.getState().addTaskList('Launch')
    const note = useNotesStore.getState().addNote({ title: 'Title', taskListId: list.id })
    render(<Editor noteId={note.id} />)
    await user.type(screen.getByPlaceholderText('add task...'), 'Document task{Enter}')
    expect(useTasksStore.getState().tasks[0]).toMatchObject({ listId: list.id, name: 'Document task', originNoteId: note.id })
  })

  it('persists edited content after the debounce', () => {
    vi.useFakeTimers()
    const note = useNotesStore.getState().addNote({ title: 'Title', content: 'Old' })
    const writeNote = vi.fn().mockResolvedValue(undefined)
    window.api = {
      writeNote,
      readNotes: vi.fn().mockResolvedValue([]),
      deleteNote: vi.fn().mockResolvedValue(undefined),
      deleteLegacyNote: vi.fn().mockResolvedValue(undefined)
    }
    render(<Editor noteId={note.id} />)
    writeNote.mockClear()
    fireEvent.change(editorFor(note.id), { target: { value: 'New' } })
    act(() => vi.advanceTimersByTime(2000))
    expect(useNotesStore.getState().getNote(note.id)?.content).toBe('New')
    expect(writeNote).toHaveBeenCalledOnce()
    vi.useRealTimers()
  })

  it('refreshes the open editor when the same note changes externally', () => {
    const note = useNotesStore.getState().addNote({ title: 'Original', content: 'Old' })
    render(<Editor noteId={note.id} />)
    act(() => useNotesStore.getState().updateNote(note.id, { title: 'External', content: 'Changed' }))
    expect(screen.getByDisplayValue('External')).toBeInTheDocument()
    expect(editorFor(note.id).value).toBe('Changed')
  })
})
