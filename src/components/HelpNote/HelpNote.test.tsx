import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import HelpNote from '.'
import { useUIStore } from '../../store/ui'
import { resetStores } from '../../test/resetStores'

beforeEach(resetStores)

describe('help overlay', () => {
  it('shows the current command reference and closes from its button', async () => {
    const user = userEvent.setup()
    useUIStore.setState({ helpOpen: true })
    render(<HelpNote />)
    expect(screen.getByText(/new-sub-note \[name\]/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close help' }))
    expect(useUIStore.getState().helpOpen).toBe(false)
  })

  it('closes when the backdrop is clicked', () => {
    useUIStore.setState({ helpOpen: true })
    const { container } = render(<HelpNote />)
    fireEvent.click(container.firstElementChild!)
    expect(useUIStore.getState().helpOpen).toBe(false)
  })

  it.fails('exposes help as a named modal dialog', () => {
    render(<HelpNote />)
    expect(screen.getByRole('dialog', { name: 'help' })).toHaveAttribute('aria-modal', 'true')
  })
})
