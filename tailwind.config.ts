import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#070b13',
        panel: '#0e1524',
        panelAlt: '#121b2d',
        border: '#223049',
        muted: '#8ea2c5',
        accent: '#5b7cff',
        success: '#26a269',
        danger: '#d74c4c',
        warning: '#c58b2f'
      }
    }
  },
  plugins: []
};

export default config;
