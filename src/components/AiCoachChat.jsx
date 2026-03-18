import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, MessageSquare, Send } from 'lucide-react';
import { askCoach } from '../services/chatApi';
import { getErrorMessage } from '../services/httpError';

export default function AiCoachChat({ enabled = true }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ask me about posture, form, or session improvements.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  if (!enabled) {
    return (
      <div className={`ai-coach locked ${open ? 'open' : ''}`}>
        <button type="button" className="ai-coach-toggle" onClick={() => setOpen((v) => !v)}>
          <Lock size={16} />
          <span>AI Coach (Pro)</span>
        </button>
        {open ? (
          <div className="ai-coach-panel">
            <div className="ai-coach-header">
              <strong>AI Coach is locked</strong>
              <button type="button" className="ghost-button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <p className="help-text">Upgrade to a Pro plan to unlock AI coaching guidance.</p>
            <Link className="primary-button" to="/pricing">View Plans</Link>
          </div>
        ) : null}
      </div>
    );
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    try {
      const resp = await askCoach(text);
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

  return (
    <div className={`ai-coach ${open ? 'open' : ''}`}>
      <button type="button" className="ai-coach-toggle" onClick={() => setOpen((v) => !v)}>
        <MessageSquare size={18} />
        <span>AI Coach</span>
      </button>
      {open ? (
        <div className="ai-coach-panel">
          <div className="ai-coach-header">
            <strong>Performance Coach</strong>
            <button type="button" className="ghost-button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
          <div className="ai-coach-messages">
            {messages.map((msg, idx) => (
              <div key={`${msg.role}-${idx}`} className={`ai-msg ${msg.role}`}>
                {msg.text}
              </div>
            ))}
          </div>
          <div className="ai-coach-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for form improvements..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend();
              }}
            />
            <button type="button" className="primary-button" onClick={handleSend} disabled={loading}>
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
