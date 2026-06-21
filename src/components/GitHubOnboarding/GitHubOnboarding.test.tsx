import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GitHubOnboarding from '.'
import { useGitHubStore } from '../../store/github'
import { resetStores } from '../../test/resetStores'

beforeEach(() => {
  resetStores()
  useGitHubStore.setState({ checking: false })
})

describe('GitHub onboarding', () => {
  it('shows the device code while authorization is pending', async () => {
    const user = userEvent.setup()
    let finishLogin: (value: unknown) => void = () => undefined
    const complete = new Promise(resolve => { finishLogin = resolve })
    window.api = {
      writeNote: vi.fn(),
      readNotes: vi.fn(),
      deleteNote: vi.fn(),
      deleteLegacyNote: vi.fn(),
      startGitHubLogin: vi.fn().mockResolvedValue({
        sessionId: 'session',
        userCode: 'ABCD-EFGH',
        verificationUri: 'https://github.com/login/device',
        expiresAt: Date.now() + 900000
      }),
      completeGitHubLogin: vi.fn().mockReturnValue(complete)
    }
    render(<GitHubOnboarding />)
    await user.click(screen.getByRole('button', { name: 'sign in with GitHub' }))
    expect(await screen.findByText('ABCD-EFGH')).toBeInTheDocument()
    expect(screen.getByText('Waiting for authorization in your browser...')).toBeInTheDocument()
    finishLogin({
      authenticated: true,
      login: 'chinmay3',
      repoName: 'handin-notes',
      repoUrl: 'https://github.com/chinmay3/handin-notes.git',
      syncState: 'success',
      lastSyncedAt: Date.now(),
      error: null,
      updatedFromRemote: false
    })
    await waitFor(() => expect(useGitHubStore.getState().status.authenticated).toBe(true))
  })

  it('does not provide access without authentication', () => {
    render(<GitHubOnboarding />)
    expect(screen.queryByRole('button', { name: /offline/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'sign in with GitHub' })).toBeInTheDocument()
  })
})
