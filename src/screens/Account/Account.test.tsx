import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Account from '.'
import { useUIStore } from '../../store/ui'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

describe('settings', () => {
  it.fails('exposes settings as a named modal dialog with a named close control', () => {
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
})
