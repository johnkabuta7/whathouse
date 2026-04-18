import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';

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

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorHex: string;
  setColorHex: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  colorHex: DEFAULT_COLOR,
  setColorHex: () => {},
});

export const useTheme = () => useContext(ThemeContext);

// Convert hex (#RRGGBB) to "H S% L%" string for HSL CSS variables
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

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const hsl = hexToHsl(colorHex);
    const root = document.documentElement;
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--accent', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--sidebar-ring', hsl);
    localStorage.setItem('colorHex', colorHex);
  }, [colorHex]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const setColorHex = (hex: string) => setColorHexState(hex);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorHex, setColorHex }}>
      {children}
    </ThemeContext.Provider>
  );
}
