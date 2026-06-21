export function scrollToDocumentLine(line: number) {
  const target = document.querySelector<HTMLElement>(`[data-document-line="${line}"]`)
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  target.dataset.headingTarget = 'true'
  window.setTimeout(() => delete target.dataset.headingTarget, 1200)
}
