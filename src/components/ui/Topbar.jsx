import { useEffect, useState } from 'react';
import { Bell, Command, LogOut, Menu, Moon, Search, Sun } from 'lucide-react';
import { useAuthUser } from '../../hooks/useAuthUser';
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

export default function Topbar({
  title,
  activeSectionLabel = 'Overview',
  onOpenCommandPalette,
  onNavigateSection,
  onOpenSidebar,
  unreadCount = 0,
}) {
  const { user, logout } = useAuthUser();
  const { theme, toggleTheme } = useTheme();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const avatarLabel = (user?.username || 'U').slice(0, 2).toUpperCase();
  const profileImage =
    typeof user?.profile_image === 'string' && user.profile_image.trim()
      ? user.profile_image.trim()
      : '';

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-mobile-menu"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
        <div className="topbar-brand-copy">
          <p className="topbar-breadcrumb">Workspace / {activeSectionLabel}</p>
          <div className="topbar-title-row">
            <h1>{title}</h1>
          </div>
        </div>
      </div>
      <div className="topbar-center">
        <button type="button" className="topbar-search" onClick={onOpenCommandPalette}>
          <Search size={16} />
          <span>Search workspace</span>
          <kbd className="kbd-hint">
            <Command size={11} />K
          </kbd>
        </button>
      </div>
      <div className="topbar-right">
        <div className="topbar-chip-group">
          <span className="topbar-chip">{formatNow(now)}</span>
        </div>
        <button
          type="button"
          className="topbar-notification-pill"
          title={`${unreadCount} unread notifications`}
          onClick={() => onNavigateSection?.('notifications')}
          aria-label="Open notifications"
        >
          <Bell size={15} />
          {unreadCount ? <span>{unreadCount}</span> : null}
        </button>
        <button type="button" className="topbar-icon-button" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          type="button"
          className="topbar-avatar"
          title={user?.username || 'User'}
          onClick={() => onNavigateSection?.('settings')}
          aria-label="Open settings"
        >
          {profileImage ? (
            <img src={profileImage} alt={user?.username || 'User'} />
          ) : (
            avatarLabel
          )}
        </button>
        <button type="button" className="topbar-icon-button" onClick={logout} aria-label="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
