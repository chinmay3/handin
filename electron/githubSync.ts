import fs, { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { createRequire } from 'module'
import type { GitHubLoginStart, GitHubStatus, GitHubSyncResult } from '../src/lib/github'

const require = createRequire(import.meta.url)
const git = require('isomorphic-git') as typeof import('isomorphic-git')
const http = require('isomorphic-git/http/node') as typeof import('isomorphic-git/http/node').default

interface StoredAuth {
  accessToken: string
  refreshToken: string | null
  expiresAt: number | null
  refreshTokenExpiresAt: number | null
  login: string
  userId: number
}

interface DeviceSession {
  deviceCode: string
  interval: number
  expiresAt: number
}

interface Encryption {
  available: () => boolean
  encrypt: (value: string) => Buffer
  decrypt: (value: Buffer) => string
}

interface GitHubSyncOptions {
  clientId: string
  repoName: string
  directory: string
  authFile: string
  encryption: Encryption
  openExternal: (url: string) => Promise<unknown>
  fetchImpl?: typeof fetch
  sleep?: (milliseconds: number) => Promise<void>
  now?: () => number
}

const apiHeaders = {
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'handin-desktop'
}

export class GitHubSyncService {
  private readonly sessions = new Map<string, DeviceSession>()
  private readonly fetchImpl: typeof fetch
  private readonly sleep: (milliseconds: number) => Promise<void>
  private readonly now: () => number
  private syncPromise: Promise<GitHubSyncResult> | null = null
  private syncTimer: ReturnType<typeof setTimeout> | null = null
  private state: GitHubStatus

  constructor(private readonly options: GitHubSyncOptions) {
    this.fetchImpl = options.fetchImpl || fetch
    this.sleep = options.sleep || (milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds)))
    this.now = options.now || Date.now
    this.state = {
      authenticated: false,
      login: null,
      repoName: options.repoName,
      repoUrl: null,
      syncState: 'idle',
      lastSyncedAt: null,
      error: null
    }
  }

  getStatus(): GitHubStatus {
    const auth = this.readAuth()
    this.state = {
      ...this.state,
      authenticated: Boolean(auth),
      login: auth?.login || null,
      repoUrl: auth ? this.repoUrl(auth.login) : null
    }
    return { ...this.state }
  }

  async startLogin(): Promise<GitHubLoginStart> {
    const response = await this.fetchImpl('https://github.com/login/device/code', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: this.options.clientId })
    })
    const data = await response.json() as {
      device_code?: string
      user_code?: string
      verification_uri?: string
      expires_in?: number
      interval?: number
      error_description?: string
    }
    if (!response.ok || !data.device_code || !data.user_code || !data.verification_uri) {
      throw new Error(data.error_description || 'Could not start GitHub sign in')
    }
    const verificationUrl = new URL(data.verification_uri)
    if (verificationUrl.protocol !== 'https:' || verificationUrl.hostname !== 'github.com') {
      throw new Error('GitHub returned an invalid verification URL')
    }
    const sessionId = crypto.randomUUID()
    const expiresAt = this.now() + (data.expires_in || 900) * 1000
    this.sessions.set(sessionId, {
      deviceCode: data.device_code,
      interval: Math.max(data.interval || 5, 1),
      expiresAt
    })
    await this.options.openExternal(data.verification_uri)
    return { sessionId, userCode: data.user_code, verificationUri: data.verification_uri, expiresAt }
  }

  async completeLogin(sessionId: string): Promise<GitHubSyncResult> {
    const session = this.sessions.get(sessionId)
    if (!session) throw new Error('GitHub sign-in session expired')
    let interval = session.interval
    try {
      while (this.now() < session.expiresAt) {
        await this.sleep(interval * 1000)
        const token = await this.requestToken(new URLSearchParams({
          client_id: this.options.clientId,
          device_code: session.deviceCode,
          grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
        }))
        if (token.error === 'authorization_pending') continue
        if (token.error === 'slow_down') {
          interval += 5
          continue
        }
        if (token.error) throw new Error(token.error_description || token.error)
        if (!token.access_token) throw new Error('GitHub did not return an access token')
        const user = await this.githubRequest<{ login: string; id: number }>('/user', token.access_token)
        const auth: StoredAuth = {
          accessToken: token.access_token,
          refreshToken: token.refresh_token || null,
          expiresAt: token.expires_in ? this.now() + token.expires_in * 1000 : null,
          refreshTokenExpiresAt: token.refresh_token_expires_in
            ? this.now() + token.refresh_token_expires_in * 1000
            : null,
          login: user.login,
          userId: user.id
        }
        this.writeAuth(auth)
        await this.ensureRepository(auth)
        return await this.sync()
      }
      throw new Error('GitHub sign-in expired')
    } finally {
      this.sessions.delete(sessionId)
    }
  }

  async logout() {
    if (existsSync(this.options.authFile)) unlinkSync(this.options.authFile)
    this.state = {
      authenticated: false,
      login: null,
      repoName: this.options.repoName,
      repoUrl: null,
      syncState: 'idle',
      lastSyncedAt: null,
      error: null
    }
    return this.getStatus()
  }

  scheduleSync(onComplete?: (result: GitHubSyncResult) => void) {
    if (!this.readAuth()) return
    if (this.syncTimer) clearTimeout(this.syncTimer)
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null
      this.sync().then(result => onComplete?.(result)).catch(() => undefined)
    }, 2500)
  }

  async sync(): Promise<GitHubSyncResult> {
    if (this.syncPromise) return this.syncPromise
    this.syncPromise = this.performSync().finally(() => {
      this.syncPromise = null
    })
    return this.syncPromise
  }

  private async performSync(): Promise<GitHubSyncResult> {
    const auth = await this.getValidAuth()
    if (!auth) throw new Error('Sign in to GitHub first')
    this.state = { ...this.getStatus(), syncState: 'syncing', error: null }
    try {
      await this.ensureRepository(auth)
      mkdirSync(this.options.directory, { recursive: true })
      await this.ensureLocalRepository(auth.login)
      await this.stageWorkspace()
      await this.commitWorkspace(auth)
      const reconciliation = await this.reconcileRemote(auth)
      this.state = {
        ...this.state,
        authenticated: true,
        login: auth.login,
        repoUrl: this.repoUrl(auth.login),
        syncState: reconciliation.conflictPath ? 'conflict' : 'success',
        lastSyncedAt: this.now(),
        error: reconciliation.conflictPath
          ? `Divergent local files were preserved in ${reconciliation.conflictPath}`
          : null
      }
      return { ...this.state, updatedFromRemote: reconciliation.updatedFromRemote }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'GitHub sync failed'
      const conflict = message.includes('diverged')
      this.state = { ...this.state, syncState: conflict ? 'conflict' : 'error', error: message }
      return { ...this.state, updatedFromRemote: false }
    }
  }

  private async requestToken(body: URLSearchParams) {
    const response = await this.fetchImpl('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    })
    const data = await response.json() as {
      access_token?: string
      refresh_token?: string
      expires_in?: number
      refresh_token_expires_in?: number
      error?: string
      error_description?: string
    }
    if (!response.ok) throw new Error(data.error_description || 'GitHub authentication failed')
    return data
  }

  private async getValidAuth() {
    const auth = this.readAuth()
    if (!auth) return null
    if (!auth.expiresAt || auth.expiresAt - this.now() > 60000) return auth
    if (!auth.refreshToken || (auth.refreshTokenExpiresAt && auth.refreshTokenExpiresAt <= this.now())) {
      await this.logout()
      return null
    }
    const token = await this.requestToken(new URLSearchParams({
      client_id: this.options.clientId,
      grant_type: 'refresh_token',
      refresh_token: auth.refreshToken
    }))
    if (!token.access_token) throw new Error('GitHub token refresh failed')
    const refreshed: StoredAuth = {
      ...auth,
      accessToken: token.access_token,
      refreshToken: token.refresh_token || auth.refreshToken,
      expiresAt: token.expires_in ? this.now() + token.expires_in * 1000 : null,
      refreshTokenExpiresAt: token.refresh_token_expires_in
        ? this.now() + token.refresh_token_expires_in * 1000
        : auth.refreshTokenExpiresAt
    }
    this.writeAuth(refreshed)
    return refreshed
  }

  private async githubRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
    const response = await this.fetchImpl(`https://api.github.com${path}`, {
      ...init,
      headers: { ...apiHeaders, Authorization: `Bearer ${token}`, ...init.headers }
    })
    if (response.status === 204) return undefined as T
    const data = await response.json() as T & { message?: string }
    if (!response.ok) throw new Error(data.message || `GitHub request failed (${response.status})`)
    return data
  }

  private async ensureRepository(auth: StoredAuth) {
    const path = `/repos/${encodeURIComponent(auth.login)}/${encodeURIComponent(this.options.repoName)}`
    const existing = await this.fetchImpl(`https://api.github.com${path}`, {
      headers: { ...apiHeaders, Authorization: `Bearer ${auth.accessToken}` }
    })
    if (existing.ok) {
      const repository = await existing.json() as { private?: boolean }
      if (!repository.private) throw new Error(`${this.options.repoName} exists but is not private`)
      return
    }
    if (existing.status !== 404) {
      const data = await existing.json() as { message?: string }
      throw new Error(data.message || 'Could not check GitHub repository')
    }
    await this.githubRequest('/user/repos', auth.accessToken, {
      method: 'POST',
      body: JSON.stringify({
        name: this.options.repoName,
        description: 'Private Handin workspace',
        private: true,
        auto_init: false
      })
    })
  }

  private async ensureLocalRepository(login: string) {
    if (!existsSync(join(this.options.directory, '.git'))) {
      await git.init({ fs, dir: this.options.directory, defaultBranch: 'main' })
    }
    const remoteUrl = this.repoUrl(login)
    const remotes = await git.listRemotes({ fs, dir: this.options.directory })
    if (remotes.some(remote => remote.remote === 'origin')) {
      await git.setConfig({ fs, dir: this.options.directory, path: 'remote.origin.url', value: remoteUrl })
    } else {
      await git.addRemote({ fs, dir: this.options.directory, remote: 'origin', url: remoteUrl })
    }
    const readme = join(this.options.directory, 'README.md')
    if (!existsSync(readme)) writeFileSync(readme, '# Handin notes\n\nPrivate workspace managed by Handin.\n')
  }

  private async stageWorkspace() {
    const matrix = await git.statusMatrix({ fs, dir: this.options.directory })
    for (const [filepath, head, workdir, stage] of matrix) {
      if (workdir === 0 && head !== 0) {
        await git.remove({ fs, dir: this.options.directory, filepath })
      } else if (workdir !== stage) {
        await git.add({ fs, dir: this.options.directory, filepath })
      }
    }
  }

  private async commitWorkspace(auth: StoredAuth) {
    const matrix = await git.statusMatrix({ fs, dir: this.options.directory })
    if (!matrix.some(([, head, , stage]) => head !== stage)) return
    await git.commit({
      fs,
      dir: this.options.directory,
      message: `Sync Handin workspace ${new Date(this.now()).toISOString()}`,
      author: {
        name: auth.login,
        email: `${auth.userId}+${auth.login}@users.noreply.github.com`
      }
    })
  }

  private async reconcileRemote(auth: StoredAuth) {
    const onAuth = () => ({ username: auth.login, password: auth.accessToken })
    let remoteOid: string | null = null
    try {
      await git.fetch({ fs, http, dir: this.options.directory, remote: 'origin', ref: 'main', singleBranch: true, onAuth })
      remoteOid = await git.resolveRef({ fs, dir: this.options.directory, ref: 'refs/remotes/origin/main' })
    } catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (!/not found|does not exist|empty|404/i.test(message)) throw error
    }
    const localOid = await git.resolveRef({ fs, dir: this.options.directory, ref: 'refs/heads/main' })
    if (!remoteOid) {
      await git.push({ fs, http, dir: this.options.directory, remote: 'origin', ref: 'main', onAuth })
      return { updatedFromRemote: false, conflictPath: null }
    }
    if (localOid === remoteOid) return { updatedFromRemote: false, conflictPath: null }
    if (await git.isDescendent({ fs, dir: this.options.directory, oid: localOid, ancestor: remoteOid })) {
      await git.push({ fs, http, dir: this.options.directory, remote: 'origin', ref: 'main', onAuth })
      return { updatedFromRemote: false, conflictPath: null }
    }
    if (await git.isDescendent({ fs, dir: this.options.directory, oid: remoteOid, ancestor: localOid })) {
      await git.writeRef({ fs, dir: this.options.directory, ref: 'refs/heads/main', value: remoteOid, force: true })
      await git.checkout({ fs, dir: this.options.directory, ref: 'main', force: true })
      return { updatedFromRemote: true, conflictPath: null }
    }
    const conflictPath = await this.preserveConflictCopy(localOid)
    await git.writeRef({ fs, dir: this.options.directory, ref: 'refs/heads/main', value: remoteOid, force: true })
    await git.checkout({ fs, dir: this.options.directory, ref: 'main', force: true })
    await this.stageWorkspace()
    await this.commitWorkspace(auth)
    await git.push({ fs, http, dir: this.options.directory, remote: 'origin', ref: 'main', onAuth })
    return { updatedFromRemote: true, conflictPath }
  }

  private async preserveConflictCopy(localOid: string) {
    const conflictPath = `conflicts/${new Date(this.now()).toISOString().replace(/[:.]/g, '-')}`
    const files = await git.listFiles({ fs, dir: this.options.directory, ref: localOid })
    for (const filepath of files) {
      if (filepath.startsWith('conflicts/')) continue
      const { blob } = await git.readBlob({ fs, dir: this.options.directory, oid: localOid, filepath })
      const target = join(this.options.directory, conflictPath, filepath)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, blob)
    }
    return conflictPath
  }

  private repoUrl(login: string) {
    return `https://github.com/${login}/${this.options.repoName}.git`
  }

  private readAuth(): StoredAuth | null {
    if (!existsSync(this.options.authFile) || !this.options.encryption.available()) return null
    try {
      return JSON.parse(this.options.encryption.decrypt(readFileSync(this.options.authFile))) as StoredAuth
    } catch {
      return null
    }
  }

  private writeAuth(auth: StoredAuth) {
    if (!this.options.encryption.available()) throw new Error('Secure credential storage is unavailable')
    mkdirSync(dirname(this.options.authFile), { recursive: true })
    writeFileSync(this.options.authFile, this.options.encryption.encrypt(JSON.stringify(auth)), { mode: 0o600 })
  }
}
