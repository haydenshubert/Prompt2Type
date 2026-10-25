import { useEffect } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { BarChart3, Keyboard, Library, Settings as SettingsIcon, Sparkles } from 'lucide-react';
import TypePage from './routes/TypePage';
import LibraryPage from './routes/LibraryPage';
import GeneratePage from './routes/GeneratePage';
import ProfilePage from './routes/ProfilePage';
import SettingsPage from './routes/SettingsPage';
import { CommandPalette } from './components/CommandPalette';
import { useSettings } from './store/settings';
import { applyTheme, getFont, getTheme } from './themes/themes';

const NAV = [
  { to: '/', label: 'type', icon: Keyboard, end: true },
  { to: '/library', label: 'library', icon: Library },
  { to: '/generate', label: 'ai', icon: Sparkles },
  { to: '/profile', label: 'profile', icon: BarChart3 },
  { to: '/settings', label: 'settings', icon: SettingsIcon },
];

function useAppearance() {
  const theme = useSettings((s) => s.theme);
  const font = useSettings((s) => s.font);
  const fontSize = useSettings((s) => s.fontSize);
  useEffect(() => applyTheme(getTheme(theme)), [theme]);
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty('--font-typing', getFont(font).family);
    root.setProperty('--typing-size', `${fontSize}rem`);
  }, [font, fontSize]);
}

export default function App() {
  useAppearance();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-8">
        <NavLink to="/" className="flex items-center gap-2 text-xl font-semibold text-main">
          <Keyboard className="h-6 w-6" />
          <span className="hidden sm:inline">prompt2type</span>
        </NavLink>
        <nav className="flex items-center gap-1 sm:gap-3" aria-label="Main">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={label}
              className={({ isActive }) =>
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors ' +
                (isActive ? 'text-main' : 'text-sub hover:text-text')
              }
            >
              <Icon className="h-5 w-5" />
              <span className="hidden md:inline">{label}</span>
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex flex-1 flex-col">
        <Routes>
          <Route path="/" element={<TypePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<TypePage />} />
        </Routes>
      </main>
      <footer className="px-4 py-4 text-center text-xs text-sub">
        <kbd>tab</kbd> restart · <kbd>enter</kbd> next test (on results) · <kbd>esc</kbd> /{' '}
        <kbd>ctrl+k</kbd> commands
      </footer>
      <CommandPalette />
    </div>
  );
}
