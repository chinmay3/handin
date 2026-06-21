interface Props {
  kind: 'project' | 'note' | 'task'
  className?: string
}

export default function ItemMarker({ kind, className = '' }: Props) {
  const style = kind === 'project'
    ? 'border-dim bg-dim'
    : kind === 'task'
      ? 'border-muted bg-transparent'
      : 'border-subtle bg-transparent'

  return <span aria-hidden="true" className={`block h-1.5 w-1.5 shrink-0 rounded-full border ${style} ${className}`} />
}
