import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isToday, isSameDay, addMonths, subMonths
} from 'date-fns'
import { useEventsStore } from '../../store/events'
import { TaskLink } from '../../lib/types'
import { slideUp } from '../../lib/transitions'
import ArrowIcon from '../../components/ArrowIcon'

const reminderOptions = [
  { value: '', label: 'remind when?' },
  { value: '10 mins before', label: '10 mins before' },
  { value: '1 hour before', label: '1 hour before' },
  { value: '10 hours before', label: '10 hours before' },
  { value: '24 hours before', label: '24 hours before' },
  { value: '2 days before', label: '2 days before' }
]

export default function Calendar() {
  const [current, setCurrent] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const events = useEventsStore(s => s.events)
  const addEvent = useEventsStore(s => s.addEvent)
  const deleteEvent = useEventsStore(s => s.deleteEvent)

  const [newEventName, setNewEventName] = useState('')
  const [newEventDescription, setNewEventDescription] = useState('')
  const [newEventTime, setNewEventTime] = useState('')
  const [newEventReminder, setNewEventReminder] = useState('')
  const [newEventLink, setNewEventLink] = useState('')
  const [newEventLinks, setNewEventLinks] = useState<TaskLink[]>([])
  const [eventError, setEventError] = useState('')
  const [addingEvent, setAddingEvent] = useState(false)

  const days = useMemo(() => {
    const monthStart = startOfMonth(current)
    const monthEnd = endOfMonth(current)
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    return eachDayOfInterval({ start: calStart, end: calEnd })
  }, [current])

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return []
    return events
      .filter(event => isSameDay(new Date(event.date), selectedDate))
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'))
  }, [events, selectedDate])

  const resetEventDraft = () => {
    setNewEventName('')
    setNewEventDescription('')
    setNewEventTime('')
    setNewEventReminder('')
    setNewEventLink('')
    setNewEventLinks([])
    setEventError('')
  }

  const buildLink = (value: string): TaskLink => {
    const raw = value.trim()
    const url = /^https?:\/\//.test(raw) ? raw : `https://${raw}`
    const title = raw.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return { id: crypto.randomUUID(), url, title }
  }

  const addLink = () => {
    const raw = newEventLink.trim()
    if (!raw) return
    setNewEventLinks(links => [...links, buildLink(raw)])
    setNewEventLink('')
  }

  const handleAddEvent = () => {
    const name = newEventName.trim()
    if (!selectedDate) return
    if (!name) {
      setEventError('event name required')
      return
    }
    const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()).getTime()
    const links = newEventLink.trim()
      ? [...newEventLinks, buildLink(newEventLink)]
      : newEventLinks
    addEvent({
      name,
      description: newEventDescription.trim(),
      date,
      time: newEventTime,
      reminder: newEventReminder,
      links
    })
    resetEventDraft()
    setAddingEvent(false)
  }

  return (
    <motion.div {...slideUp} className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setCurrent(subMonths(current, 1))} className="text-muted hover:text-fg transition-colors px-2">
          <ArrowIcon direction="left" className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs text-dim tracking-widest uppercase">
          {format(current, 'MMMM yyyy')}
        </span>
        <button onClick={() => setCurrent(addMonths(current, 1))} className="text-muted hover:text-fg transition-colors px-2">
          <ArrowIcon direction="right" className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(d => (
          <div key={d} className="text-center text-[10px] text-muted pb-2">{d}</div>
        ))}
        {days.map(day => {
          const hasEvents = events.some(event => isSameDay(new Date(event.date), day))
          const selected = selectedDate && isSameDay(day, selectedDate)

          return (
            <button
              key={day.toISOString()}
              onClick={() => {
                setSelectedDate(selected ? null : day)
                setAddingEvent(false)
                resetEventDraft()
              }}
              className={`
                relative text-center py-1.5 text-xs transition-all rounded border
                ${hasEvents ? 'border-border bg-raised text-fg' : 'border-transparent'}
                ${!isSameMonth(day, current) ? 'text-subtle' : 'text-dim'}
                ${isToday(day) ? 'text-fg' : ''}
                ${selected ? 'bg-fg text-bg border-fg' : 'hover:bg-raised/50'}
              `}
            >
              {format(day, 'd')}
              {hasEvents && !selected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-muted" />
              )}
            </button>
          )
        })}
      </div>

      {selectedDate && (
        <motion.div {...slideUp} className="border border-border rounded p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] text-muted tracking-wider uppercase">
              {format(selectedDate, 'EEEE, MMM d')}
            </div>
            <button
              onClick={() => {
                setAddingEvent(open => !open)
                setEventError('')
              }}
              className="w-6 h-6 border border-border rounded text-dim hover:text-fg hover:bg-surface transition-colors"
              title="Add event"
            >
              +
            </button>
          </div>

          <div className="space-y-2">
            {selectedEvents.map(event => (
              <div key={event.id} className="group border border-border rounded p-2 bg-bg">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-fg truncate">{event.name}</div>
                    {(event.time || event.reminder) && (
                      <div className="text-[10px] text-subtle mt-0.5">
                        {event.time && <span>{event.time}</span>}
                        {event.time && event.reminder && <span> · </span>}
                        {event.reminder && <span>remind {event.reminder}</span>}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="text-[10px] text-subtle hover:text-dim opacity-0 group-hover:opacity-100 transition-all"
                  >
                    ✕
                  </button>
                </div>
                {event.description && (
                  <div className="text-[10px] text-muted mt-2 leading-relaxed">{event.description}</div>
                )}
                {(event.links || []).length > 0 && (
                  <div className="mt-2 space-y-1">
                    {(event.links || []).map(link => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-[10px] text-dim hover:text-fg truncate"
                      >
                        {link.title}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {selectedEvents.length === 0 && (
              <div className="text-[10px] text-subtle/50 text-center py-2">no events yet</div>
            )}
          </div>

          {addingEvent && (
            <div className="space-y-3 border-t border-border pt-3">
              <input
                value={newEventName}
                onChange={e => {
                  setNewEventName(e.target.value)
                  setEventError('')
                }}
                onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                placeholder="event name..."
                className="w-full bg-transparent text-xs text-fg placeholder:text-subtle border-b border-border pb-1"
              />

              {eventError && (
                <div className="text-[10px] text-muted">{eventError}</div>
              )}

              <textarea
                value={newEventDescription}
                onChange={e => setNewEventDescription(e.target.value)}
                placeholder="description..."
                className="w-full min-h-16 bg-transparent text-xs text-fg placeholder:text-subtle border-b border-border pb-1"
              />

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={newEventTime}
                  onChange={e => setNewEventTime(e.target.value)}
                  placeholder="time..."
                  className="w-full bg-transparent text-xs text-dim placeholder:text-subtle border-b border-border pb-1"
                />
                <select
                  value={newEventReminder}
                  onChange={e => setNewEventReminder(e.target.value)}
                  className="w-full bg-bg text-xs text-dim border border-border rounded px-2 py-1.5"
                >
                  {reminderOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                {newEventLinks.map(link => (
                  <div key={link.id} className="flex items-center gap-2 text-[10px] text-subtle">
                    <span className="flex-1 truncate">{link.title}</span>
                    <button
                      onClick={() => setNewEventLinks(links => links.filter(item => item.id !== link.id))}
                      className="hover:text-dim"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <input
                    value={newEventLink}
                    onChange={e => setNewEventLink(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') addLink()
                    }}
                    placeholder="link..."
                    className="flex-1 bg-bg text-xs text-dim placeholder:text-subtle border border-border rounded p-1.5 min-w-0"
                  />
                  <button
                    onClick={addLink}
                    className="w-7 h-7 border border-border rounded text-dim hover:text-fg hover:bg-surface transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <button
                onClick={handleAddEvent}
                className="w-full border border-border rounded py-1.5 text-xs text-dim hover:text-fg hover:bg-surface transition-colors"
              >
                add event
              </button>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  )
}
