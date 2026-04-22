import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
export type ThemeStyle = 'classic' | 'mocha' | 'nature';

export const COLOR_THEMES = [
  { name: 'Émeraude', hex: '#226D68' },
  { name: 'Terracotta', hex: '#D46F4D' },
  { name: 'Bleu', hex: '#317AC1' },
  { name: 'Mandarine', hex: '#F27438' },
  { name: 'Framboise', hex: '#CA3C66' },
  { name: 'Sable', hex: '#D6955B' },
  { name: 'Sarcelle', hex: '#137C8B' },
  { name: 'Feu', hex: '#FC4E00' },
  { name: 'Magenta', hex: '#FE277E' },
  { name: 'Menthe', hex: '#3CCDB4' },
  { name: 'Corail', hex: '#ED4353' },
  { name: 'Azur', hex: '#2599FB' },
  { name: 'Océan', hex: '#007FA9' },
] as const;

export const DEFAULT_COLOR = '#226D68';

export const THEME_STYLES: { id: ThemeStyle; name: string; description: string; preview: string }[] = [
  { id: 'classic', name: 'Classique', description: 'Design actuel sobre', preview: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--background)))' },
  { id: 'mocha', name: 'Mocha', description: 'Sombre cuivré, élégant', preview: 'linear-gradient(135deg, #3a2418, #d97757)' },
  { id: 'nature', name: 'Nature', description: 'Clair, verdoyant', preview: 'linear-gradient(135deg, #e8f0e3, #2d5a3d)' },
];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorHex: string;
  setColorHex: (hex: string) => void;
  themeStyle: ThemeStyle;
  setThemeStyle: (s: ThemeStyle) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  colorHex: DEFAULT_COLOR,
  setColorHex: () => {},
  themeStyle: 'classic',
  setThemeStyle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function hexToHsl(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let H = 0, S = 0;
  const L = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    S = L > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: H = (g - b) / d + (g < b ? 6 : 0); break;
      case g: H = (b - r) / d + 2; break;
      case b: H = (r - g) / d + 4; break;
    }
    H *= 60;
  }
  return `${Math.round(H)} ${Math.round(S * 100)}% ${Math.round(L * 100)}%`;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme');
    return (saved === 'light' ? 'light' : 'dark') as Theme;
  });
  const [colorHex, setColorHexState] = useState<string>(() => localStorage.getItem('colorHex') || DEFAULT_COLOR);
  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>(() => {
    const s = localStorage.getItem('themeStyle') as ThemeStyle | null;
    return s === 'mocha' || s === 'nature' ? s : 'classic';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.removeAttribute('data-style');
    if (themeStyle !== 'classic') root.setAttribute('data-style', themeStyle);
    localStorage.setItem('themeStyle', themeStyle);
  }, [themeStyle]);

  useEffect(() => {
    // Color override only applies in classic style; mocha/nature have fixed palettes
    const root = document.documentElement;
    if (themeStyle === 'classic') {
      const hsl = hexToHsl(colorHex);
      root.style.setProperty('--primary', hsl);
      root.style.setProperty('--accent', hsl);
      root.style.setProperty('--ring', hsl);
      root.style.setProperty('--sidebar-primary', hsl);
      root.style.setProperty('--sidebar-ring', hsl);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-ring');
    }
    localStorage.setItem('colorHex', colorHex);
  }, [colorHex, themeStyle]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const setColorHex = (hex: string) => setColorHexState(hex);
  const setThemeStyle = (s: ThemeStyle) => setThemeStyleState(s);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorHex, setColorHex, themeStyle, setThemeStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}
