import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, KeyRound, Lock, MessageSquare, Send, Settings2, Sparkles, Volume2 } from 'lucide-react';
import { askCoach, getCoachConfig, updateCoachConfig } from '../services/chatApi';
import { getErrorMessage } from '../services/httpError';
import { useAuthUser } from '../hooks/useAuthUser';

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
    text: `I’m your live AI coach for ${sport}. Ask for corrections, drills, or a session review and I’ll respond like an actual coach, not a placeholder.`,
  };
}

export default function AiCoachChat({ enabled = true }) {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState(() => [buildIntroMessage(null)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [config, setConfig] = useState({
    configured: false,
    api_key_masked: null,
    voice_enabled: true,
    live_guidance_enabled: true,
    voice_style: 'calm',
  });
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const scrollerRef = useRef(null);

  useEffect(() => {
    setMessages([buildIntroMessage(user)]);
  }, [user]);

  useEffect(() => {
    if (!open || !enabled) return;
    let active = true;
    setConfigLoading(true);
    getCoachConfig()
      .then((data) => {
        if (!active) return;
        setConfig(data);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setConfigLoading(false);
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

  async function handleSaveConfig() {
    setSavingConfig(true);
    try {
      const data = await updateCoachConfig({
        api_key: apiKeyDraft.trim() || undefined,
        voice_enabled: config.voice_enabled,
        live_guidance_enabled: config.live_guidance_enabled,
        voice_style: config.voice_style,
      });
      setConfig(data);
      setApiKeyDraft('');
      setSettingsOpen(false);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: getErrorMessage(err, 'Unable to save AI coach settings.') },
      ]);
    } finally {
      setSavingConfig(false);
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
      setMessages((prev) => [...prev, { role: 'assistant', text: resp.answer }]);
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
        {config.configured ? <Sparkles size={16} /> : <KeyRound size={16} />}
      </button>
      {open ? (
        <div className="ai-coach-panel ai-coach-panel-rich">
          <div className="ai-coach-header">
            <div>
              <strong>Performance Coach</strong>
              <p className="ai-coach-subtitle">
                Conversational coaching backed by your own OpenAI API key.
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

          {settingsOpen || (!config.configured && !configLoading) ? (
            <section className="ai-config-card">
              <div className="ai-config-head">
                <div>
                  <h4>Coach Setup</h4>
                  <p>Paste your OpenAI API key once. It will be stored server-side and masked in the UI.</p>
                </div>
                {config.api_key_masked ? <span className="status-badge neutral">{config.api_key_masked}</span> : null}
              </div>
              <label className="field">
                <span className="field-label">OpenAI API Key</span>
                <input
                  type="password"
                  value={apiKeyDraft}
                  onChange={(e) => setApiKeyDraft(e.target.value)}
                  placeholder={config.configured ? 'Leave blank to keep current key' : 'sk-...'}
                />
              </label>
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

          {!configLoading && !config.configured ? (
            <div className="ai-empty-state">
              <Bot size={18} />
              <div>
                <strong>Add your OpenAI API key to activate the coach.</strong>
                <p>The coach will then use your current role, sport, and session context for real answers.</p>
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
                <span className="status-badge neutral">Style: {config.voice_style}</span>
              </div>

              <div ref={scrollerRef} className="ai-coach-messages ai-coach-messages-rich">
                {messages.map((msg, idx) => (
                  <article key={`${msg.role}-${idx}`} className={`ai-msg ${msg.role}`}>
                    <span className="ai-msg-role">{msg.role === 'assistant' ? 'Coach' : 'You'}</span>
                    <div>{msg.text}</div>
                  </article>
                ))}
                {loading ? (
                  <article className="ai-msg assistant">
                    <span className="ai-msg-role">Coach</span>
                    <div>Thinking through your training context...</div>
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
