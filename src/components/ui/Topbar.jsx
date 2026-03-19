import { useContext, useEffect, useState } from 'react';
import { Command, LogOut, Moon, Search, Sun, Sparkles } from 'lucide-react';
import { AuthContext } from '../../context/auth-context';
import { useTheme } from '../../hooks/useTheme';

function formatNow(ts) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(ts);
}

export default function Topbar({ title, subtitle, activeSectionLabel = 'Overview', onOpenCommandPalette }) {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left">
        <p className="topbar-breadcrumb">Workspace / {activeSectionLabel}</p>
        <div className="topbar-title-row">
          <h1>{title}</h1>
          <span className="topbar-section-pill">
            <Sparkles size={14} />
            {activeSectionLabel}
          </span>
        </div>
        <p>{subtitle}</p>
      </div>
      <div className="topbar-right">
        <div className="topbar-chip-group">
          <span className="topbar-chip">Local</span>
          <span className="topbar-chip">{formatNow(now)}</span>
        </div>
        <button type="button" className="ghost-button" onClick={onOpenCommandPalette}>
          <Search size={16} />
          Quick Search
          <kbd className="kbd-hint">
            <Command size={11} />K
          </kbd>
        </button>
        <button type="button" className="ghost-button" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
        <div className="profile-pill">
          <span>{user?.username}</span>
          <small>{user?.role?.replace('_', ' ')}</small>
        </div>
        <button type="button" className="ghost-button" onClick={logout}>
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </header>
  );
}
