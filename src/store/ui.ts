import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Screen } from '../lib/types'

interface UIState {
  sidebarOpen: boolean
  activeScreen: Screen
  activeNoteId: string | null
  noteHistory: string[]
  taskOverlayListId: string | null
  commandPaletteOpen: boolean
  helpOpen: boolean
  historyVisible: boolean
  searchFocused: boolean
  graphOpen: boolean
  accountOpen: boolean
  rightPanelOpen: boolean
  quotesEnabled: boolean
  darkMode: boolean
  sidebarProjectsVisible: boolean
  sidebarTaskListsVisible: boolean

  toggleSidebar: () => void
  toggleRightPanel: () => void
  setSidebarOpen: (open: boolean) => void
  openNote: (id: string) => void
  goBack: () => void
  goHome: () => void
  openTaskOverlay: (listId: string) => void
  closeTaskOverlay: () => void
  setCommandPaletteOpen: (open: boolean) => void
  toggleHelp: () => void
  toggleHistory: () => void
  setSearchFocused: (focused: boolean) => void
  toggleGraph: () => void
  toggleAccount: () => void
  toggleQuotes: () => void
  toggleDarkMode: () => void
  toggleSidebarLists: () => void
  toggleSidebarProjects: () => void
  toggleSidebarTaskLists: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      sidebarOpen: true,
      activeScreen: 'home' as Screen,
      activeNoteId: null,
      noteHistory: [],
      taskOverlayListId: null,
      commandPaletteOpen: false,
      helpOpen: false,
      historyVisible: false,
      searchFocused: false,
      graphOpen: false,
      accountOpen: false,
      rightPanelOpen: true,
      quotesEnabled: true,
      darkMode: false,
      sidebarProjectsVisible: true,
      sidebarTaskListsVisible: true,

      toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
      toggleRightPanel: () => set(s => ({ rightPanelOpen: !s.rightPanelOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      openNote: (id) => {
        const { activeNoteId, noteHistory } = get()
        const newHistory = activeNoteId
          ? [...noteHistory, activeNoteId]
          : noteHistory
        set({
          activeScreen: 'note',
          activeNoteId: id,
          noteHistory: newHistory,
          graphOpen: false,
          accountOpen: false
        })
      },

      goBack: () => {
        const { noteHistory } = get()
        if (noteHistory.length > 0) {
          const prev = noteHistory[noteHistory.length - 1]
          set({
            activeNoteId: prev,
            noteHistory: noteHistory.slice(0, -1)
          })
        } else {
          set({ activeScreen: 'home', activeNoteId: null })
        }
      },

      goHome: () => set({
        activeScreen: 'home',
        activeNoteId: null,
        noteHistory: [],
        graphOpen: false,
        accountOpen: false
      }),

      openTaskOverlay: (listId) => set({ taskOverlayListId: listId }),
      closeTaskOverlay: () => set({ taskOverlayListId: null }),
      setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
      toggleHelp: () => set(s => ({ helpOpen: !s.helpOpen })),
      toggleHistory: () => set(s => ({ historyVisible: !s.historyVisible })),
      setSearchFocused: (focused) => set({ searchFocused: focused }),
      toggleGraph: () => set(s => ({
        graphOpen: !s.graphOpen,
        accountOpen: false
      })),
      toggleAccount: () => set(s => ({
        accountOpen: !s.accountOpen,
        graphOpen: false
      })),
      toggleQuotes: () => set(s => ({ quotesEnabled: !s.quotesEnabled })),
      toggleDarkMode: () => set(s => ({ darkMode: !s.darkMode })),
      toggleSidebarLists: () => set(s => {
        const visible = !s.sidebarProjectsVisible && !s.sidebarTaskListsVisible
        return { sidebarProjectsVisible: visible, sidebarTaskListsVisible: visible }
      }),
      toggleSidebarProjects: () => set(s => ({ sidebarProjectsVisible: !s.sidebarProjectsVisible })),
      toggleSidebarTaskLists: () => set(s => ({ sidebarTaskListsVisible: !s.sidebarTaskListsVisible }))
    }),
    {
      name: 'handin-ui',
      version: 3,
      migrate: (persistedState, version) => {
        const state = persistedState as {
          quotesEnabled?: boolean
          darkMode?: boolean
          hideSidebarLists?: boolean
          sidebarProjectsVisible?: boolean
          sidebarTaskListsVisible?: boolean
        }
        const legacyVisible = !(state.hideSidebarLists ?? false)
        return {
          quotesEnabled: state.quotesEnabled ?? true,
          darkMode: version < 2 ? false : state.darkMode ?? false,
          sidebarProjectsVisible: state.sidebarProjectsVisible ?? legacyVisible,
          sidebarTaskListsVisible: state.sidebarTaskListsVisible ?? legacyVisible
        }
      },
      partialize: (state) => ({
        quotesEnabled: state.quotesEnabled,
        darkMode: state.darkMode,
        sidebarProjectsVisible: state.sidebarProjectsVisible,
        sidebarTaskListsVisible: state.sidebarTaskListsVisible
      })
    }
  )
)
