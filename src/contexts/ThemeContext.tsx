import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
export type ThemeStyle = 'classic' | 'mocha' | 'nature';

// Each theme style has its own fixed brand color — no per-user color picker.
export const STYLE_COLORS: Record<ThemeStyle, string> = {
  classic: '#00A0B0', // Teal (couleur 1)
  mocha:   '#0084FA', // Bleu (couleur 2) — fond noir
  nature:  '#F5432D', // Rouge-orangé (couleur 3)
};

// Kept for backward-compat (some components may still import it). Do NOT extend.
export const DEFAULT_COLOR = STYLE_COLORS.classic;

export const THEME_STYLES: { id: ThemeStyle; name: string; description: string; preview: string }[] = [
  { id: 'classic', name: 'Classique', description: 'Design actuel sobre', preview: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--background)))' },
  { id: 'mocha', name: 'Mocha', description: 'Sombre cuivré, élégant', preview: 'linear-gradient(135deg, #3a2418, #d97757)' },
  { id: 'nature', name: 'Nature', description: 'Clair, verdoyant', preview: 'linear-gradient(135deg, #e8f0e3, #2d5a3d)' },
];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  colorHex: string;
  themeStyle: ThemeStyle;
  setThemeStyle: (s: ThemeStyle) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  colorHex: DEFAULT_COLOR,
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
  const [themeStyle, setThemeStyleState] = useState<ThemeStyle>(() => {
    const s = localStorage.getItem('themeStyle') as ThemeStyle | null;
    return s === 'mocha' || s === 'nature' ? s : 'classic';
  });
  const colorHex = STYLE_COLORS[themeStyle];

  useEffect(() => {
    // Mocha n'a qu'un mode sombre — on force dark dès qu'on l'active.
    const effectiveTheme = themeStyle === 'mocha' ? 'dark' : theme;
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme, themeStyle]);

  useEffect(() => {
    const root = document.documentElement;
    root.removeAttribute('data-style');
    if (themeStyle !== 'classic') root.setAttribute('data-style', themeStyle);
    localStorage.setItem('themeStyle', themeStyle);
  }, [themeStyle]);

  useEffect(() => {
    const root = document.documentElement;
    // Each style now has its own brand color injected via index.css. We only
    // override CSS variables for the classic style (so users keep the orange
    // identity even if other developers tweak base tokens later).
    if (themeStyle === 'classic') {
      const hsl = hexToHsl(STYLE_COLORS.classic);
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
  }, [themeStyle]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');
  const setThemeStyle = (s: ThemeStyle) => setThemeStyleState(s);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorHex, themeStyle, setThemeStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}
