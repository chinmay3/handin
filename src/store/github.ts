import { create } from 'zustand'
import type { GitHubLoginStart, GitHubStatus, GitHubSyncResult } from '../lib/github'

interface GitHubState {
  status: GitHubStatus
  checking: boolean
  signingIn: boolean
  loginStart: GitHubLoginStart | null
  initialize: () => Promise<void>
  login: () => Promise<void>
  sync: () => Promise<GitHubSyncResult | null>
  logout: () => Promise<void>
  applyStatus: (status: GitHubStatus) => void
}

const initialStatus: GitHubStatus = {
  authenticated: false,
  login: null,
  repoName: 'handin-notes',
  repoUrl: null,
  syncState: 'idle',
  lastSyncedAt: null,
  error: null
}

export const useGitHubStore = create<GitHubState>((set, get) => ({
  status: initialStatus,
  checking: true,
  signingIn: false,
  loginStart: null,

  initialize: async () => {
    if (!window.api?.getGitHubStatus) {
      set({ checking: false, status: { ...get().status, error: 'GitHub authentication is unavailable' } })
      return
    }
    try {
      const status = await window.api.getGitHubStatus()
      set({ status, checking: false })
    } catch (error) {
      set({
        checking: false,
        status: { ...get().status, error: error instanceof Error ? error.message : 'Could not check GitHub' }
      })
    }
  },

  login: async () => {
    if (!window.api?.startGitHubLogin || !window.api.completeGitHubLogin) return
    set({ signingIn: true, loginStart: null, status: { ...get().status, error: null } })
    try {
      const loginStart = await window.api.startGitHubLogin()
      set({ loginStart })
      const status = await window.api.completeGitHubLogin(loginStart.sessionId)
      set({ status, signingIn: false, loginStart: null })
    } catch (error) {
      set({
        signingIn: false,
        loginStart: null,
        status: { ...get().status, error: error instanceof Error ? error.message : 'GitHub sign in failed' }
      })
    }
  },

  sync: async () => {
    if (!window.api?.syncGitHub) return null
    set({ status: { ...get().status, syncState: 'syncing', error: null } })
    try {
      const status = await window.api.syncGitHub()
      set({ status })
      return status
    } catch (error) {
      set({
        status: {
          ...get().status,
          syncState: 'error',
          error: error instanceof Error ? error.message : 'GitHub sync failed'
        }
      })
      return null
    }
  },

  logout: async () => {
    if (window.api?.logoutGitHub) await window.api.logoutGitHub()
    set({ status: initialStatus, signingIn: false, loginStart: null })
  },

  applyStatus: status => set({ status })
}))
