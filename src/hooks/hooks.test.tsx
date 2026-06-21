import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useCommands } from './useCommands'
import { useResurfacing } from './useResurfacing'
import { useSearch } from './useSearch'
import { useNotesStore } from '../store/notes'
import { useTasksStore } from '../store/tasks'
import { resetStores } from '../test/resetStores'

beforeEach(resetStores)

describe('hooks', () => {
  it('filters commands by name and description', () => {
    const { result, rerender } = renderHook(({ query }) => useCommands(query), { initialProps: { query: 'toggle' } })
    expect(result.current.commands.map(command => command.name)).toEqual(['toggle-sidebar', 'toggle-calendar'])
    rerender({ query: 'temporary' })
    expect(result.current.commands.map(command => command.name)).toEqual(['scratch'])
  })

  it('searches note bodies and task names while excluding scratch notes', () => {
    useNotesStore.getState().addNote({ title: 'Architecture', content: 'database normalization' })
    useNotesStore.getState().addNote({ title: 'Secret scratch', content: 'database', isScratch: true })
    const list = useTasksStore.getState().addTaskList('List')
    useTasksStore.getState().addTask(list.id, 'Normalize schema')
    const { result } = renderHook(() => useSearch('normalize'))
    expect(result.current.map(item => item.title)).toEqual(['Normalize schema', 'Architecture'])
    expect(result.current.some(item => item.title === 'Secret scratch')).toBe(false)
  })

  it('returns no search results for blank queries', () => {
    useNotesStore.getState().addNote({ title: 'Note' })
    const { result } = renderHook(() => useSearch('   '))
    expect(result.current).toEqual([])
  })

  it('resurfaces a related non-scratch note', () => {
    const current = useNotesStore.getState().addNote({ title: 'Database indexes' })
    const related = useNotesStore.getState().addNote({ title: 'Index strategy', content: 'Database indexes improve lookup performance' })
    const { result } = renderHook(() => useResurfacing(current.id, current.title))
    expect(result.current?.noteId).toBe(related.id)
  })

  it('resurfaces an exact-title match', () => {
    const current = useNotesStore.getState().addNote({ title: 'Database indexes' })
    const related = useNotesStore.getState().addNote({ title: 'Database indexes', content: 'Older notes' })
    const { result } = renderHook(() => useResurfacing(current.id, current.title))
    expect(result.current?.noteId).toBe(related.id)
  })

  it('does not resurface scratch or empty notes', () => {
    const current = useNotesStore.getState().addNote({ title: 'Database indexes' })
    useNotesStore.getState().addNote({ title: 'Database indexes', content: 'scratch', isScratch: true })
    useNotesStore.getState().addNote({ title: 'Database indexes', content: '' })
    const { result } = renderHook(() => useResurfacing(current.id, current.title))
    expect(result.current).toBeNull()
  })
})
