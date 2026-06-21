import { useEventsStore } from '../store/events'
import { useNotesStore } from '../store/notes'
import { useTasksStore } from '../store/tasks'
import { useUIStore } from '../store/ui'
import { useGitHubStore } from '../store/github'

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
  useGitHubStore.setState({
    status: {
      authenticated: false,
      login: null,
      repoName: 'handin-notes',
      repoUrl: null,
      syncState: 'idle',
      lastSyncedAt: null,
      error: null
    },
    checking: true,
    signingIn: false,
    loginStart: null
  })
}
