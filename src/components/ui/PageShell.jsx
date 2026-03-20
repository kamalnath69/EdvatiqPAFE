import { useEffect, useMemo, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import AiCoachChat from '../AiCoachChat';
import { usePlanAccess } from '../../hooks/usePlanAccess';
import { getWalletSummary, listNotifications, searchWorkspace } from '../../services/workspaceApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { toggleSidebarCollapsed } from '../../store/uiSlice';
import { useToast } from '../../hooks/useToast';
import { startWalletRecharge } from '../../services/walletCheckout';
import { useAuthUser } from '../../hooks/useAuthUser';

export default function PageShell({ title, subtitle, sections, children }) {
  const [activeSection, setActiveSection] = useState(sections?.[0]?.key || 'overview');
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [walletSummary, setWalletSummary] = useState(null);
  const [walletCharging, setWalletCharging] = useState(false);
  const planAccess = usePlanAccess();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((state) => state.ui.sidebarCollapsed);
  const { pushToast } = useToast();
  const { user } = useAuthUser();

  useEffect(() => {
    let active = true;
    const loadWallet = () =>
      getWalletSummary()
        .then((data) => {
          if (active) setWalletSummary(data);
        })
        .catch(() => {
          if (active) setWalletSummary(null);
        });
    loadWallet();
    const id = window.setInterval(loadWallet, 30000);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  const activeSectionLabel = useMemo(() => {
    const item = (sections || []).find((s) => s.key === activeSection);
    return item?.label || 'Overview';
  }, [sections, activeSection]);
  const sidebarSections = useMemo(
    () => (sections || []).filter((item) => !item.sidebarHidden),
    [sections]
  );

  const filteredSections = useMemo(() => {
    const q = commandQuery.trim().toLowerCase();
    if (!q) return sections || [];
    return (sections || []).filter((item) => item.label.toLowerCase().includes(q));
  }, [sections, commandQuery]);

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

  useEffect(() => {
    listNotifications(true)
      .then((items) => setUnreadCount(items.length))
      .catch(() => setUnreadCount(0));
  }, [activeSection]);

  useEffect(() => {
    const q = commandQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const id = window.setTimeout(() => {
      searchWorkspace(q)
        .then((items) => setSearchResults(items))
        .catch(() => setSearchResults([]));
    }, 180);
    return () => window.clearTimeout(id);
  }, [commandQuery]);

  async function handleQuickTopUp(credits) {
    setWalletCharging(true);
    try {
      const summary = await startWalletRecharge({
        credits,
        note: `Added ${credits} credits from sidebar wallet.`,
        prefill: {
          name: user?.full_name || user?.username,
          email: user?.email,
        },
      });
      setWalletSummary(summary);
      pushToast({ type: 'success', message: `${credits} credits added to wallet.` });
    } catch (error) {
      pushToast({ type: 'error', message: error?.message || 'Unable to add wallet credits.' });
    } finally {
      setWalletCharging(false);
    }
  }

  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar
        sections={sidebarSections}
        activeSection={activeSection}
        onChange={setActiveSection}
        collapsed={collapsed}
        onToggleCollapse={() => dispatch(toggleSidebarCollapsed())}
        walletSummary={walletSummary}
        walletCharging={walletCharging}
        onQuickTopUp={handleQuickTopUp}
      />
      <main className="shell-main">
        <Topbar
          title={title}
          subtitle={subtitle}
          activeSectionLabel={activeSectionLabel}
          onOpenCommandPalette={() => setCommandOpen(true)}
          onNavigateSection={setActiveSection}
          unreadCount={unreadCount}
        />
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
              {searchResults.length ? (
                <div className="command-result-group">
                  <p className="command-result-label">Workspace Results</p>
                  {searchResults.map((item) => (
                    <div key={`${item.type}-${item.id}`} className="command-result-row">
                      <span>{item.title}</span>
                      <small>{item.subtitle || item.type}</small>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <AiCoachChat enabled={planAccess.ai_chat} onWalletChange={setWalletSummary} />
    </div>
  );
}
