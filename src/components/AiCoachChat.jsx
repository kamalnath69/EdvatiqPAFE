import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Coins,
  KeyRound,
  Lock,
  MessageSquare,
  Send,
  Settings2,
  Volume2,
  Wallet,
} from 'lucide-react';
import {
  askCoach,
  getCoachConfig,
  getWalletSummary,
  updateCoachConfig,
} from '../services/chatApi';
import { getErrorMessage } from '../services/httpError';
import { useAuthUser } from '../hooks/useAuthUser';
import { startWalletRecharge } from '../services/walletCheckout';
import { buildRechargePresets } from '../utils/wallet';

const VOICE_STYLE_OPTIONS = [
  { value: 'calm', label: 'Calm' },
  { value: 'directive', label: 'Directive' },
  { value: 'energetic', label: 'Energetic' },
];

const STARTER_PROMPTS = [
  'What should I fix first in my posture?',
  'Give me a 10-minute drill for consistency.',
  'Summarize my biggest form issues.',
];

function buildIntroMessage(user) {
  const sport = user?.assigned_sport || 'your sport';
  return {
    role: 'assistant',
    text: `I'm your live AI coach for ${sport}. Ask for corrections, drills, or session review and I'll respond with practical guidance you can use right away.`,
  };
}

function formatBalance(value) {
  return `${Number(value || 0).toFixed(2)} credits`;
}

