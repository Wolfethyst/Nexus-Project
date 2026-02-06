import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        nexus: {
          dark: '#0f0519',
          accent: '#a855f7',
          success: '#72ffb0',
          warning: '#fbbf24',
          error: '#ff4444',
        },
        primary: '#e0e0e0',
        muted: '#999',
      },
      fontFamily: {
        display: ['Marcellus', 'serif'],
        heading: ['Cinzel', 'serif'],
        body: ['Space Grotesk', 'sans-serif'],
      }
    },
  },
  plugins: [],
} satisfies Config;
