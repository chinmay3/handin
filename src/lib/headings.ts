export interface DocumentHeading {
  id: string
  text: string
  line: number
}

export function getDocumentHeadings(content: string): DocumentHeading[] {
  const seen = new Set<string>()
  return content.split('\n').reduce<DocumentHeading[]>((headings, line, index) => {
    if (!line.trim().startsWith('- ')) return headings
    const text = line.replace(/^-\s*/, '').trim()
    if (!text || seen.has(text)) return headings
    seen.add(text)
    return [...headings, { id: `${index}-${text}`, text, line: index }]
  }, [])
}
