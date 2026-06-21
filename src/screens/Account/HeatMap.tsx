import { useMemo } from 'react'
import { subDays, format, startOfDay, isSameDay } from 'date-fns'
import { useTasksStore } from '../../store/tasks'
import { useNotesStore } from '../../store/notes'

export default function HeatMap() {
  const completedDates = useTasksStore(s => s.getAllCompletedDates())
  const notes = useNotesStore(s => s.notes)

  const { cells, maxCount, stats } = useMemo(() => {
    const today = startOfDay(new Date())
    const days = 140
    const cells: { date: Date; count: number }[] = []

    const allDates = [
      ...completedDates,
      ...notes.map(n => n.createdAt),
      ...notes.map(n => n.updatedAt)
    ]

    let totalCompleted = completedDates.length
    let maxCount = 0
    let currentStreak = 0
    let streakCounting = true

    for (let i = days - 1; i >= 0; i--) {
      const day = subDays(today, i)
      const count = allDates.filter(d => isSameDay(new Date(d), day)).length
      cells.push({ date: day, count })
      maxCount = Math.max(maxCount, count)
    }

    for (let i = cells.length - 1; i >= 0; i--) {
      if (streakCounting && cells[i].count > 0) {
        currentStreak++
      } else if (streakCounting && i < cells.length - 1) {
        streakCounting = false
      }
    }

    return {
      cells,
      maxCount,
      stats: {
        totalNotes: notes.filter(n => !n.isScratch).length,
        totalCompleted,
        streak: currentStreak
      }
    }
  }, [completedDates, notes])

  const weeks = useMemo(() => {
    const w: { date: Date; count: number }[][] = []
    for (let i = 0; i < cells.length; i += 7) {
      w.push(cells.slice(i, i + 7))
    }
    return w
  }, [cells])

  const getOpacity = (count: number) => {
    if (count === 0) return 0.05
    if (maxCount === 0) return 0.05
    return 0.15 + (count / maxCount) * 0.85
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-1 overflow-x-auto pb-2">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => (
              <div
                key={di}
                title={`${format(day.date, 'MMM d')} — ${day.count} activities`}
                className="w-2.5 h-2.5 rounded-[2px] bg-fg transition-opacity"
                style={{ opacity: getOpacity(day.count) }}
              />
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-8">
        <div>
          <div className="text-lg text-fg">{stats.totalNotes}</div>
          <div className="text-[10px] text-muted tracking-wider uppercase">notes</div>
        </div>
        <div>
          <div className="text-lg text-fg">{stats.totalCompleted}</div>
          <div className="text-[10px] text-muted tracking-wider uppercase">completed</div>
        </div>
        <div>
          <div className="text-lg text-fg">{stats.streak}</div>
          <div className="text-[10px] text-muted tracking-wider uppercase">day streak</div>
        </div>
      </div>
    </div>
  )
}
