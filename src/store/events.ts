import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CalendarEvent, TaskLink } from '../lib/types'

interface EventsState {
  events: CalendarEvent[]
  addEvent: (event: {
    name: string
    description: string
    date: number
    time: string
    reminder: string
    links: TaskLink[]
  }) => CalendarEvent
  deleteEvent: (id: string) => void
  getEventsByDay: (date: number) => CalendarEvent[]
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set, get) => ({
      events: [],

      addEvent: (event) => {
        const next: CalendarEvent = {
          id: crypto.randomUUID(),
          ...event,
          createdAt: Date.now()
        }
        set(s => ({ events: [...s.events, next] }))
        return next
      },

      deleteEvent: (id) => {
        set(s => ({ events: s.events.filter(event => event.id !== id) }))
      },

      getEventsByDay: (date) => {
        const d = new Date(date)
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
        const end = start + 86400000
        return get().events
          .filter(event => event.date >= start && event.date < end)
          .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
      }
    }),
    { name: 'handin-events' }
  )
)
