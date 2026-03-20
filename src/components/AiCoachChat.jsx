import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Lock,
  MessageSquare,
  Mic,
  MicOff,
  Send,
  Settings2,
} from 'lucide-react';
import {
  askCoach,
  getCoachConfig,
  getWalletSummary,
} from '../services/chatApi';
import { getErrorMessage } from '../services/httpError';
import { useAuthUser } from '../hooks/useAuthUser';

function buildIntroMessage(user) {
  const sport = user?.assigned_sport || 'your sport';
  return {
    role: 'assistant',
    text: `I'm your AI coach for ${sport}. Ask for corrections, drills, or a quick session review and I'll keep the guidance concise and practical.`,
  };
}

function formatBalance(value) {
  return `${Number(value || 0).toFixed(2)} credits`;
}

function getUserInitials(user) {
  const source = `${user?.full_name || user?.username || 'You'}`.trim();
  if (!source) return 'U';
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
    .slice(0, 2);
}

function getProfileImage(user) {
  const value = user?.profile_image;
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

export default function AiCoachChat({ enabled = true, onWalletChange, onOpenSettings }) {
  const { user } = useAuthUser();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(() => [buildIntroMessage(null)]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
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
  const scrollerRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);

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

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    setVoiceSupported(Boolean(SpeechRecognition));
    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.onresult = null;
        speechRecognitionRef.current.onerror = null;
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop?.();
        speechRecognitionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (open) return;
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.onresult = null;
      speechRecognitionRef.current.onerror = null;
      speechRecognitionRef.current.onend = null;
      speechRecognitionRef.current.stop?.();
      speechRecognitionRef.current = null;
    }
    setVoiceListening(false);
  }, [open]);

  const userInitials = useMemo(() => getUserInitials(user), [user]);
  const profileImage = useMemo(() => getProfileImage(user), [user]);

  const usingPlatformKey = config.key_source === 'platform';
  const canUseCoach =
    config.configured &&
    (!usingPlatformKey || Number(wallet?.balance || config.wallet_balance || 0) > 0);

  function handleOpenSettings() {
    setOpen(false);
    onOpenSettings?.();
  }

  function handleVoiceInput() {
    if (loading) return;
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;
    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Voice input is not supported in this browser.' },
      ]);
      return;
    }
    if (voiceListening && speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    speechRecognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      setInput(transcript);
    };
    recognition.onerror = () => {
      setVoiceListening(false);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: 'Voice capture failed. Please try again or type your question.' },
      ]);
    };
    recognition.onend = () => {
      setVoiceListening(false);
      speechRecognitionRef.current = null;
    };
    setVoiceListening(true);
    recognition.start();
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
          ? `${resp.credits_charged || 0} credits used for ${resp.tokens_used || 0} tokens on the default key`
          : 'Answered using your personal key';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: resp.answer, usage: usageLine },
      ]);
      setConfig((prev) => ({
        ...prev,
        wallet_balance: resp.wallet_balance ?? prev.wallet_balance,
      }));
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
            <p className="help-text">
              Upgrade to a Pro plan to unlock conversational AI coaching and live voice guidance.
            </p>
            <Link className="primary-button" to="/pricing">
              View Plans
            </Link>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`ai-coach ${open ? 'open' : ''}`}>
      <button type="button" className="ai-coach-toggle" onClick={() => setOpen((v) => !v)}>
        <span className="ai-coach-toggle-icon">
          <MessageSquare size={18} />
        </span>
        <span className="ai-coach-toggle-copy">
          <strong>AI Coach</strong>
          <small>Ask for drills and corrections</small>
        </span>
        <span className="ai-coach-toggle-pill">{usingPlatformKey ? 'Wallet' : 'Personal'}</span>
      </button>
      {open ? (
        <div className="ai-coach-panel ai-coach-panel-rich ai-coach-panel-pro">
          <div className="ai-coach-header">
            <div className="ai-coach-brand">
              <span className="ai-msg-avatar assistant">
                <Bot size={16} />
              </span>
              <div>
                <strong>Performance AI Coach</strong>
              </div>
            </div>
            <div className="ai-coach-head-actions">
              <button
                type="button"
                className="ghost-button"
                onClick={handleOpenSettings}
                title="Coach settings"
              >
                <Settings2 size={16} />
              </button>
              <button type="button" className="ghost-button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>

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
                  Personal mode uses your own API key. Default-key mode deducts credits from your
                  workspace wallet based on token usage.
                </p>
                <div className="button-row" style={{ marginTop: '0.7rem' }}>
                  <button type="button" className="primary-button" onClick={handleOpenSettings}>
                    Open Settings
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div ref={scrollerRef} className="ai-coach-messages ai-coach-messages-rich">
                {messages.map((msg, idx) => (
                  <article key={`${msg.role}-${idx}`} className={`ai-msg-row ${msg.role}`}>
                    {msg.role === 'assistant' ? (
                      <span className="ai-msg-avatar assistant">
                        <Bot size={16} />
                      </span>
                    ) : profileImage ? (
                      <img className="ai-msg-avatar user photo" src={profileImage} alt={user?.username || 'User'} />
                    ) : (
                      <span className="ai-msg-avatar user">
                        {userInitials}
                      </span>
                    )}
                    <div className={`ai-msg ${msg.role}`}>
                      <span className="ai-msg-role">{msg.role === 'assistant' ? 'Coach' : 'You'}</span>
                      <div className="ai-msg-text">{msg.text}</div>
                      {msg.usage ? <div className="ai-msg-meta">{msg.usage}</div> : null}
                    </div>
                  </article>
                ))}
                {loading ? (
                  <article className="ai-msg-row assistant">
                    <span className="ai-msg-avatar assistant">
                      <Bot size={16} />
                    </span>
                    <div className="ai-msg assistant ai-msg-loading">
                      <span className="ai-msg-role">Coach</span>
                      <div className="typing-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                    </div>
                  </article>
                ) : null}
              </div>

              <div className="ai-coach-input ai-coach-input-rich">
                <div className="ai-input-shell">
                  <textarea
                    rows={2}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask for immediate corrections, a drill plan, or a short session review..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                </div>
                {voiceSupported ? (
                  <button
                    type="button"
                    className={`ghost-button ai-voice-button ${voiceListening ? 'listening' : ''}`}
                    onClick={handleVoiceInput}
                    aria-label={voiceListening ? 'Stop voice input' : 'Start voice input'}
                    title={voiceListening ? 'Stop voice input' : 'Start voice input'}
                  >
                    {voiceListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                ) : null}
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
