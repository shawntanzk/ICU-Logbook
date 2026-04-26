import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a5c96',
          50: '#e8f0f9',
          100: '#c5d9ef',
          200: '#9ec0e4',
          300: '#77a7d9',
          400: '#5994d1',
          500: '#3a81c9',
          600: '#2d6daf',
          700: '#1a5c96',
          800: '#124a7a',
          900: '#0a385d',
        },
        background: '#f0f4f8',
      },
      borderRadius: {
        '2xl': '1rem',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
