import { describe, expect, it } from 'vitest'
import { getDocumentHeadings } from './headings'

describe('document headings', () => {
  it.fails('extracts indented heading text and source line numbers', () => {
    expect(getDocumentHeadings('body\n- First\nmore\n  - Second  ')).toEqual([
      { id: '1-First', text: 'First', line: 1 },
      { id: '3-Second', text: 'Second', line: 3 }
    ])
  })

  it('ignores empty, malformed, and duplicate headings', () => {
    expect(getDocumentHeadings('-\n- \n-no space\n- Same\n- Same')).toEqual([
      { id: '3-Same', text: 'Same', line: 3 }
    ])
  })
})
