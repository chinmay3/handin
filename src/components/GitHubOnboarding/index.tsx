import { useGitHubStore } from '../../store/github'

function GitHubIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
      <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.2c-3.22.7-3.9-1.37-3.9-1.37-.52-1.34-1.28-1.7-1.28-1.7-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.57-.29-5.27-1.28-5.27-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.16 1.18A10.98 10.98 0 0 1 12 6.14c.98 0 1.95.13 2.87.39 2.19-1.49 3.15-1.18 3.15-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.71 5.38-5.29 5.67.42.36.78 1.07.78 2.16v3.22c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
    </svg>
  )
}

export default function GitHubOnboarding() {
  const { status, signingIn, loginStart, login } = useGitHubStore()

  return (
    <div className="flex h-screen w-screen flex-col bg-bg text-fg">
      <div className="drag-region h-10 shrink-0" />
      <main className="flex flex-1 items-center justify-center px-8 pb-10">
        <div className="w-full max-w-md">
          <div className="handin-wordmark mb-12 text-lg uppercase tracking-widest">handin</div>
          <h1 className="mb-3 text-xl font-bold">Connect your private workspace</h1>
          <p className="mb-8 text-sm leading-relaxed text-dim">
            Sign in with GitHub to create and sync the private handin-notes repository.
          </p>

          {loginStart ? (
            <div>
              <div className="mb-2 text-[10px] uppercase tracking-widest text-muted">verification code</div>
              <div className="mb-4 flex items-center justify-between rounded border border-border bg-surface px-4 py-3">
                <span className="text-lg font-bold tracking-widest text-fg">{loginStart.userCode}</span>
                <button
                  onClick={() => navigator.clipboard?.writeText(loginStart.userCode)}
                  className="text-xs text-dim hover:text-fg"
                >
                  copy
                </button>
              </div>
              <div className="text-xs text-muted">Waiting for authorization in your browser...</div>
            </div>
          ) : (
            <button
              onClick={login}
              disabled={signingIn}
              aria-label={signingIn ? 'connecting to GitHub' : 'sign in with GitHub'}
              className="flex w-full items-center justify-center gap-2 rounded border border-fg bg-fg px-4 py-3 text-sm font-medium text-bg transition-opacity hover:opacity-85 disabled:opacity-50"
            >
              {signingIn ? (
                'connecting...'
              ) : (
                <>
                  <span>sign in with</span>
                  <GitHubIcon />
                </>
              )}
            </button>
          )}

          {status.error && (
            <div className="mt-4 rounded border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-dim">
              {status.error}
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
