const documentCursorPositions = new Map<string, number>()

export function setDocumentCursorPosition(noteId: string, position: number) {
  documentCursorPositions.set(noteId, position)
}

export function getDocumentCursorPosition(noteId: string, fallback: number) {
  return documentCursorPositions.get(noteId) ?? fallback
}
