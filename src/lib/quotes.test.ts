import { describe, expect, it } from 'vitest'
import quotes, { getRandomQuote } from './quotes'

describe('quotes', () => {
  it('contains the expanded quote collection without exact duplicates', () => {
    expect(quotes).toHaveLength(70)
    expect(new Set(quotes.map(quote => `${quote.text}\u0000${quote.author}`)).size).toBe(quotes.length)
    expect(quotes).toContainEqual({ text: "The poet doesn't invent. He listens.", author: 'Jean Cocteau' })
    expect(quotes).toContainEqual({ text: "I know writers who use subtext, and they're all cowards.", author: 'Garth Marenghi' })
  })

  it('returns an entry from the collection', () => {
    expect(quotes).toContain(getRandomQuote())
  })
})
