import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { format } from 'date-fns'
import Calendar from './Calendar'
import { useEventsStore } from '../../store/events'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

function selectCurrentDay() {
  const day = new Date()
  fireEvent.click(screen.getByRole('button', { name: format(day, 'MMMM d, yyyy') }))
  return day
}

describe('calendar workflows', () => {
  it('changes displayed months', async () => {
    const user = userEvent.setup()
    const now = new Date()
    render(<Calendar />)
    expect(screen.getByText(format(now, 'MMMM yyyy'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByText(format(new Date(now.getFullYear(), now.getMonth() + 1), 'MMMM yyyy'))).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText(format(now, 'MMMM yyyy'))).toBeInTheDocument()
  })

  it('requires an event name', async () => {
    const user = userEvent.setup()
    render(<Calendar />)
    selectCurrentDay()
    await user.click(screen.getByRole('button', { name: 'Add event' }))
    await user.click(screen.getByRole('button', { name: /^add event$/ }))
    expect(screen.getByText('event name required')).toBeInTheDocument()
    expect(useEventsStore.getState().events).toEqual([])
  })

  it('adds a complete event and normalizes its link', async () => {
    const user = userEvent.setup()
    render(<Calendar />)
    const selected = selectCurrentDay()
    await user.click(screen.getByRole('button', { name: 'Add event' }))
    await user.type(screen.getByPlaceholderText('event name...'), 'Planning')
    await user.type(screen.getByPlaceholderText('description...'), 'Prepare agenda')
    fireEvent.change(screen.getByLabelText('Event time'), { target: { value: '09:30' } })
    await user.selectOptions(screen.getByLabelText('Event reminder'), '1 hour before')
    await user.type(screen.getByPlaceholderText('link...'), 'example.com')
    await user.click(screen.getByRole('button', { name: /^add event$/ }))

    expect(useEventsStore.getState().events[0]).toMatchObject({
      name: 'Planning',
      description: 'Prepare agenda',
      date: new Date(selected.getFullYear(), selected.getMonth(), selected.getDate()).getTime(),
      time: '09:30',
      reminder: '1 hour before',
      links: [{ url: 'https://example.com', title: 'example.com' }]
    })
    expect(screen.getByText('Planning')).toBeInTheDocument()
  })

  it('edits and moves an event to another date', async () => {
    const user = userEvent.setup()
    const selected = new Date()
    const event = useEventsStore.getState().addEvent({
      name: 'Original',
      description: '',
      date: new Date(selected.getFullYear(), selected.getMonth(), selected.getDate()).getTime(),
      time: '',
      reminder: '',
      links: []
    })
    render(<Calendar />)
    selectCurrentDay()
    await user.click(screen.getByRole('button', { name: 'Edit Original' }))
    const name = screen.getByPlaceholderText('event name...')
    await user.clear(name)
    await user.type(name, 'Updated')
    const next = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + 1)
    fireEvent.change(screen.getByLabelText('Event date'), { target: { value: format(next, 'yyyy-MM-dd') } })
    await user.click(screen.getByRole('button', { name: 'save event' }))

    expect(useEventsStore.getState().events).toHaveLength(1)
    expect(useEventsStore.getState().events[0]).toMatchObject({
      id: event.id,
      name: 'Updated',
      date: new Date(next.getFullYear(), next.getMonth(), next.getDate()).getTime()
    })
  })

  it('deletes an event', async () => {
    const user = userEvent.setup()
    const selected = new Date()
    useEventsStore.getState().addEvent({
      name: 'Remove me',
      description: '',
      date: new Date(selected.getFullYear(), selected.getMonth(), selected.getDate()).getTime(),
      time: '',
      reminder: '',
      links: []
    })
    render(<Calendar />)
    selectCurrentDay()
    await user.click(screen.getByRole('button', { name: 'Delete Remove me' }))
    expect(useEventsStore.getState().events).toEqual([])
  })

  it('sorts timed events before untimed events', () => {
    const selected = new Date()
    const date = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate()).getTime()
    useEventsStore.getState().addEvent({ name: 'Untimed', description: '', date, time: '', reminder: '', links: [] })
    useEventsStore.getState().addEvent({ name: 'Timed', description: '', date, time: '08:00', reminder: '', links: [] })
    render(<Calendar />)
    selectCurrentDay()
    const names = screen.getAllByText(/Timed|Untimed/).map(node => node.textContent)
    expect(names).toEqual(['Timed', 'Untimed'])
  })
})
