import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../lib/theme';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`ui-icon-btn ${className}`}
      aria-label={dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}
      title={dark ? 'Tema terang' : 'Tema gelap'}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}
