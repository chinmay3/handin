import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GitHubSyncService } from './githubSync'

const directories: string[] = []

function makeService(fetchImpl: typeof fetch, verificationOpen = vi.fn()) {
  const directory = mkdtempSync(join(tmpdir(), 'handin-github-'))
  directories.push(directory)
  const authFile = join(directory, 'auth.bin')
  const service = new GitHubSyncService({
    clientId: 'client-id',
    repoName: 'handin-notes',
    directory: join(directory, 'workspace'),
    authFile,
    encryption: {
      available: () => true,
      encrypt: value => Buffer.from(value),
      decrypt: value => value.toString('utf-8')
    },
    openExternal: verificationOpen,
    fetchImpl
  })
  return { service, authFile }
}

afterEach(() => {
  directories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true }))
})

describe('GitHub sync authentication', () => {
  it('starts device flow and opens only the GitHub verification page', async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined)
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      device_code: 'device',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://github.com/login/device',
      expires_in: 900,
      interval: 5
    }), { status: 200 })) as unknown as typeof fetch
    const { service } = makeService(fetchImpl, openExternal)
    const result = await service.startLogin()
    expect(result).toMatchObject({ userCode: 'ABCD-EFGH', verificationUri: 'https://github.com/login/device' })
    expect(openExternal).toHaveBeenCalledWith('https://github.com/login/device')
  })

  it('rejects a non-GitHub verification page', async () => {
    const openExternal = vi.fn()
    const fetchImpl = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      device_code: 'device',
      user_code: 'ABCD-EFGH',
      verification_uri: 'https://example.com/login',
      expires_in: 900,
      interval: 5
    }), { status: 200 })) as unknown as typeof fetch
    const { service } = makeService(fetchImpl, openExternal)
    await expect(service.startLogin()).rejects.toThrow('invalid verification URL')
    expect(openExternal).not.toHaveBeenCalled()
  })

  it('reads encrypted login state and removes it on logout', async () => {
    const fetchImpl = vi.fn() as unknown as typeof fetch
    const { service, authFile } = makeService(fetchImpl)
    writeFileSync(authFile, JSON.stringify({
      accessToken: 'token',
      refreshToken: null,
      expiresAt: null,
      refreshTokenExpiresAt: null,
      login: 'chinmay3',
      userId: 1
    }))
    expect(service.getStatus()).toMatchObject({ authenticated: true, login: 'chinmay3' })
    await service.logout()
    expect(service.getStatus()).toMatchObject({ authenticated: false, login: null })
  })
})
