import { useMemo } from 'react'

export interface Command {
  name: string
  icon: string
  description: string
  usage: string
  context?: 'document'
}

const commands: Command[] = [
  { name: 'up', icon: '', description: 'Remember your place and go to the top of the document', usage: 'up', context: 'document' },
  { name: 'down', icon: '', description: 'Return to the place remembered by up', usage: 'down', context: 'document' },
  { name: 'new-sub-note', icon: '◈', description: 'Create a sub-note linked to this note', usage: 'new-sub-note [name]' },
  { name: 'add-task', icon: '▫', description: 'Add a task to this document’s connected list', usage: 'add-task [task]', context: 'document' },
  { name: 'scratch', icon: '◦', description: 'Open a temporary note that expires in 24 hours', usage: 'scratch' },
  { name: 'save', icon: '◉', description: 'Convert the current scratch note to permanent', usage: 'save' },
  { name: 'home', icon: '⌂', description: 'Go to the home page', usage: 'home' },
  { name: 'settings', icon: '◎', description: 'Open settings', usage: 'settings' },
  { name: 'toggle-sidebar', icon: '◫', description: 'Show or hide the sidebar', usage: 'toggle-sidebar' },
  { name: 'toggle-calendar', icon: '◴', description: 'Show or hide the calendar', usage: 'toggle-calendar' }
]

export function useCommands(filter: string) {
  const filtered = useMemo(() => {
    if (!filter) return commands
    const q = filter.toLowerCase()
    return commands.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    )
  }, [filter])

  return { commands: filtered, allCommands: commands }
}
