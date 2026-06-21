import { existsSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { WorkspaceData } from '../src/lib/github'

export const emptyWorkspaceData: WorkspaceData = {
  version: 1,
  taskLists: [],
  tasks: [],
  events: []
}

export function readWorkspaceData(directory: string): WorkspaceData | null {
  const path = join(directory, 'workspace.json')
  if (!existsSync(path)) return null
  const value = JSON.parse(readFileSync(path, 'utf-8')) as Partial<WorkspaceData>
  if (value.version !== 1 || !Array.isArray(value.taskLists) || !Array.isArray(value.tasks) || !Array.isArray(value.events)) {
    throw new Error('Invalid workspace data')
  }
  return value as WorkspaceData
}

export function writeWorkspaceData(directory: string, data: WorkspaceData) {
  const target = join(directory, 'workspace.json')
  const temporary = `${target}.tmp`
  writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, 'utf-8')
  renameSync(temporary, target)
}
