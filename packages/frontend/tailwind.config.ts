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
          accent: '#d57bff',
          success: '#72ffb0',
          warning: '#fbbf24',
          error: '#ff4444',
        },
        primary: '#f4eaff',
        muted: '#cdb8d9',
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
