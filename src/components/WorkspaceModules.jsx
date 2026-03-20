import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Coins,
  FileText,
  Flag,
  HelpCircle,
  KeyRound,
  Link2,
  Plus,
  Save,
  Shield,
  Star,
  Upload,
  Wallet,
} from 'lucide-react';
import DataTable from './ui/DataTable';
import EmptyState from './ui/EmptyState';
import FormField from './ui/FormField';
import StatusBadge from './ui/StatusBadge';
import { useWorkspaceCollection } from '../hooks/useWorkspaceCollection';
import { useAsyncState } from '../hooks/useAsyncState';
import { useDraftState } from '../hooks/useDraftState';
import { useToast } from '../hooks/useToast';
import {
  addFavorite,
  createHelpArticle,
  createAttachment,
  createCalendarEvent,
  createCoachReview,
  createInvite,
  createReport,
  createTrainingPlan,
  deleteHelpArticle,
  deleteFavorite,
  exportReport,
  getAcademySettings,
  getBillingWorkspace,
  getPlatformAiSettings,
  getSystemStatus,
  getWalletSummary,
  getWorkspaceSettings,
  listAttachments,
  listAuditLogs,
  listCalendarEvents,
  listCoachReviews,
  listFavorites,
  listHelpArticles,
  listInvites,
  listNotifications,
  listReports,
  listTrainingPlans,
  listWalletTransactions,
  markAllNotificationsRead,
  markNotificationRead,
  shareReport,
  updateHelpArticle,
  updateAcademySettings,
  updatePlatformAiSettings,
  updateTrainingPlanProgress,
  updateWorkspaceSettings,
} from '../services/workspaceApi';
import { startWalletRecharge } from '../services/walletCheckout';
import { SPORTS } from '../constants/sports';
import { getCoachConfig, updateCoachConfig } from '../services/chatApi';
import { buildRechargePresets } from '../utils/wallet';

function formatDateTime(value) {
  if (!value) return '--';
  const ms = Number(value) > 1_000_000_000_000 ? Number(value) : Number(value) * 1000;
  if (!Number.isFinite(ms)) return String(value);
  return new Date(ms).toLocaleString();
}

async function downloadReportPdf(report) {
  const [{ jsPDF }] = await Promise.all([import('jspdf')]);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const marginX = 16;
  let y = 18;
  const lineHeight = 7;

  function writeLine(text, opts = {}) {
    const { fontSize = 11, weight = 'normal', color = [23, 43, 77] } = opts;
    pdf.setFont('helvetica', weight);
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(String(text || ''), 178);
    pdf.text(lines, marginX, y);
    y += lines.length * lineHeight;
  }

  writeLine(report.title || 'Workspace Report', { fontSize: 20, weight: 'bold', color: [17, 24, 39] });
  writeLine(`Generated ${new Date().toLocaleString()}`, { fontSize: 9, color: [107, 114, 128] });
  y += 3;
  writeLine(`Scope: ${report.scope || 'personal'}`);
  writeLine(`Student: ${report.student || 'Academy-wide'}`);
  writeLine(`Sport: ${report.sport || '--'}`);
  writeLine(`Updated: ${formatDateTime(report.updated_at)}`);
  y += 3;
  writeLine('Summary', { fontSize: 13, weight: 'bold', color: [37, 99, 235] });
  writeLine(report.summary || 'No summary was saved for this report.');
  y += 2;
  writeLine('Saved Filters', { fontSize: 13, weight: 'bold', color: [37, 99, 235] });
  writeLine(JSON.stringify(report.filters || {}, null, 2), { fontSize: 9 });
  y += 2;
  writeLine('Metrics', { fontSize: 13, weight: 'bold', color: [37, 99, 235] });
  writeLine(JSON.stringify(report.metrics || {}, null, 2), { fontSize: 9 });
  y += 2;
  writeLine('Chart Configuration', { fontSize: 13, weight: 'bold', color: [37, 99, 235] });
  writeLine(JSON.stringify(report.chart_config || {}, null, 2), { fontSize: 9 });

  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `${String(report.title || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${stamp}.pdf`;
  pdf.save(fileName);
}

function WorkspaceSkeleton({ title = 'Loading workspace data...', embedded = false }) {
  const Tag = embedded ? 'div' : 'section';
  return (
    <Tag className={`${embedded ? '' : 'panel '}workspace-skeleton`.trim()}>
      <div className="workspace-skeleton-title">{title}</div>
      <div className="workspace-skeleton-grid">
        <div className="workspace-skeleton-card" />
        <div className="workspace-skeleton-card" />
        <div className="workspace-skeleton-card" />
      </div>
    </Tag>
  );
}

function SectionHeader({ title, description, badge }) {
  return (
    <div className="panel-header">
      <div>
        <h2 className="panel-title">{title}</h2>
        {description ? <p className="panel-subtitle">{description}</p> : null}
      </div>
      {badge ? <span className="status-badge primary">{badge}</span> : null}
    </div>
  );
}

