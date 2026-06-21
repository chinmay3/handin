/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--color-bg) / <alpha-value>)',
        surface: 'rgb(var(--color-surface) / <alpha-value>)',
        raised: 'rgb(var(--color-raised) / <alpha-value>)',
        border: 'rgb(var(--color-border) / <alpha-value>)',
        muted: 'rgb(var(--color-muted) / <alpha-value>)',
        subtle: 'rgb(var(--color-subtle) / <alpha-value>)',
        fg: 'rgb(var(--color-fg) / <alpha-value>)',
        dim: 'rgb(var(--color-dim) / <alpha-value>)'
      },
      fontFamily: {
        sans: ['"Merta Sans"', '"Avenir Next"', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['"Merta Sans"', '"Avenir Next"', 'Avenir', 'Helvetica', 'Arial', 'sans-serif']
      }
    }
  },
  plugins: []
}
