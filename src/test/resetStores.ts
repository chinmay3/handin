import { useEventsStore } from '../store/events'
import { useNotesStore } from '../store/notes'
import { useTasksStore } from '../store/tasks'
import { useUIStore } from '../store/ui'

export function resetStores() {
  useNotesStore.setState({ notes: [] })
  useTasksStore.setState({ taskLists: [], tasks: [] })
  useEventsStore.setState({ events: [] })
  useUIStore.setState({
    sidebarOpen: true,
    activeScreen: 'home',
    activeNoteId: null,
    noteHistory: [],
    taskOverlayListId: null,
    taskOverlayTaskId: null,
    commandPaletteOpen: false,
    helpOpen: false,
    searchFocused: false,
    accountOpen: false,
    rightPanelOpen: true,
    quotesEnabled: true,
    darkMode: false,
    sidebarProjectsVisible: true,
    sidebarTaskListsVisible: true
  })
}
