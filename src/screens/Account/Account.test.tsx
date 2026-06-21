import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Account from '.'
import { useUIStore } from '../../store/ui'
import { useGitHubStore } from '../../store/github'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

describe('settings', () => {
  it('exposes settings as a named modal dialog with a named close control', () => {
    render(<Account />)
    expect(screen.getByRole('dialog', { name: 'settings' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: 'Close settings' })).toBeInTheDocument()
  })

  it('toggles quotes and dark mode with pressed state', async () => {
    const user = userEvent.setup()
    render(<Account />)
    const quotes = screen.getByRole('button', { name: 'Writer quotes on home' })
    const dark = screen.getByRole('button', { name: 'Dark mode' })
    expect(quotes).toHaveAttribute('aria-pressed', 'true')
    expect(dark).toHaveAttribute('aria-pressed', 'false')
    await user.click(quotes)
    await user.click(dark)
    expect(useUIStore.getState()).toMatchObject({ quotesEnabled: false, darkMode: true })
  })

  it('hides and restores both sidebar sections', async () => {
    const user = userEvent.setup()
    render(<Account />)
    const control = screen.getByRole('button', { name: 'Hide sidebar lists' })
    await user.click(control)
    expect(useUIStore.getState()).toMatchObject({ sidebarProjectsVisible: false, sidebarTaskListsVisible: false })
    await user.click(control)
    expect(useUIStore.getState()).toMatchObject({ sidebarProjectsVisible: true, sidebarTaskListsVisible: true })
  })

  it('shows the connected repository and runs a manual sync', async () => {
    const user = userEvent.setup()
    const result = {
      authenticated: true,
      login: 'chinmay3',
      repoName: 'handin-notes',
      repoUrl: 'https://github.com/chinmay3/handin-notes.git',
      syncState: 'success' as const,
      lastSyncedAt: Date.now(),
      error: null,
      updatedFromRemote: false
    }
    const syncGitHub = vi.fn().mockResolvedValue(result)
    window.api = {
      writeNote: vi.fn(),
      readNotes: vi.fn(),
      deleteNote: vi.fn(),
      deleteLegacyNote: vi.fn(),
      syncGitHub
    }
    useGitHubStore.setState({ status: result })
    render(<Account />)
    expect(screen.getByRole('link', { name: 'handin-notes' })).toHaveAttribute('href', 'https://github.com/chinmay3/handin-notes')
    await user.click(screen.getByRole('button', { name: 'sync now' }))
    expect(syncGitHub).toHaveBeenCalledOnce()
  })
})
