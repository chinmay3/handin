import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { getRandomQuote } from '../../lib/quotes'

export default function Quote() {
  const [quote, setQuote] = useState(getRandomQuote)

  useEffect(() => {
    const interval = setInterval(() => setQuote(getRandomQuote()), 60000)
    return () => clearInterval(interval)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5, duration: 0.8 }}
      className="select-none"
    >
      <p className="text-xs text-subtle italic leading-relaxed">
        "{quote.text}"
      </p>
      <p className="text-[10px] text-subtle/60 mt-1.5">
        — {quote.author}
      </p>
    </motion.div>
  )
}
