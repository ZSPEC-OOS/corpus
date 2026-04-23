import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:       '#000000',
        panel:    '#08090f',
        panelAlt: '#0d0e1a',
        border:   '#1a1d35',
        muted:    '#6b7299',
        accent:   '#4f6fff',
        cyan:     '#00e5ff',
        purple:   '#b44fff',
        success:  '#00e5a0',
        danger:   '#ff4f6f',
        warning:  '#ffaa4f',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #00e5ff 0%, #4f6fff 50%, #b44fff 100%)',
        'brand-gradient-subtle': 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(79,111,255,0.15) 50%, rgba(180,79,255,0.15) 100%)',
      },
      boxShadow: {
        'glow-cyan':   '0 0 20px rgba(0,229,255,0.25)',
        'glow-accent': '0 0 20px rgba(79,111,255,0.3)',
        'glow-purple': '0 0 20px rgba(180,79,255,0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
