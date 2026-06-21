type ArrowIconProps = {
  direction?: 'left' | 'right' | 'up' | 'down'
  variant?: 'chevron' | 'arrow'
  className?: string
}

export default function ArrowIcon({ direction = 'right', variant = 'chevron', className = 'w-3 h-3' }: ArrowIconProps) {
  const transform = {
    left: 'rotate(180 12 12)',
    right: undefined,
    up: 'rotate(-90 12 12)',
    down: 'rotate(90 12 12)'
  }[direction]

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {variant === 'arrow' ? (
        <g transform={transform}>
          <path d="M4 12h15" />
          <path d="M13 6l6 6-6 6" />
        </g>
      ) : (
        <path d="M9 5l7 7-7 7" transform={transform} />
      )}
    </svg>
  )
}
