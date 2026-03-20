import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Sparkles, Volume2 } from 'lucide-react';
import { getCoachConfig, getLiveCoachGuidance } from '../services/chatApi';
import { getErrorMessage } from '../services/httpError';
import { usePlanAccess } from '../hooks/usePlanAccess';
import { createGuidanceSignal, getLiveCoachPolicy } from '../constants/liveCoachPolicies';

function speakCue(text, style) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  if (style === 'directive') {
    utterance.rate = 1.03;
    utterance.pitch = 0.9;
  } else if (style === 'energetic') {
    utterance.rate = 1.08;
    utterance.pitch = 1.05;
  } else {
    utterance.rate = 0.96;
    utterance.pitch = 1;
  }
  window.speechSynthesis.speak(utterance);
}

export default function LiveCoachAssist({
  liveRunning,
  fullscreen = false,
  active = true,
  sport,
  student,
  feedback = [],
  angles = {},
  sessionScore = null,
  phase = '',
  repCount = null,
  trackingQuality = '',
  drillFocus = '',
  customNote = '',
  pushToast,
  onGuidanceChange,
}) {
  const planAccess = usePlanAccess();
  const [config, setConfig] = useState(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [guidance, setGuidance] = useState(null);
  const lastRequestAtRef = useRef(0);
  const lastSignalKeyRef = useRef('');
  const lastSpokenCueRef = useRef('');
  const suspendUntilRef = useRef(0);

  useEffect(() => {
    let active = true;
    setLoadingConfig(true);
    getCoachConfig()
      .then((data) => {
        if (!active) return;
        setConfig(data);
      })
      .catch(() => {
        if (!active) return;
        setConfig(null);
      })
      .finally(() => {
        if (active) setLoadingConfig(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const reducedAngles = useMemo(() => {
    const entries = Object.entries(angles || {}).slice(0, 6);
    return Object.fromEntries(entries);
  }, [angles]);
  const signal = useMemo(
    () =>
      createGuidanceSignal({
        sport,
        student,
        feedback,
        sessionScore,
        phase,
        repCount,
        trackingQuality,
      }),
    [sport, student, feedback, sessionScore, phase, repCount, trackingQuality]
  );

  useEffect(() => {
    const policy = getLiveCoachPolicy(sport);
    suspendUntilRef.current = Date.now() + policy.fullscreenSuspendMs;
  }, [fullscreen, sport]);

  useEffect(() => {
    if (onGuidanceChange) onGuidanceChange(guidance);
  }, [guidance, onGuidanceChange]);

  async function requestGuidance(manual = false) {
    if (!planAccess.ai_chat) return;
    if (!active) return;
    if (!config?.configured || !config?.live_guidance_enabled) return;
    if (!sport || !student) return;
    if (!manual && !liveRunning) return;
    const feedbackSet = feedback.filter(Boolean).slice(0, 5);
    if (!manual && feedbackSet.length === 0 && sessionScore == null) return;

    const now = Date.now();
    if (!manual && now < suspendUntilRef.current) return;
    if (!manual) {
      if (signal.key === lastSignalKeyRef.current) return;
      if (now - lastRequestAtRef.current < signal.policy.minRequestIntervalMs) return;
    }

    setRequesting(true);
    try {
      const resp = await getLiveCoachGuidance({
        sport,
        student,
        feedback: feedbackSet,
        angles: reducedAngles,
        session_score: sessionScore,
        phase,
        rep_count: repCount,
        tracking_quality: trackingQuality,
        drill_focus: drillFocus,
        custom_note: customNote,
        fingerprint: signal.key,
        trigger_reason: manual ? 'manual' : 'significant_change',
      });
      lastRequestAtRef.current = now;
      lastSignalKeyRef.current = signal.key;
      setGuidance(resp);
      if (config.voice_enabled && resp.speak_now && resp.cue && lastSpokenCueRef.current !== resp.cue) {
        speakCue(resp.cue, config.voice_style);
        lastSpokenCueRef.current = resp.cue;
      }
    } catch (err) {
      if (manual && pushToast) {
        pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to reach live AI coach.') });
      }
    } finally {
      setRequesting(false);
    }
  }

  useEffect(() => {
    requestGuidance(false);
  }, [liveRunning, signal.key, reducedAngles, active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!planAccess.ai_chat) {
    return (
      <section className="panel ai-live-card">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Live AI Coach</h2>
            <p className="panel-subtitle">Upgrade to Pro to unlock spoken coaching cues during training.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel ai-live-card">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">Live AI Coach</h2>
          <p className="panel-subtitle">Context-aware cues generated from your active training session.</p>
        </div>
        <div className="panel-actions">
          {config?.voice_enabled ? (
            <span className="status-badge neutral">
              <Volume2 size={14} />
              Voice on
            </span>
          ) : null}
          {!active ? <span className="status-badge neutral">Session guidance off</span> : null}
          <button
            type="button"
            className="ghost-button"
            onClick={() => requestGuidance(true)}
            disabled={requesting || loadingConfig || !active}
          >
            {requesting ? 'Coaching...' : 'Coach Me Now'}
          </button>
        </div>
      </div>

      {loadingConfig ? <p className="help-text">Loading coach settings...</p> : null}
      {!loadingConfig && !config?.configured ? (
        <div className="ai-live-empty">
          <Bot size={18} />
          <div>
            <strong>Finish AI setup in the coach panel to activate live guidance.</strong>
            <p>Use your own API key or switch to the default platform key with wallet credits.</p>
          </div>
        </div>
      ) : null}

      {config?.configured ? (
        <div className="ai-live-grid">
          <article className={`ai-live-cue ${guidance?.urgency || 'medium'}`}>
            <div className="ai-live-label">
              <Sparkles size={16} />
              <span>Current cue</span>
            </div>
            <strong>{guidance?.cue || 'Start a live session or request a cue manually.'}</strong>
            <p>{guidance?.summary || 'The coach will watch score, phase, and live corrections to keep prompts timely.'}</p>
          </article>
          <div className="metrics-grid compact">
            <article className="metric-tile">
              <p>Style</p>
              <strong>{config.voice_style || 'calm'}</strong>
            </article>
            <article className="metric-tile">
              <p>Source</p>
              <strong>{config.key_source === 'platform' ? 'Wallet' : 'Personal'}</strong>
            </article>
            <article className="metric-tile">
              <p>Guidance</p>
              <strong>{active ? (config.live_guidance_enabled ? 'Auto' : 'Manual only') : 'Disabled'}</strong>
            </article>
            <article className="metric-tile">
              <p>Feedback</p>
              <strong>{signal.categories.length}</strong>
            </article>
            <article className="metric-tile">
              <p>Phase</p>
              <strong>{phase || '--'}</strong>
            </article>
          </div>
        </div>
      ) : null}
      <p className="help-text">Voice guidance uses synthetic speech generated on your device from the AI coach cue.</p>
    </section>
  );
}
