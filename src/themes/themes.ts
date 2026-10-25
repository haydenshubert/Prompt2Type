export interface Theme {
  id: string;
  name: string;
  bg: string;
  panel: string;
  sub: string;
  text: string;
  main: string;
  error: string;
  errorExtra: string;
}

export const THEMES: Theme[] = [
  { id: 'carbon', name: 'carbon', bg: '#1e1f24', panel: '#2a2c33', sub: '#6b6f7a', text: '#d6d3c9', main: '#e2b714', error: '#ca4754', errorExtra: '#7e2a33' },
  { id: 'paper', name: 'paper', bg: '#f4f1ea', panel: '#e6e1d6', sub: '#9a9488', text: '#3b3a36', main: '#c2410c', error: '#b91c1c', errorExtra: '#f2a7a7' },
  { id: 'midnight', name: 'midnight', bg: '#0f172a', panel: '#1e293b', sub: '#64748b', text: '#e2e8f0', main: '#38bdf8', error: '#f87171', errorExtra: '#7f1d1d' },
  { id: 'dracula', name: 'dracula', bg: '#282a36', panel: '#343746', sub: '#6272a4', text: '#f8f8f2', main: '#bd93f9', error: '#ff5555', errorExtra: '#8b2e2e' },
  { id: 'nord', name: 'nord', bg: '#2e3440', panel: '#3b4252', sub: '#6c7a96', text: '#e5e9f0', main: '#88c0d0', error: '#bf616a', errorExtra: '#7a3d44' },
  { id: 'solarized-dark', name: 'solarized dark', bg: '#002b36', panel: '#073642', sub: '#58747d', text: '#eee8d5', main: '#b58900', error: '#dc322f', errorExtra: '#7a1d1b' },
  { id: 'solarized-light', name: 'solarized light', bg: '#fdf6e3', panel: '#eee8d5', sub: '#93a1a1', text: '#586e75', main: '#268bd2', error: '#dc322f', errorExtra: '#f0a8a6' },
  { id: 'terminal', name: 'terminal', bg: '#0b0f0b', panel: '#142014', sub: '#3f6b3f', text: '#9fe59f', main: '#39ff14', error: '#ff4d4d', errorExtra: '#6b1f1f' },
  { id: 'rose-pine', name: 'rosé pine', bg: '#191724', panel: '#26233a', sub: '#6e6a86', text: '#e0def4', main: '#ebbcba', error: '#eb6f92', errorExtra: '#7a3a4d' },
  { id: 'ocean', name: 'ocean', bg: '#0b2a3a', panel: '#123b50', sub: '#5b8aa0', text: '#d7eef7', main: '#4fd1c5', error: '#ff7a7a', errorExtra: '#7a3434' },
  { id: 'sakura', name: 'sakura', bg: '#fff1f4', panel: '#fbdde5', sub: '#c08a9a', text: '#5a3a46', main: '#e05a87', error: '#c0392b', errorExtra: '#f1a9a0' },
  { id: 'forest', name: 'forest', bg: '#1b2620', panel: '#26352c', sub: '#6b8574', text: '#e3ead9', main: '#a3c76d', error: '#e06c5a', errorExtra: '#73352c' },
  { id: 'lavender', name: 'lavender', bg: '#f3f0fa', panel: '#e3dcf3', sub: '#9c92b8', text: '#3d3556', main: '#7c5cd6', error: '#d0435a', errorExtra: '#efb0bb' },
  { id: 'high-contrast', name: 'high contrast', bg: '#000000', panel: '#1a1a1a', sub: '#8a8a8a', text: '#ffffff', main: '#ffd400', error: '#ff3b3b', errorExtra: '#992222' },
];

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement.style;
  root.setProperty('--bg', theme.bg);
  root.setProperty('--panel', theme.panel);
  root.setProperty('--sub', theme.sub);
  root.setProperty('--text', theme.text);
  root.setProperty('--main', theme.main);
  root.setProperty('--error', theme.error);
  root.setProperty('--error-extra', theme.errorExtra);
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.bg);
}

export interface FontOption {
  id: string;
  name: string;
  family: string;
}

export const FONTS: FontOption[] = [
  { id: 'jetbrains', name: 'JetBrains Mono', family: "'JetBrains Mono', monospace" },
  { id: 'roboto-mono', name: 'Roboto Mono', family: "'Roboto Mono', monospace" },
  { id: 'fira', name: 'Fira Code', family: "'Fira Code', monospace" },
  { id: 'inter', name: 'Inter', family: "'Inter', sans-serif" },
  { id: 'lexend', name: 'Lexend', family: "'Lexend', sans-serif" },
  { id: 'atkinson', name: 'Atkinson Hyperlegible', family: "'Atkinson Hyperlegible', sans-serif" },
  { id: 'serif', name: 'Source Serif', family: "'Source Serif 4', serif" },
];

export function getFont(id: string): FontOption {
  return FONTS.find((f) => f.id === id) ?? FONTS[0];
}
