import { useContext, useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AiCoachChat from '../AiCoachChat';
import { usePlanAccess } from '../../hooks/usePlanAccess';
import { AuthContext } from '../../context/auth-context';

export default function PageShell({ title, subtitle, sections, heroStats = [], heroNote = '', children }) {
  const [activeSection, setActiveSection] = useState(sections?.[0]?.key || 'overview');
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem('shell.sidebar.collapsed') === '1');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const planAccess = usePlanAccess();
  const { user } = useContext(AuthContext);

  const activeSectionLabel = useMemo(() => {
    const item = (sections || []).find((s) => s.key === activeSection);
    return item?.label || 'Overview';
  }, [sections, activeSection]);

  const filteredSections = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return sections || [];
    return (sections || []).filter((item) => item.label.toLowerCase().includes(q));
  }, [sections, commandQuery]);

  useEffect(() => {
    window.localStorage.setItem('shell.sidebar.collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  useEffect(() => {
    const onKeyDown = (event) => {
      const isCmdK = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';
      if (isCmdK) {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const workspaceSummary = useMemo(
    () => [
      heroStats[0] || { label: 'Workspace Sections', value: sections?.length || 0 },
      heroStats[1] || { label: 'Active View', value: activeSectionLabel },
      heroStats[2] || { label: 'Role', value: user?.role?.replaceAll('_', ' ') || 'workspace' },
    ],
    [heroStats, sections, activeSectionLabel, user]
  );

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        sections={sections}
        activeSection={activeSection}
        onChange={setActiveSection}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />
      <main className="shell-main">
        <Topbar
          title={title}
          subtitle={subtitle}
          activeSectionLabel={activeSectionLabel}
          onOpenCommandPalette={() => setCommandOpen(true)}
        />
        <section className="workspace-hero entrance-rise">
          <div className="workspace-hero-copy">
            <span className="workspace-hero-kicker">Platform Workspace</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
            <div className="workspace-hero-tags">
              <span className="workspace-hero-tag">Section: {activeSectionLabel}</span>
              <span className="workspace-hero-tag">Quick Search Ready</span>
              {heroNote ? <span className="workspace-hero-tag">{heroNote}</span> : null}
            </div>
          </div>
          <div className="workspace-hero-stats">
            {workspaceSummary.map((item) => (
              <article key={item.label} className="workspace-hero-stat">
                <p>{item.label}</p>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>
        </section>
        <section key={activeSection} className="page-content entrance-rise">
          {children(activeSection)}
        </section>
      </main>
      {commandOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setCommandOpen(false);
            setCommandQuery('');
          }}
        >
          <div className="command-palette" onClick={(event) => event.stopPropagation()}>
            <div className="command-head">
              <strong>Quick Navigate</strong>
              <small>Press Ctrl/Cmd + K</small>
            </div>
            <input
              autoFocus
              type="text"
              value={commandQuery}
              onChange={(event) => setCommandQuery(event.target.value)}
              placeholder="Type a section name..."
            />
            <div className="command-results">
              {filteredSections.length ? (
                filteredSections.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="command-item"
                    onClick={() => {
                      setActiveSection(item.key);
                      setCommandOpen(false);
                      setCommandQuery('');
                    }}
                  >
                    <span>{item.label}</span>
                    <kbd>Enter</kbd>
                  </button>
                ))
              ) : (
                <p className="help-text">No sections match your search.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <AiCoachChat enabled={planAccess.ai_chat} />
    </div>
  );
}