export function WorkspaceFavoritesPanel() {
  const { pushToast } = useToast();
  const fetchFavorites = useCallback(() => listFavorites(), []);
  const favorites = useWorkspaceCollection(fetchFavorites);

  async function handleRemove(favoriteId) {
    try {
      await deleteFavorite(favoriteId);
      await favorites.refresh();
      pushToast({ type: 'success', message: 'Favorite removed.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to remove favorite.' });
    }
  }

  return (
    <section className="panel">
      <SectionHeader title="Favorites" description="Pinned sessions, reviews, and reports for quick access." badge={`${favorites.data.length} items`} />
      {favorites.loading && !favorites.data.length ? <WorkspaceSkeleton title="Loading favorites..." embedded /> : null}
      {!favorites.loading && !favorites.data.length ? (
        <EmptyState title="No favorites yet" description="Pin session history, reports, and reviews to build a quick-access rail." />
      ) : !favorites.loading ? (
        <div className="favorites-grid">
          {favorites.data.map((item) => (
            <article key={item.id} className="favorite-card">
              <div>
                <p className="favorite-card-title">{item.title}</p>
                <small>{item.subtitle || item.entity_type}</small>
              </div>
              <button type="button" className="ghost-button" onClick={() => handleRemove(item.id)}>
                Remove
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function WorkspaceNotificationsSection() {
  const { pushToast } = useToast();
  const [showUnread, setShowUnread] = useState(false);
  const fetchNotifications = useCallback(() => listNotifications(showUnread), [showUnread]);
  const notifications = useWorkspaceCollection(fetchNotifications, [showUnread]);

  async function handleRead(id) {
    try {
      await markNotificationRead(id);
      await notifications.refresh();
    } catch {
      pushToast({ type: 'error', message: 'Unable to update notification.' });
    }
  }

  async function handleReadAll() {
    try {
      await markAllNotificationsRead();
      await notifications.refresh();
      pushToast({ type: 'success', message: 'Notifications cleared.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to mark notifications as read.' });
    }
  }

  if (notifications.loading && !notifications.data.length) return <WorkspaceSkeleton title="Loading activity feed..." />;

  return (
    <section className="panel">
      <SectionHeader title="Notifications & Activity" description="Track plan changes, session saves, invites, and review actions." badge={`${notifications.data.filter((item) => !item.read).length} unread`} />
      <div className="table-toolbar">
        <button type="button" className={`ghost-button ${showUnread ? 'active' : ''}`} onClick={() => setShowUnread((prev) => !prev)}>
          {showUnread ? 'Show all' : 'Show unread'}
        </button>
        <button type="button" className="ghost-button" onClick={handleReadAll}>
          Mark all as read
        </button>
      </div>
      {!notifications.data.length ? (
        <EmptyState title="Inbox is clear" description="New session saves, rule changes, support replies, and invite actions will appear here." />
      ) : (
        <div className="activity-feed">
          {notifications.data.map((item) => (
            <article key={item.id} className={`activity-card ${item.read ? '' : 'unread'}`}>
              <div className="activity-card-icon">
                <Bell size={16} />
              </div>
              <div className="activity-card-copy">
                <p>{item.summary}</p>
                <small>
                  {item.action} · {formatDateTime(item.created_at)}
                </small>
              </div>
              {!item.read ? (
                <div className="activity-card-action">
                  <button type="button" className="ghost-button" onClick={() => handleRead(item.id)}>
                    Mark read
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export function WorkspaceSettingsSection({ canManageAcademy = false, canManagePlatform = false }) {
  const { pushToast } = useToast();
  const { data: settingsData, loading: settingsLoading, run: runSettings } = useAsyncState({ user: {}, academy: {} });
  const [coachConfig, setCoachConfig] = useState({
    configured: false,
    api_key_masked: null,
    key_source: 'personal',
    platform_key_available: false,
    wallet_balance: 0,
    credit_rate_per_1k_tokens: 1,
    inr_per_credit: 1,
    suggested_top_up: 100,
    voice_enabled: true,
    live_guidance_enabled: true,
    voice_style: 'calm',
  });
  const [platformConfig, setPlatformConfig] = useState({
    default_api_key_masked: null,
    platform_key_available: false,
    credit_rate_per_1k_tokens: 1,
    inr_per_credit: 1,
    suggested_top_up: 100,
    api_key_source: null,
  });
  const [walletSummary, setWalletSummary] = useState(null);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [platformApiKeyDraft, setPlatformApiKeyDraft] = useState('');
  const [savingCoach, setSavingCoach] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [userDraft, setUserDraft] = useDraftState('workspace.settings.user', {
    theme: 'light',
    density: 'comfortable',
    layout: 'workspace',
    quick_search_enabled: true,
    notifications_email: true,
    notifications_in_app: true,
    onboarding_seen: false,
    camera_defaults: { quality: 'balanced', mirrored: true },
    live_defaults: { voice_style: 'calm', auto_save: true },
  });
  const [academyDraft, setAcademyDraft] = useDraftState('workspace.settings.academy', {
    branding: { workspace_name: 'Edvatiq', accent: '#2563eb' },
    support: { email: 'support@edvatiq.com' },
    notification_defaults: { email_digest: 'daily', review_alerts: true },
    reminder_defaults: { session_reminder_minutes: 30 },
    sport_policies: {},
  });
  const topUpPresets = useMemo(
    () => buildRechargePresets(walletSummary?.suggested_top_up ?? coachConfig.suggested_top_up, 3),
    [walletSummary?.suggested_top_up, coachConfig.suggested_top_up]
  );

  const refresh = useCallback(async () => {
    const data = await runSettings(() => getWorkspaceSettings());
    setUserDraft(data.user);
    setAcademyDraft(data.academy);
    const [nextCoachConfig, nextWalletSummary, nextWalletTransactions, nextPlatformConfig] = await Promise.all([
      getCoachConfig().catch(() => null),
      getWalletSummary().catch(() => null),
      listWalletTransactions(6).catch(() => []),
      canManagePlatform ? getPlatformAiSettings().catch(() => null) : Promise.resolve(null),
    ]);
    if (nextCoachConfig) setCoachConfig(nextCoachConfig);
    if (nextWalletSummary) setWalletSummary(nextWalletSummary);
    setWalletTransactions(nextWalletTransactions);
    if (nextPlatformConfig) setPlatformConfig(nextPlatformConfig);
    return data;
  }, [canManagePlatform, runSettings, setAcademyDraft, setUserDraft]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  async function saveUserSettings() {
    try {
      await updateWorkspaceSettings(userDraft);
      pushToast({ type: 'success', message: 'Workspace settings saved.' });
      await refresh();
    } catch {
      pushToast({ type: 'error', message: 'Unable to save workspace settings.' });
    }
  }

  async function saveAcademySettings() {
    try {
      await updateAcademySettings(academyDraft);
      pushToast({ type: 'success', message: 'Academy settings saved.' });
      const academy = await getAcademySettings();
      setAcademyDraft(academy);
    } catch {
      pushToast({ type: 'error', message: 'Unable to save academy settings.' });
    }
  }

  async function saveCoachSettings() {
    setSavingCoach(true);
    try {
      const next = await updateCoachConfig({
        api_key: apiKeyDraft.trim() || undefined,
        key_source: coachConfig.key_source,
        voice_enabled: coachConfig.voice_enabled,
        live_guidance_enabled: coachConfig.live_guidance_enabled,
        voice_style: coachConfig.voice_style,
      });
      setCoachConfig(next);
      setApiKeyDraft('');
      await refresh();
      pushToast({ type: 'success', message: 'AI coach settings saved.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to save AI coach settings.' });
    } finally {
      setSavingCoach(false);
    }
  }

  async function handleWalletTopUp(credits) {
    setToppingUp(true);
    try {
      const summary = await startWalletRecharge({
        credits,
        note: `Added ${credits} credits from settings.`,
      });
      setWalletSummary(summary);
      await refresh();
      pushToast({ type: 'success', message: `${credits} credits added to wallet.` });
    } catch (error) {
      pushToast({ type: 'error', message: error?.message || 'Unable to add wallet credits.' });
    } finally {
      setToppingUp(false);
    }
  }

  async function savePlatformSettings() {
    setSavingPlatform(true);
    try {
      const nextPlatform = await updatePlatformAiSettings({
        default_api_key: platformApiKeyDraft.trim() || undefined,
        credit_rate_per_1k_tokens: Number(platformConfig.credit_rate_per_1k_tokens),
        inr_per_credit: Number(platformConfig.inr_per_credit),
        suggested_top_up: Number(platformConfig.suggested_top_up),
      });
      setPlatformConfig(nextPlatform);
      setPlatformApiKeyDraft('');
      await refresh();
      pushToast({ type: 'success', message: 'Platform AI settings saved.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to save platform AI settings.' });
    } finally {
      setSavingPlatform(false);
    }
  }

  if (settingsLoading && !settingsData.user) return <WorkspaceSkeleton title="Loading settings..." />;

  return (
    <div className="panel-grid">
      <section className="panel">
        <SectionHeader title="Preferences" description="Theme, layout density, quick search, and notification defaults." />
        <div className="form-grid">
          <FormField label="Theme">
            <select value={userDraft.theme || 'light'} onChange={(event) => setUserDraft((prev) => ({ ...prev, theme: event.target.value }))}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </FormField>
          <FormField label="Density">
            <select value={userDraft.density || 'comfortable'} onChange={(event) => setUserDraft((prev) => ({ ...prev, density: event.target.value }))}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </FormField>
          <FormField label="Layout">
            <select value={userDraft.layout || 'workspace'} onChange={(event) => setUserDraft((prev) => ({ ...prev, layout: event.target.value }))}>
              <option value="workspace">Workspace</option>
              <option value="focus">Focus</option>
            </select>
          </FormField>
          <FormField label="Camera Quality">
            <select
              value={userDraft.camera_defaults?.quality || 'balanced'}
              onChange={(event) =>
                setUserDraft((prev) => ({
                  ...prev,
                  camera_defaults: { ...(prev.camera_defaults || {}), quality: event.target.value },
                }))
              }
            >
              <option value="fast">Fast</option>
              <option value="balanced">Balanced</option>
              <option value="high">High</option>
            </select>
          </FormField>
          <label className="check-field">
            <input
              type="checkbox"
              checked={Boolean(userDraft.quick_search_enabled)}
              onChange={(event) => setUserDraft((prev) => ({ ...prev, quick_search_enabled: event.target.checked }))}
            />
            <span>Enable quick workspace search</span>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={Boolean(userDraft.notifications_email)}
              onChange={(event) => setUserDraft((prev) => ({ ...prev, notifications_email: event.target.checked }))}
            />
            <span>Email notifications</span>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={Boolean(userDraft.notifications_in_app)}
              onChange={(event) => setUserDraft((prev) => ({ ...prev, notifications_in_app: event.target.checked }))}
            />
            <span>In-app notifications</span>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={Boolean(userDraft.live_defaults?.auto_save)}
              onChange={(event) =>
                setUserDraft((prev) => ({
                  ...prev,
                  live_defaults: { ...(prev.live_defaults || {}), auto_save: event.target.checked },
                }))
              }
            />
            <span>Auto-save live sessions</span>
          </label>
          <div className="sticky-action-row">
            <button type="button" className="primary-button" onClick={saveUserSettings}>
              <Save size={16} /> Save Preferences
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <SectionHeader title="AI Coach & Wallet" description="Choose between your own API key and the platform key, then manage wallet credits in one place." />
        <div className="form-grid">
          <div className="settings-wallet-hero">
            <article className="settings-wallet-stat">
              <small>Wallet balance</small>
              <strong>{Number(walletSummary?.balance || coachConfig.wallet_balance || 0).toFixed(2)} credits</strong>
            </article>
            <article className="settings-wallet-stat">
              <small>Current source</small>
              <strong>{coachConfig.key_source === 'platform' ? 'Default platform key' : 'Personal key'}</strong>
            </article>
            <article className="settings-wallet-stat">
              <small>Usage rate</small>
              <strong>{coachConfig.credit_rate_per_1k_tokens} credit / 1K tokens</strong>
            </article>
            <article className="settings-wallet-stat">
              <small>Recharge rate</small>
              <strong>₹{Number(walletSummary?.inr_per_credit || coachConfig.inr_per_credit || 1).toFixed(2)} / credit</strong>
            </article>
          </div>

          <div className="segmented-toggle">
            <button
              type="button"
              className={`segmented-toggle-item ${coachConfig.key_source === 'personal' ? 'active' : ''}`}
              onClick={() => setCoachConfig((prev) => ({ ...prev, key_source: 'personal' }))}
            >
              <KeyRound size={15} />
              Personal key
            </button>
            <button
              type="button"
              className={`segmented-toggle-item ${coachConfig.key_source === 'platform' ? 'active' : ''}`}
              onClick={() => setCoachConfig((prev) => ({ ...prev, key_source: 'platform' }))}
              disabled={!coachConfig.platform_key_available}
            >
              <Wallet size={15} />
              Default key
            </button>
          </div>

          {coachConfig.key_source === 'personal' ? (
            <FormField label="OpenAI API Key">
              <input
                type="password"
                value={apiKeyDraft}
                onChange={(event) => setApiKeyDraft(event.target.value)}
                placeholder={coachConfig.api_key_masked ? 'Leave blank to keep current key' : 'sk-...'}
              />
            </FormField>
          ) : (
            <>
              <div className="wallet-topup-row">
                {topUpPresets.map((credits) => (
                  <button
                    key={credits}
                    type="button"
                    className="ghost-button"
                    onClick={() => handleWalletTopUp(credits)}
                    disabled={toppingUp}
                  >
                    <Coins size={15} />
                    {`Add ${credits} credits · ₹${(credits * Number(walletSummary?.inr_per_credit || coachConfig.inr_per_credit || 1)).toFixed(0)}`}
                  </button>
                ))}
              </div>
              <div className="wallet-transaction-list">
                {walletTransactions.length ? (
                  walletTransactions.map((item) => (
                    <article key={item.id} className="wallet-transaction-item">
                      <div>
                        <strong>{item.type === 'usage' ? 'AI usage charge' : 'Wallet top-up'}</strong>
                        <small>{formatDateTime(item.created_at)}</small>
                      </div>
                      <span className={item.type === 'usage' ? 'wallet-amount negative' : 'wallet-amount positive'}>
                        {item.type === 'usage' ? '' : '+'}
                        {Number(item.credits || 0).toFixed(2)}
                      </span>
                    </article>
                  ))
                ) : (
                  <p className="help-text">No wallet transactions yet.</p>
                )}
              </div>
            </>
          )}

          <label className="check-field">
            <input
              type="checkbox"
              checked={Boolean(coachConfig.voice_enabled)}
              onChange={(event) => setCoachConfig((prev) => ({ ...prev, voice_enabled: event.target.checked }))}
            />
            <span>Enable spoken guidance</span>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={Boolean(coachConfig.live_guidance_enabled)}
              onChange={(event) => setCoachConfig((prev) => ({ ...prev, live_guidance_enabled: event.target.checked }))}
            />
            <span>Enable live AI guidance</span>
          </label>
          <FormField label="Coach style">
            <select value={coachConfig.voice_style || 'calm'} onChange={(event) => setCoachConfig((prev) => ({ ...prev, voice_style: event.target.value }))}>
              <option value="calm">Calm</option>
              <option value="directive">Directive</option>
              <option value="energetic">Energetic</option>
            </select>
          </FormField>
          <div className="sticky-action-row">
            <button type="button" className="primary-button" onClick={saveCoachSettings} disabled={savingCoach}>
              <Save size={16} /> {savingCoach ? 'Saving...' : 'Save AI Settings'}
            </button>
          </div>
        </div>
      </section>

      {canManagePlatform ? (
        <section className="panel">
          <SectionHeader title="Platform AI Controls" description="Admins manage the default AI key, token-to-credit rate, recharge pricing, and suggested top-up from here." />
          <div className="form-grid">
            <div className="settings-wallet-hero">
              <article className="settings-wallet-stat">
                <small>Platform key</small>
                <strong>{platformConfig.platform_key_available ? 'Configured' : 'Missing'}</strong>
              </article>
              <article className="settings-wallet-stat">
                <small>Key source</small>
                <strong>{platformConfig.api_key_source || 'unset'}</strong>
              </article>
              <article className="settings-wallet-stat">
                <small>Suggested top-up</small>
                <strong>{Number(platformConfig.suggested_top_up || 0).toFixed(0)} credits</strong>
              </article>
            </div>
            <FormField label="Default Platform OpenAI API Key">
              <input
                type="password"
                value={platformApiKeyDraft}
                onChange={(event) => setPlatformApiKeyDraft(event.target.value)}
                placeholder={platformConfig.default_api_key_masked ? 'Leave blank to keep current platform key' : 'sk-...'}
              />
            </FormField>
            <FormField label="Credit Cost per 1K Tokens">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={platformConfig.credit_rate_per_1k_tokens ?? 1}
                onChange={(event) =>
                  setPlatformConfig((prev) => ({ ...prev, credit_rate_per_1k_tokens: event.target.value }))
                }
              />
            </FormField>
            <FormField label="INR per Credit">
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={platformConfig.inr_per_credit ?? 1}
                onChange={(event) => setPlatformConfig((prev) => ({ ...prev, inr_per_credit: event.target.value }))}
              />
            </FormField>
            <FormField label="Suggested Top-up Credits">
              <input
                type="number"
                min="1"
                step="1"
                value={platformConfig.suggested_top_up ?? 100}
                onChange={(event) => setPlatformConfig((prev) => ({ ...prev, suggested_top_up: event.target.value }))}
              />
            </FormField>
            <div className="settings-wallet-hero">
              {buildRechargePresets(platformConfig.suggested_top_up, 3).map((credits) => (
                <article key={credits} className="settings-wallet-stat">
                  <small>{credits} credits</small>
                  <strong>₹{(credits * Number(platformConfig.inr_per_credit || 1)).toFixed(0)}</strong>
                </article>
              ))}
            </div>
            <div className="sticky-action-row">
              <button type="button" className="primary-button" onClick={savePlatformSettings} disabled={savingPlatform}>
                <Save size={16} /> {savingPlatform ? 'Saving...' : 'Save Platform AI Settings'}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {canManageAcademy ? (
        <section className="panel">
          <SectionHeader title="Academy Settings" description="Branding, support contacts, default reminder windows, and review alerts." />
          <div className="form-grid">
            <FormField label="Workspace Name">
              <input
                value={academyDraft.branding?.workspace_name || ''}
                onChange={(event) =>
                  setAcademyDraft((prev) => ({
                    ...prev,
                    branding: { ...(prev.branding || {}), workspace_name: event.target.value },
                  }))
                }
              />
            </FormField>
            <FormField label="Accent Color">
              <input
                value={academyDraft.branding?.accent || ''}
                onChange={(event) =>
                  setAcademyDraft((prev) => ({
                    ...prev,
                    branding: { ...(prev.branding || {}), accent: event.target.value },
                  }))
                }
              />
            </FormField>
            <FormField label="Support Email">
              <input
                value={academyDraft.support?.email || ''}
                onChange={(event) =>
                  setAcademyDraft((prev) => ({
                    ...prev,
                    support: { ...(prev.support || {}), email: event.target.value },
                  }))
                }
              />
            </FormField>
            <FormField label="Session Reminder (minutes)">
              <input
                type="number"
                value={academyDraft.reminder_defaults?.session_reminder_minutes || 30}
                onChange={(event) =>
                  setAcademyDraft((prev) => ({
                    ...prev,
                    reminder_defaults: { ...(prev.reminder_defaults || {}), session_reminder_minutes: Number(event.target.value || 30) },
                  }))
                }
              />
            </FormField>
            <label className="check-field">
              <input
                type="checkbox"
                checked={Boolean(academyDraft.notification_defaults?.review_alerts)}
                onChange={(event) =>
                  setAcademyDraft((prev) => ({
                    ...prev,
                    notification_defaults: { ...(prev.notification_defaults || {}), review_alerts: event.target.checked },
                  }))
                }
              />
              <span>Send coach review alerts</span>
            </label>
            <div className="sticky-action-row">
              <button type="button" className="primary-button" onClick={saveAcademySettings}>
                <Shield size={16} /> Save Academy Settings
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function WorkspaceReportsSection({ students = [], role = 'student' }) {
  const { pushToast } = useToast();
  const fetchReports = useCallback(() => listReports(), []);
  const reports = useWorkspaceCollection(fetchReports);
  const [draft, setDraft, clearDraft] = useDraftState(`workspace.reports.${role}`, {
    title: '',
    student: '',
    sport: SPORTS[0],
    summary: '',
    scope: role === 'student' ? 'personal' : 'academy',
    time_window: '30d',
    audience: 'coach',
    highlights: '',
    risks: '',
    recommendation: '',
    include_comparison: true,
  });

  async function handleCreate() {
    try {
      await createReport({
        title: draft.title,
        student: draft.student || undefined,
        sport: draft.sport,
        summary: draft.summary,
        scope: draft.scope,
        metrics: {
          highlights: draft.highlights,
          risks: draft.risks,
          recommendation: draft.recommendation,
          audience: draft.audience,
        },
        filters: {
          time_window: draft.time_window,
          include_comparison: Boolean(draft.include_comparison),
        },
        chart_config: { time_window: draft.time_window, comparison: Boolean(draft.include_comparison) },
      });
      clearDraft();
      await reports.refresh();
      pushToast({ type: 'success', message: 'Report saved.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to create report.' });
    }
  }

  async function handleShare(reportId) {
    try {
      const data = await shareReport(reportId);
      await reports.refresh();
      pushToast({ type: 'success', message: `Share token ready: ${data.share_token}` });
    } catch {
      pushToast({ type: 'error', message: 'Unable to share report.' });
    }
  }

  async function handleExport(reportId) {
    try {
      const meta = await exportReport(reportId);
      const report = reports.data.find((item) => item.id === reportId);
      if (report) {
        await downloadReportPdf(report);
      }
      await reports.refresh();
      pushToast({ type: 'success', message: `PDF generated. Export log ${meta.id} saved.` });
    } catch {
      pushToast({ type: 'error', message: 'Unable to export report.' });
    }
  }

  return (
    <div className="panel-grid">
      <section className="panel">
        <SectionHeader title="Reports & Exports" description="Create progress snapshots, filter time windows, and generate coach-shareable exports." />
        <div className="form-grid">
          <FormField label="Report Title">
            <input value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="Quarterly progress summary" />
          </FormField>
          {role !== 'student' ? (
            <FormField label="Student">
              <select value={draft.student} onChange={(event) => setDraft((prev) => ({ ...prev, student: event.target.value }))}>
                <option value="">Academy-wide</option>
                {students.map((student) => (
                  <option key={student.username} value={student.username}>
                    {student.username}
                  </option>
                ))}
              </select>
            </FormField>
          ) : null}
          <FormField label="Sport">
            <select value={draft.sport} onChange={(event) => setDraft((prev) => ({ ...prev, sport: event.target.value }))}>
              {SPORTS.map((sport) => (
                <option key={sport} value={sport}>
                  {sport}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Summary">
            <textarea rows={4} value={draft.summary} onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))} placeholder="Trend highlights, improvement deltas, and coach notes." />
          </FormField>
          <FormField label="Time Window">
            <select value={draft.time_window} onChange={(event) => setDraft((prev) => ({ ...prev, time_window: event.target.value }))}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="season">Season to date</option>
            </select>
          </FormField>
          <FormField label="Audience">
            <select value={draft.audience} onChange={(event) => setDraft((prev) => ({ ...prev, audience: event.target.value }))}>
              <option value="coach">Coach</option>
              <option value="athlete">Athlete</option>
              <option value="academy">Academy leadership</option>
            </select>
          </FormField>
          <FormField label="Highlights">
            <textarea rows={3} value={draft.highlights} onChange={(event) => setDraft((prev) => ({ ...prev, highlights: event.target.value }))} placeholder="Consistency improved, release timing stabilized..." />
          </FormField>
          <FormField label="Risk Flags">
            <textarea rows={3} value={draft.risks} onChange={(event) => setDraft((prev) => ({ ...prev, risks: event.target.value }))} placeholder="Shoulder drift late in sessions, tracking drops under fatigue..." />
          </FormField>
          <FormField label="Recommendations">
            <textarea rows={3} value={draft.recommendation} onChange={(event) => setDraft((prev) => ({ ...prev, recommendation: event.target.value }))} placeholder="Add 2 anchor stability drills, compare week-over-week scores..." />
          </FormField>
          <label className="check-field">
            <input
              type="checkbox"
              checked={Boolean(draft.include_comparison)}
              onChange={(event) => setDraft((prev) => ({ ...prev, include_comparison: event.target.checked }))}
            />
            <span>Include comparison mode in saved chart config</span>
          </label>
          <div className="sticky-action-row">
            <button type="button" className="primary-button" onClick={handleCreate} disabled={!draft.title.trim()}>
              <FileText size={16} /> Save Report
            </button>
          </div>
        </div>
      </section>

      <DataTable
        title="Saved Reports"
        rows={reports.data}
        loading={reports.loading}
        emptyText="No reports saved yet."
        searchPlaceholder="Search reports"
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'student', label: 'Student', render: (row) => row.student || 'Academy' },
          { key: 'sport', label: 'Sport', render: (row) => row.sport || '--' },
          { key: 'scope', label: 'Scope' },
          { key: 'updated_at', label: 'Updated', render: (row) => formatDateTime(row.updated_at) },
          {
            key: 'actions',
            label: 'Actions',
            render: (row) => (
              <div className="table-inline-actions">
                <button type="button" className="ghost-button" onClick={() => handleShare(row.id)}>
                  Share
                </button>
                <button type="button" className="ghost-button" onClick={() => handleExport(row.id)}>
                  PDF
                </button>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}

export function WorkspaceTrainingPlansSection({ students = [], role = 'student' }) {
  const { pushToast } = useToast();
  const fetchPlans = useCallback(() => listTrainingPlans(), []);
  const plans = useWorkspaceCollection(fetchPlans);
  const [draft, setDraft, clearDraft] = useDraftState(`workspace.plans.${role}`, {
    title: '',
    student: '',
    sport: SPORTS[0],
    summary: '',
    weekly_focus: '',
    coach_comments: '',
    due_date: '',
  });

  async function handleCreate() {
    try {
      await createTrainingPlan({
        title: draft.title,
        student: draft.student || students[0]?.username,
        sport: draft.sport,
        summary: draft.summary,
        weekly_focus: draft.weekly_focus.split(',').map((item) => item.trim()).filter(Boolean),
        assigned_drills: [],
        target_metrics: {},
        coach_comments: draft.coach_comments,
        due_date: draft.due_date || undefined,
      });
      clearDraft();
      await plans.refresh();
      pushToast({ type: 'success', message: 'Training plan saved.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to save training plan.' });
    }
  }

  async function updateProgress(plan, progress) {
    try {
      await updateTrainingPlanProgress(plan.id, { progress, status: progress >= 100 ? 'completed' : 'active' });
      await plans.refresh();
      pushToast({ type: 'success', message: 'Progress updated.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to update progress.' });
    }
  }

  return (
    <div className="panel-grid">
      {role !== 'student' ? (
        <section className="panel">
          <SectionHeader title="Training Plans & Goals" description="Assign weekly focus, target metrics, and drills with draft autosave." />
          <div className="form-grid">
            <FormField label="Plan Title">
              <input value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="Week 12 form stability block" />
            </FormField>
            <FormField label="Student">
              <select value={draft.student} onChange={(event) => setDraft((prev) => ({ ...prev, student: event.target.value }))}>
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.username} value={student.username}>
                    {student.username}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Sport">
              <select value={draft.sport} onChange={(event) => setDraft((prev) => ({ ...prev, sport: event.target.value }))}>
                {SPORTS.map((sport) => (
                  <option key={sport} value={sport}>
                    {sport}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Weekly Focus (comma separated)">
              <input value={draft.weekly_focus} onChange={(event) => setDraft((prev) => ({ ...prev, weekly_focus: event.target.value }))} placeholder="anchor, release, spine angle" />
            </FormField>
            <FormField label="Summary">
              <textarea rows={4} value={draft.summary} onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))} />
            </FormField>
            <FormField label="Coach Comments">
              <textarea rows={3} value={draft.coach_comments} onChange={(event) => setDraft((prev) => ({ ...prev, coach_comments: event.target.value }))} />
            </FormField>
            <FormField label="Due Date">
              <input type="date" value={draft.due_date} onChange={(event) => setDraft((prev) => ({ ...prev, due_date: event.target.value }))} />
            </FormField>
            <div className="sticky-action-row">
              <button type="button" className="primary-button" onClick={handleCreate} disabled={!draft.title.trim() || !draft.student}>
                <Flag size={16} /> Save Training Plan
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <SectionHeader title="Active Goals" description="Monitor weekly targets, completion status, and assigned drills." badge={`${plans.data.filter((item) => item.status !== 'completed').length} active`} />
        {plans.loading && !plans.data.length ? <WorkspaceSkeleton title="Loading training plans..." embedded /> : !plans.data.length ? (
          <EmptyState title="No training plans yet" description="Assigned weekly plans and goal checklists will show up here." />
        ) : (
          <div className="goal-board">
            {plans.data.map((plan) => (
              <article key={plan.id} className="goal-card">
                <div className="goal-card-head">
                  <div>
                    <p className="goal-title">{plan.title}</p>
                    <small>
                      {plan.student} · {plan.sport || 'General'}
                    </small>
                  </div>
                  <StatusBadge value={plan.status || 'active'} />
                </div>
                <p className="goal-summary">{plan.summary || 'No summary yet.'}</p>
                <div className="progress-strip">
                  <div className="progress-strip-fill" style={{ width: `${Math.min(Number(plan.progress || 0), 100)}%` }} />
                </div>
                <div className="goal-card-foot">
                  <span>{plan.progress || 0}% complete</span>
                  <div className="table-inline-actions">
                    {[25, 50, 75, 100].map((value) => (
                      <button key={value} type="button" className="ghost-button" onClick={() => updateProgress(plan, value)}>
                        {value}%
                      </button>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export function WorkspaceCoachReviewSection({ students = [], sessions = [], role = 'staff' }) {
  const { pushToast } = useToast();
  const fetchReviews = useCallback(() => listCoachReviews(), []);
  const reviews = useWorkspaceCollection(fetchReviews);
  const fetchAttachments = useCallback(() => listAttachments({ entity_type: 'coach_review' }), []);
  const attachments = useWorkspaceCollection(fetchAttachments);
  const [draft, setDraft, clearDraft] = useDraftState(`workspace.reviews.${role}`, {
    title: '',
    student: '',
    sport: SPORTS[0],
    primary_session_id: '',
    comparison_session_id: '',
    summary: '',
    notes: '',
    approval_state: 'draft',
  });
  const [attachmentDraft, setAttachmentDraft] = useState({ entity_id: '', filename: '', external_url: '', notes: '' });

  const filteredSessions = useMemo(
    () => sessions.filter((session) => !draft.student || session.student === draft.student),
    [draft.student, sessions]
  );

  async function handleCreateReview() {
    try {
      await createCoachReview({
        ...draft,
        annotations: [],
        key_frames: [],
        attachments: [],
      });
      clearDraft();
      await reviews.refresh();
      pushToast({ type: 'success', message: 'Coach review saved.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to save coach review.' });
    }
  }

  async function handleAttachment() {
    try {
      await createAttachment({
        entity_type: 'coach_review',
        entity_id: attachmentDraft.entity_id,
        filename: attachmentDraft.filename,
        external_url: attachmentDraft.external_url,
        notes: attachmentDraft.notes,
        media_type: 'link',
        upload_status: 'ready',
      });
      setAttachmentDraft({ entity_id: '', filename: '', external_url: '', notes: '' });
      await attachments.refresh();
      pushToast({ type: 'success', message: 'Attachment metadata added.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to add attachment.' });
    }
  }

  async function handleFavorite(review) {
    try {
      await addFavorite({
        entity_type: 'coach_review',
        entity_id: review.id,
        title: review.title,
        subtitle: review.student,
        href: '/dashboard',
        icon: 'review',
      });
      pushToast({ type: 'success', message: 'Review pinned to favorites.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to pin review.' });
    }
  }

  return (
    <div className="panel-grid">
      {role !== 'student' ? (
        <section className="panel">
          <SectionHeader title="Coach Review Desk" description="Compare sessions side by side, annotate key moments, and approve athlete progress." />
          <div className="form-grid">
            <FormField label="Review Title">
              <input value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="March alignment checkpoint" />
            </FormField>
            <FormField label="Student">
              <select value={draft.student} onChange={(event) => setDraft((prev) => ({ ...prev, student: event.target.value }))}>
                <option value="">Select student</option>
                {students.map((student) => (
                  <option key={student.username} value={student.username}>
                    {student.username}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Primary Session">
              <select value={draft.primary_session_id} onChange={(event) => setDraft((prev) => ({ ...prev, primary_session_id: event.target.value }))}>
                <option value="">Select session</option>
                {filteredSessions.map((session) => (
                  <option key={session.id || `${session.student}-${session.timestamp}`} value={session.id}>
                    {session.student} · {session.sport} · {formatDateTime(session.timestamp)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Comparison Session">
              <select value={draft.comparison_session_id} onChange={(event) => setDraft((prev) => ({ ...prev, comparison_session_id: event.target.value }))}>
                <option value="">Optional comparison</option>
                {filteredSessions.map((session) => (
                  <option key={session.id || `${session.student}-${session.timestamp}`} value={session.id}>
                    {session.student} · {session.sport} · {formatDateTime(session.timestamp)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Approval State">
              <select value={draft.approval_state} onChange={(event) => setDraft((prev) => ({ ...prev, approval_state: event.target.value }))}>
                <option value="draft">Draft</option>
                <option value="needs_work">Needs work</option>
                <option value="approved">Approved</option>
              </select>
            </FormField>
            <FormField label="Summary">
              <textarea rows={3} value={draft.summary} onChange={(event) => setDraft((prev) => ({ ...prev, summary: event.target.value }))} />
            </FormField>
            <FormField label="Structured Notes">
              <textarea rows={5} value={draft.notes} onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Frame 18: elbow line stable. Frame 32: chin lift adds drift." />
            </FormField>
            <div className="sticky-action-row">
              <button type="button" className="primary-button" onClick={handleCreateReview} disabled={!draft.title.trim() || !draft.student}>
                <Plus size={16} /> Save Review
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel">
        <SectionHeader title="Saved Reviews" description="Pinned feedback, approval state, and linked attachments." badge={`${reviews.data.length} reviews`} />
        {reviews.loading && !reviews.data.length ? <WorkspaceSkeleton title="Loading coach reviews..." embedded /> : null}
        {!reviews.loading ? <div className="review-list">
          {reviews.data.map((review) => (
            <article key={review.id} className="review-card">
              <div className="review-card-head">
                <div>
                  <p className="review-title">{review.title}</p>
                  <small>
                    {review.student} · {formatDateTime(review.updated_at)}
                  </small>
                </div>
                <div className="table-inline-actions">
                  <StatusBadge value={review.approval_state || 'draft'} />
                  <button type="button" className="ghost-button" onClick={() => handleFavorite(review)}>
                    <Star size={14} /> Pin
                  </button>
                </div>
              </div>
              <p className="goal-summary">{review.summary || review.notes || 'No notes yet.'}</p>
            </article>
          ))}
        </div> : null}
        {role !== 'student' ? (
          <div className="form-grid" style={{ marginTop: '1rem' }}>
            <FormField label="Attach to Review">
              <select value={attachmentDraft.entity_id} onChange={(event) => setAttachmentDraft((prev) => ({ ...prev, entity_id: event.target.value }))}>
                <option value="">Select review</option>
                {reviews.data.map((review) => (
                  <option key={review.id} value={review.id}>
                    {review.title}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Filename">
              <input value={attachmentDraft.filename} onChange={(event) => setAttachmentDraft((prev) => ({ ...prev, filename: event.target.value }))} placeholder="frame-18-analysis.png" />
            </FormField>
            <FormField label="File URL">
              <input value={attachmentDraft.external_url} onChange={(event) => setAttachmentDraft((prev) => ({ ...prev, external_url: event.target.value }))} placeholder="https://..." />
            </FormField>
            <FormField label="Notes">
              <input value={attachmentDraft.notes} onChange={(event) => setAttachmentDraft((prev) => ({ ...prev, notes: event.target.value }))} placeholder="Key-frame link or external storage reference" />
            </FormField>
            <div className="sticky-action-row">
              <button type="button" className="ghost-button" onClick={handleAttachment} disabled={!attachmentDraft.entity_id || !attachmentDraft.filename}>
                <Upload size={16} /> Add Attachment Metadata
              </button>
            </div>
          </div>
        ) : null}
        {attachments.data.length ? (
          <div className="attachment-list">
            {attachments.data.map((item) => (
              <div key={item.id} className="attachment-item">
                <span>{item.filename}</span>
                <small>{item.external_url || item.notes || 'Stored metadata only'}</small>
              </div>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

export function WorkspaceCalendarSection({ students = [], role = 'student' }) {
  const { pushToast } = useToast();
  const fetchEvents = useCallback(() => listCalendarEvents(), []);
  const events = useWorkspaceCollection(fetchEvents);
  const [draft, setDraft, clearDraft] = useDraftState(`workspace.calendar.${role}`, {
    title: '',
    student: '',
    event_type: 'training',
    start_at: '',
    end_at: '',
    description: '',
    location: '',
  });

  async function handleCreateEvent() {
    try {
      await createCalendarEvent({
        title: draft.title,
        student: draft.student || undefined,
        event_type: draft.event_type,
        start_at: new Date(draft.start_at).getTime() / 1000,
        end_at: new Date(draft.end_at).getTime() / 1000,
        description: draft.description,
        location: draft.location,
        attendees: draft.student ? [draft.student] : [],
        status: 'scheduled',
      });
      clearDraft();
      await events.refresh();
      pushToast({ type: 'success', message: 'Calendar event created.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to create calendar event.' });
    }
  }

  return (
    <div className="panel-grid">
      {role !== 'student' ? (
        <section className="panel">
          <SectionHeader title="Calendar & Schedule" description="Track upcoming sessions, academy blocks, demo bookings, and reminders." />
          <div className="form-grid">
            <FormField label="Title">
              <input value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} placeholder="High-volume release clinic" />
            </FormField>
            <FormField label="Student">
              <select value={draft.student} onChange={(event) => setDraft((prev) => ({ ...prev, student: event.target.value }))}>
                <option value="">Academy / team event</option>
                {students.map((student) => (
                  <option key={student.username} value={student.username}>
                    {student.username}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Event Type">
              <select value={draft.event_type} onChange={(event) => setDraft((prev) => ({ ...prev, event_type: event.target.value }))}>
                <option value="training">Training</option>
                <option value="review">Coach review</option>
                <option value="demo">Booked demo</option>
                <option value="reminder">Reminder</option>
              </select>
            </FormField>
            <FormField label="Start">
              <input type="datetime-local" value={draft.start_at} onChange={(event) => setDraft((prev) => ({ ...prev, start_at: event.target.value }))} />
            </FormField>
            <FormField label="End">
              <input type="datetime-local" value={draft.end_at} onChange={(event) => setDraft((prev) => ({ ...prev, end_at: event.target.value }))} />
            </FormField>
            <FormField label="Location">
              <input value={draft.location} onChange={(event) => setDraft((prev) => ({ ...prev, location: event.target.value }))} placeholder="Range A / Virtual" />
            </FormField>
            <FormField label="Description">
              <textarea rows={3} value={draft.description} onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))} />
            </FormField>
            <div className="sticky-action-row">
              <button type="button" className="primary-button" onClick={handleCreateEvent} disabled={!draft.title || !draft.start_at || !draft.end_at}>
                <CalendarDays size={16} /> Save Event
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <DataTable
        title="Schedule"
        rows={events.data}
        loading={events.loading}
        emptyText="No calendar items scheduled yet."
        searchPlaceholder="Search schedule"
        columns={[
          { key: 'title', label: 'Title' },
          { key: 'event_type', label: 'Type' },
          { key: 'student', label: 'Student', render: (row) => row.student || 'Academy' },
          { key: 'start_at', label: 'Start', render: (row) => formatDateTime(row.start_at) },
          { key: 'end_at', label: 'End', render: (row) => formatDateTime(row.end_at) },
          { key: 'location', label: 'Location', render: (row) => row.location || '--' },
        ]}
      />
    </div>
  );
}

export function WorkspaceHelpSection({ canManage = false }) {
  const { pushToast } = useToast();
  const [query, setQuery] = useState('');
  const fetchArticles = useCallback(() => listHelpArticles(), []);
  const articles = useWorkspaceCollection(fetchArticles);
  const [draft, setDraft, clearDraft] = useDraftState('workspace.help.article', {
    id: '',
    title: '',
    body: '',
    category: 'general',
    audience: 'all',
    order: 0,
    published: true,
  });

  async function handleSaveArticle() {
    try {
      const payload = {
        title: draft.title,
        body: draft.body,
        category: draft.category,
        audience: draft.audience,
        order: Number(draft.order || 0),
        published: Boolean(draft.published),
      };
      if (draft.id) {
        await updateHelpArticle(draft.id, payload);
        pushToast({ type: 'success', message: 'Help article updated.' });
      } else {
        await createHelpArticle(payload);
        pushToast({ type: 'success', message: 'Help article created.' });
      }
      clearDraft();
      await articles.refresh();
    } catch {
      pushToast({ type: 'error', message: 'Unable to save help article.' });
    }
  }

  async function handleDeleteArticle(articleId) {
    try {
      await deleteHelpArticle(articleId);
      await articles.refresh();
      if (draft.id === articleId) clearDraft();
      pushToast({ type: 'success', message: 'Help article deleted.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to delete help article.' });
    }
  }
  const results = articles.data.filter((article) => `${article.title} ${article.body} ${article.category} ${article.audience}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="panel-grid">
      {canManage ? (
        <section className="panel">
          <SectionHeader title="Manage Help Articles" description="Admins can publish, reorder, and update in-app docs dynamically." />
          <div className="form-grid">
            <FormField label="Title">
              <input value={draft.title} onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))} />
            </FormField>
            <FormField label="Category">
              <input value={draft.category} onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))} />
            </FormField>
            <FormField label="Audience">
              <select value={draft.audience} onChange={(event) => setDraft((prev) => ({ ...prev, audience: event.target.value }))}>
                <option value="all">All</option>
                <option value="student">Student</option>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </FormField>
            <FormField label="Display Order">
              <input type="number" value={draft.order} onChange={(event) => setDraft((prev) => ({ ...prev, order: event.target.value }))} />
            </FormField>
            <FormField label="Body">
              <textarea rows={8} value={draft.body} onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))} />
            </FormField>
            <label className="check-field">
              <input type="checkbox" checked={Boolean(draft.published)} onChange={(event) => setDraft((prev) => ({ ...prev, published: event.target.checked }))} />
              <span>Published</span>
            </label>
            <div className="sticky-action-row">
              <button type="button" className="primary-button" onClick={handleSaveArticle} disabled={!draft.title.trim() || !draft.body.trim()}>
                <Save size={16} /> {draft.id ? 'Update Article' : 'Create Article'}
              </button>
              {draft.id ? (
                <button type="button" className="ghost-button" onClick={clearDraft}>
                  Reset
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}
      <section className="panel">
        <SectionHeader title="Help & Docs" description="Searchable in-app guidance, onboarding, and workspace tips." badge={`${results.length} articles`} />
        {articles.loading && !articles.data.length ? <WorkspaceSkeleton title="Loading help articles..." embedded /> : null}
        <div className="table-toolbar">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search help articles" />
        </div>
        {!articles.loading ? <div className="help-grid">
          {results.map((article) => (
            <article key={article.id} className="help-card">
              <div className="help-card-head">
                <div>
                  <p>{article.title}</p>
                  <small>{article.category} · {article.audience}</small>
                </div>
                {canManage ? (
                  <div className="table-inline-actions">
                    <button type="button" className="ghost-button" onClick={() => setDraft({ ...article })}>
                      Edit
                    </button>
                    <button type="button" className="ghost-button" onClick={() => handleDeleteArticle(article.id)}>
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
              <small>{article.body}</small>
            </article>
          ))}
        </div> : null}
      </section>
    </div>
  );
}

export function WorkspaceAuditSection() {
  const [filters, setFilters] = useState({ actor: '', entity_type: '', action: '' });
  const fetchLogs = useCallback(() => listAuditLogs(filters), [filters]);
  const logs = useWorkspaceCollection(fetchLogs, [filters.actor, filters.entity_type, filters.action]);
  return (
    <section className="panel">
      <SectionHeader title="Audit Log" description="Trace rule edits, session changes, invites, and billing actions." badge={`${logs.data.length} entries`} />
      <div className="form-inline">
        <FormField label="Actor">
          <input value={filters.actor} onChange={(event) => setFilters((prev) => ({ ...prev, actor: event.target.value }))} placeholder="username" />
        </FormField>
        <FormField label="Entity">
          <input value={filters.entity_type} onChange={(event) => setFilters((prev) => ({ ...prev, entity_type: event.target.value }))} placeholder="session, invite..." />
        </FormField>
        <FormField label="Action">
          <input value={filters.action} onChange={(event) => setFilters((prev) => ({ ...prev, action: event.target.value }))} placeholder="rules.updated" />
        </FormField>
      </div>
      <DataTable
        rows={logs.data}
        loading={logs.loading}
        emptyText="No audit activity recorded yet."
        searchPlaceholder="Search audit entries"
        columns={[
          { key: 'created_at', label: 'Time', render: (row) => formatDateTime(row.created_at) },
          { key: 'actor', label: 'Actor' },
          { key: 'action', label: 'Action' },
          { key: 'entity_type', label: 'Entity' },
          { key: 'summary', label: 'Summary' },
        ]}
      />
    </section>
  );
}

export function WorkspaceBillingSection() {
  const { data: billingData, loading: billingLoading, run: runBilling } = useAsyncState(null);
  const refresh = useCallback(() => runBilling(() => getBillingWorkspace()), [runBilling]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  if (billingLoading && !billingData) return <WorkspaceSkeleton title="Loading billing workspace..." />;
  const data = billingData || { available_plans: [], payment_history: [] };

  return (
    <div className="panel-grid">
      <section className="panel">
        <SectionHeader title="Subscription Management" description="Current plan, feature entitlements, and organization context." />
        {data.current_plan ? (
          <div className="billing-hero">
            <div>
              <p className="billing-plan-name">{data.current_plan.name}</p>
              <small>{data.current_plan.description}</small>
            </div>
            <StatusBadge value={data.current_plan.tier || data.current_plan.plan_type || 'active'} />
          </div>
        ) : (
          <EmptyState title="No active plan" description="Choose a plan to unlock analytics, AI coaching, and academy management features." />
        )}
        <div className="billing-plan-grid">
          {data.available_plans.map((plan) => (
            <article key={plan.code} className="billing-plan-card">
              <div className="billing-plan-head">
                <p>{plan.name}</p>
                <span>INR {plan.amount_inr}</span>
              </div>
              <small>{plan.description}</small>
              <ul className="mini-list">
                {(plan.features || []).map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <DataTable
        title="Payment History"
        rows={data.payment_history || []}
        loading={billingLoading && !(data.payment_history || []).length}
        emptyText="Payments will appear here once subscriptions are activated."
        columns={[
          { key: 'created_at', label: 'Date', render: (row) => formatDateTime(row.created_at) },
          { key: 'username', label: 'User' },
          { key: 'plan_code', label: 'Plan' },
          { key: 'plan_tier', label: 'Tier' },
          { key: 'razorpay_payment_id', label: 'Payment ID' },
        ]}
      />
    </div>
  );
}

export function WorkspaceSystemSection() {
  const { data: systemData, loading: systemLoading, run: runSystem } = useAsyncState(null);
  const refresh = useCallback(() => runSystem(() => getSystemStatus()), [runSystem]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  if (systemLoading && !systemData) return <WorkspaceSkeleton title="Loading system diagnostics..." />;
  const status = systemData;
  if (!status) return null;
  return (
    <div className="panel-grid">
      <section className="panel">
        <SectionHeader title="System Status & Integrations" description="Internal diagnostics for database, email, billing, and AI readiness." />
        <div className="stats-grid">
          <article className="stat-card">
            <div className="stat-head">
              <p>Database</p>
            </div>
            <h3>{status.database_ok ? 'Healthy' : 'Issue'}</h3>
            <small>Mongo connectivity</small>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p>Email</p>
            </div>
            <h3>{status.email_configured ? 'Configured' : 'Missing'}</h3>
            <small>SMTP delivery</small>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p>Billing</p>
            </div>
            <h3>{status.razorpay_configured ? 'Configured' : 'Missing'}</h3>
            <small>Razorpay keys</small>
          </article>
          <article className="stat-card">
            <div className="stat-head">
              <p>AI</p>
            </div>
            <h3>{status.ai_configured ? 'Configured' : 'Missing'}</h3>
            <small>Coach intelligence</small>
          </article>
        </div>
      </section>
      <section className="panel">
        <SectionHeader title="Feature Flags" description="Enabled internal capabilities in the current environment." />
        <div className="favorites-grid">
          {status.enabled_features.map((feature) => (
            <article key={feature} className="favorite-card">
              <div>
                <p className="favorite-card-title">{feature}</p>
                <small>Enabled</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export function WorkspaceInviteSection({ defaultRole = 'student', academyId = '' }) {
  const { pushToast } = useToast();
  const fetchInvites = useCallback(() => listInvites(), []);
  const invites = useWorkspaceCollection(fetchInvites);
  const [draft, setDraft, clearDraft] = useDraftState(`workspace.invites.${defaultRole}`, {
    email: '',
    full_name: '',
    role: defaultRole,
    message: '',
  });

  async function handleCreate() {
    try {
      await createInvite({ ...draft, academy_id: academyId || undefined });
      clearDraft();
      await invites.refresh();
      pushToast({ type: 'success', message: 'Invite sent.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to send invite.' });
    }
  }

  return (
    <div className="panel-grid">
      <section className="panel">
        <SectionHeader title="Invites & Onboarding" description="Send email invites to staff, academy admins, and students with tracked status." />
        <div className="form-grid">
          <FormField label="Email">
            <input value={draft.email} onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))} placeholder="person@academy.com" />
          </FormField>
          <FormField label="Full Name">
            <input value={draft.full_name} onChange={(event) => setDraft((prev) => ({ ...prev, full_name: event.target.value }))} placeholder="Athlete name" />
          </FormField>
          <FormField label="Role">
            <select value={draft.role} onChange={(event) => setDraft((prev) => ({ ...prev, role: event.target.value }))}>
              <option value="student">student</option>
              <option value="staff">staff</option>
              <option value="academy_admin">academy_admin</option>
            </select>
          </FormField>
          <FormField label="Message">
            <textarea rows={3} value={draft.message} onChange={(event) => setDraft((prev) => ({ ...prev, message: event.target.value }))} />
          </FormField>
          <div className="sticky-action-row">
            <button type="button" className="primary-button" onClick={handleCreate} disabled={!draft.email}>
              <Link2 size={16} /> Send Invite
            </button>
          </div>
        </div>
      </section>
      <DataTable
        title="Pending Invites"
        rows={invites.data}
        loading={invites.loading}
        emptyText="No invites have been sent yet."
        searchPlaceholder="Search invites"
        columns={[
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
          { key: 'created_at', label: 'Created', render: (row) => formatDateTime(row.created_at) },
          { key: 'expires_at', label: 'Expires', render: (row) => formatDateTime(row.expires_at) },
        ]}
      />
    </div>
  );
}
