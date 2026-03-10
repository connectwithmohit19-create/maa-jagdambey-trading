/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Maroon — primary brand (Adobe RGB 0.563, 0.377, 0.411 → #8F6069)
        maroon: {
          50:  '#fdf5f6',
          100: '#f5e6e8',
          200: '#ead1d4',
          300: '#d4adb2',
          400: '#b98089',
          500: '#a06b75',
          600: '#8f6069',   // ← specified maroon
          700: '#6e4850',
          800: '#543841',
          900: '#3d2730',
          950: '#2a1a21',
        },
        // ── Beige — main background (Adobe RGB 0.936, 0.873, 0.809 → #EFDFCE)
        beige: {
          50:  '#fdfaf7',
          100: '#f8f2ea',
          200: '#f4ebe0',
          300: '#efdfce',   // ← specified beige
          400: '#e5ccb5',
          500: '#d4b090',
          600: '#b88f6a',
          700: '#9a7050',
          800: '#6e4e36',
          900: '#3d2b1d',
        },
        // ── Warm neutrals — replaces stone/gray (no pure black)
        warm: {
          50:  '#fdfaf8',
          100: '#f7f0ea',
          200: '#ede2d8',
          300: '#d9c9bc',
          400: '#bda999',
          500: '#9e8878',
          600: '#7a6558',
          700: '#5c4840',
          800: '#3e302a',
          900: '#261e19',
        },
      },
      fontFamily: {
        sans:    ['Sora', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        'warm-sm': '0 1px 3px 0 rgba(62,48,42,0.08), 0 1px 2px -1px rgba(62,48,42,0.06)',
        'warm':    '0 4px 6px -1px rgba(62,48,42,0.10), 0 2px 4px -2px rgba(62,48,42,0.07)',
        'warm-md': '0 10px 15px -3px rgba(62,48,42,0.12), 0 4px 6px -4px rgba(62,48,42,0.08)',
        'warm-lg': '0 20px 25px -5px rgba(62,48,42,0.14), 0 8px 10px -6px rgba(62,48,42,0.08)',
      },
      backgroundImage: {
        'beige-gradient': 'linear-gradient(135deg, #fdfaf7 0%, #efdfce 100%)',
        'maroon-gradient': 'linear-gradient(135deg, #8f6069 0%, #3d2730 100%)',
      },
    },
  },
  plugins: [],
};