export default function AiCoachChat({ enabled = true, onWalletChange }) {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [buildIntroMessage(null)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [toppingUp, setToppingUp] = useState(false);
  const [config, setConfig] = useState({
    configured: false,
    api_key_masked: null,
    key_source: 'personal',
    platform_key_available: false,
    wallet_balance: 0,
    wallet_currency: 'credits',
    credit_rate_per_1k_tokens: 1,
    inr_per_credit: 1,
    suggested_top_up: 100,
    voice_enabled: true,
    live_guidance_enabled: true,
    voice_style: 'calm',
  });
  const [wallet, setWallet] = useState(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const scrollerRef = useRef(null);

  useEffect(() => {
    setMessages([buildIntroMessage(user)]);
  }, [user]);

  async function refreshWallet() {
    try {
      const summary = await getWalletSummary();
      setWallet(summary);
      if (onWalletChange) onWalletChange(summary);
      return summary;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    if (!open || !enabled) return;
    let active = true;
    setConfigLoading(true);
    Promise.allSettled([getCoachConfig(), refreshWallet()]).then((results) => {
      if (!active) return;
      const configResult = results[0];
      if (configResult.status === 'fulfilled') {
        setConfig(configResult.value);
      }
      setConfigLoading(false);
    });
    return () => {
      active = false;
    };
  }, [open, enabled]);

  useEffect(() => {
    if (!scrollerRef.current) return;
    scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages, loading]);

  const assistantOnlyMessages = useMemo(
    () => messages.filter((item) => item.role === 'assistant').length,
    [messages]
  );
  const topUpPresets = useMemo(
    () => buildRechargePresets(wallet?.suggested_top_up ?? config.suggested_top_up, 3),
    [wallet?.suggested_top_up, config.suggested_top_up]
  );

  const usingPlatformKey = config.key_source === 'platform';
  const canUseCoach = config.configured && (!usingPlatformKey || Number(wallet?.balance || config.wallet_balance || 0) > 0);

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      const data = await updateCoachConfig({
        api_key: apiKeyDraft.trim() || undefined,
        key_source: config.key_source,
        voice_enabled: config.voice_enabled,
        live_guidance_enabled: config.live_guidance_enabled,
        voice_style: config.voice_style,
      });
      setConfig(data);
      setApiKeyDraft('');
      setSettingsOpen(false);
      await refreshWallet();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: getErrorMessage(err, 'Unable to save AI coach settings.') },
      ]);
    } finally {
      setSavingConfig(false);
    }
  }

  async function handleTopUp(credits) {
    setToppingUp(true);
    try {
      const summary = await startWalletRecharge({
        credits,
        note: `Added ${credits} credits from AI Coach.`,
        prefill: {
          name: user?.full_name || user?.username,
          email: user?.email,
        },
      });
      setWallet(summary);
      if (onWalletChange) onWalletChange(summary);
      setConfig((prev) => ({ ...prev, wallet_balance: summary.balance }));
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Wallet updated. ${credits} credits were added and your new balance is ${formatBalance(summary.balance)}.` },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: getErrorMessage(err, 'Unable to add wallet credits right now.') },
      ]);
    } finally {
      setToppingUp(false);
    }
  }

  async function handleSend(seedText) {
    const text = (seedText ?? input).trim();
    if (!text || loading) return;
    const nextMessages = [...messages, { role: 'user', text }];
    if (!seedText) setInput('');
    setMessages(nextMessages);
    setLoading(true);
    try {
      const resp = await askCoach({
        messages: nextMessages,
        sport: user?.assigned_sport || '',
        student: user?.username || '',
        context: {
          role: user?.role || '',
          experience_level: user?.experience_level || '',
        },
      });
      const usageLine =
        resp.key_source === 'platform'
          ? `Default key used. ${resp.credits_charged || 0} credits consumed for ${resp.tokens_used || 0} tokens.`
          : 'Personal key used for this reply.';
      setMessages((prev) => [...prev, { role: 'assistant', text: `${resp.answer}\n\n${usageLine}` }]);
      setConfig((prev) => ({ ...prev, wallet_balance: resp.wallet_balance ?? prev.wallet_balance }));
      await refreshWallet();
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: getErrorMessage(err, 'Unable to reach AI coach right now.') },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!enabled) {
    return (
      <div className={`ai-coach locked ${open ? 'open' : ''}`}>
        <button type="button" className="ai-coach-toggle" onClick={() => setOpen((v) => !v)}>
          <Lock size={16} />
          <span>AI Coach (Pro)</span>
        </button>
        {open ? (
          <div className="ai-coach-panel ai-coach-panel-locked">
            <div className="ai-coach-header">
              <strong>AI Coach is locked</strong>
              <button type="button" className="ghost-button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <p className="help-text">Upgrade to a Pro plan to unlock conversational AI coaching and live voice guidance.</p>
            <Link className="primary-button" to="/pricing">View Plans</Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`ai-coach ${open ? 'open' : ''}`}>
      <button type="button" className="ai-coach-toggle" onClick={() => setOpen((v) => !v)}>
        <MessageSquare size={18} />
        <span>AI Coach</span>
        <span className="ai-coach-toggle-pill">{usingPlatformKey ? 'Wallet' : 'Personal'}</span>
      </button>
      {open ? (
        <div className="ai-coach-panel ai-coach-panel-rich ai-coach-panel-pro">
          <div className="ai-coach-header">
            <div>
              <strong>Performance AI Coach</strong>
              <p className="ai-coach-subtitle">
                Switch between your own OpenAI key and the platform key backed by wallet credits.
              </p>
            </div>
            <div className="ai-coach-head-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={() => setSettingsOpen((v) => !v)}
                title="Coach settings"
              >
                <Settings2 size={16} />
              </button>
              <button type="button" className="ghost-button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>

          <div className="ai-coach-mode-strip">
            <div className="ai-mode-card">
              <small>Key mode</small>
              <strong>{usingPlatformKey ? 'Default platform key' : 'Personal OpenAI key'}</strong>
            </div>
            <div className="ai-mode-card">
              <small>Wallet</small>
              <strong>{formatBalance(wallet?.balance ?? config.wallet_balance)}</strong>
            </div>
            <div className="ai-mode-card">
              <small>Rate</small>
              <strong>{config.credit_rate_per_1k_tokens} credit / 1K tokens</strong>
            </div>
          </div>

          {settingsOpen || (!config.configured && !configLoading) ? (
            <section className="ai-config-card ai-config-card-pro">
              <div className="ai-config-head">
                <div>
                  <h4>AI Source & Wallet</h4>
                  <p>Choose how the coach should run, then control voice and live guidance from the same panel.</p>
                </div>
                <span className="status-badge neutral">{config.api_key_masked || 'No personal key saved'}</span>
              </div>

              <div className="segmented-toggle">
                <button
                  type="button"
                  className={`segmented-toggle-item ${config.key_source === 'personal' ? 'active' : ''}`}
                  onClick={() => setConfig((prev) => ({ ...prev, key_source: 'personal' }))}
                >
                  <KeyRound size={15} />
                  Personal key
                </button>
                <button
                  type="button"
                  className={`segmented-toggle-item ${config.key_source === 'platform' ? 'active' : ''}`}
                  onClick={() => setConfig((prev) => ({ ...prev, key_source: 'platform' }))}
                  disabled={!config.platform_key_available}
                >
                  <Wallet size={15} />
                  Default key
                </button>
              </div>

              {config.key_source === 'personal' ? (
                <label className="field">
                  <span className="field-label">OpenAI API Key</span>
                  <input
                    type="password"
                    value={apiKeyDraft}
                    onChange={(e) => setApiKeyDraft(e.target.value)}
                    placeholder={config.api_key_masked ? 'Leave blank to keep current key' : 'sk-...'}
                  />
                </label>
              ) : (
                <div className="ai-wallet-panel">
                  <div className="ai-wallet-summary">
                    <div>
                      <small>Available balance</small>
                      <strong>{formatBalance(wallet?.balance ?? config.wallet_balance)}</strong>
                    </div>
                    <div>
                      <small>Platform key</small>
                      <strong>{config.platform_key_available ? 'Ready' : 'Unavailable'}</strong>
                    </div>
                  </div>
                  <div className="ai-wallet-topups">
                    {topUpPresets.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="ghost-button"
                        onClick={() => handleTopUp(preset)}
                        disabled={toppingUp}
                      >
                        <Coins size={15} />
                        Add {preset} credits
                      </button>
                    ))}
                  </div>
                  <small className="help-text">
                    {`Pricing set by admin: ₹${Number(config.inr_per_credit || 1).toFixed(2)} per credit.`}
                  </small>
                </div>
              )}

              <div className="ai-config-grid">
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={config.voice_enabled}
                    onChange={(e) => setConfig((prev) => ({ ...prev, voice_enabled: e.target.checked }))}
                  />
                  <span>Enable spoken guidance</span>
                </label>
                <label className="check-field">
                  <input
                    type="checkbox"
                    checked={config.live_guidance_enabled}
                    onChange={(e) => setConfig((prev) => ({ ...prev, live_guidance_enabled: e.target.checked }))}
                  />
                  <span>Enable live training cues</span>
                </label>
                <label className="field">
                  <span className="field-label">Coach style</span>
                  <select
                    value={config.voice_style}
                    onChange={(e) => setConfig((prev) => ({ ...prev, voice_style: e.target.value }))}
                  >
                    {VOICE_STYLE_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="ai-config-actions">
                <button type="button" className="primary-button" onClick={handleSaveConfig} disabled={savingConfig}>
                  {savingConfig ? 'Saving...' : 'Save Coach Settings'}
                </button>
              </div>
            </section>
          ) : null}

          {configLoading ? <p className="help-text">Loading coach settings...</p> : null}

          {!configLoading && !canUseCoach ? (
            <div className="ai-empty-state">
              <Bot size={18} />
              <div>
                <strong>
                  {usingPlatformKey
                    ? 'Add credits to use the default AI key.'
                    : 'Add your OpenAI key or switch to the default key.'}
                </strong>
                <p>
                  Personal mode uses your own API key. Default-key mode deducts credits from your workspace wallet based on token usage.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="ai-coach-insights">
                <span className="status-badge primary">Replies: {assistantOnlyMessages}</span>
                <span className="status-badge neutral">
                  <Volume2 size={14} />
                  Voice {config.voice_enabled ? 'On' : 'Off'}
                </span>
                <span className="status-badge neutral">{usingPlatformKey ? 'Default key active' : 'Personal key active'}</span>
              </div>

              <div ref={scrollerRef} className="ai-coach-messages ai-coach-messages-rich">
                {messages.map((msg, idx) => (
                  <article key={`${msg.role}-${idx}`} className={`ai-msg ${msg.role}`}>
                    <span className="ai-msg-role">{msg.role === 'assistant' ? 'Coach' : 'You'}</span>
                    <div>{msg.text}</div>
                  </article>
                ))}
                {loading ? (
                  <article className="ai-msg assistant ai-msg-loading">
                    <span className="ai-msg-role">Coach</span>
                    <div className="typing-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                  </article>
                ) : null}
              </div>

              <div className="ai-prompt-row">
                {STARTER_PROMPTS.map((prompt) => (
                  <button key={prompt} type="button" className="ai-chip-button" onClick={() => handleSend(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="ai-coach-input ai-coach-input-rich">
                <textarea
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask for immediate corrections, a drill plan, or a session review..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button type="button" className="primary-button" onClick={() => handleSend()} disabled={loading}>
                  <Send size={16} />
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
