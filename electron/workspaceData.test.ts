import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { emptyWorkspaceData, readWorkspaceData, writeWorkspaceData } from './workspaceData'

const directories: string[] = []

function temporaryDirectory() {
  const directory = mkdtempSync(join(tmpdir(), 'handin-workspace-'))
  directories.push(directory)
  return directory
}

afterEach(() => {
  directories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true }))
})

describe('workspace data', () => {
  it('round-trips task and calendar state', () => {
    const directory = temporaryDirectory()
    writeWorkspaceData(directory, emptyWorkspaceData)
    expect(readWorkspaceData(directory)).toEqual(emptyWorkspaceData)
  })

  it('returns null before workspace data exists', () => {
    expect(readWorkspaceData(temporaryDirectory())).toBeNull()
  })

  it('rejects malformed workspace data', () => {
    const directory = temporaryDirectory()
    writeFileSync(join(directory, 'workspace.json'), '{"version":1}')
    expect(() => readWorkspaceData(directory)).toThrow('Invalid workspace data')
  })
})
