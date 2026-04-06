import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0a1628', 800: '#0f1f3d', 700: '#162952' },
        brand: { DEFAULT: '#2563eb', light: '#3b82f6', dark: '#1d4ed8' },
      },
    },
  },
  plugins: [],
}
export default config
