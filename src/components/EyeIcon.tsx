interface EyeIconProps {
  visible: boolean
  className?: string
}

export default function EyeIcon({ visible, className = 'w-4 h-4' }: EyeIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
      <circle cx="12" cy="12" r="2.5" />
      {!visible && <path d="M4 4l16 16" />}
    </svg>
  )
}
