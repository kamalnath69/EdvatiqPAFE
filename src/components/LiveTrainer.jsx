import { useEffect, useMemo, useRef, useState } from 'react';
import FormField from './ui/FormField';
import Modal from './ui/Modal';
import { useLivePose } from '../hooks/useLivePose';
import { createSession } from '../services/sessionsApi';
import { getErrorMessage } from '../services/httpError';
import { getRules } from '../services/rulesApi';
import { SPORTS } from '../constants/sports';
import { ANGLE_METRICS } from '../constants/angles';
import { useToast } from '../hooks/useToast';

function drawOverlay(canvas, payload, fitMode = 'cover', xOffsetPct = 0, yOffsetPct = 0, zoomPct = 100) {
  const ctx = canvas.getContext('2d');
  const { coords, normalized_coords: normalizedCoords, connections, analysis, frame_width: fw, frame_height: fh } = payload || {};
  const viewWidth = canvas.clientWidth || canvas.width;
  const viewHeight = canvas.clientHeight || canvas.height;
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  if (!coords || !connections || !fw || !fh) return;

  let scaleX = viewWidth / fw;
  let scaleY = viewHeight / fh;
  let offsetX = 0;
  let offsetY = 0;

  if (fitMode === 'cover' || fitMode === 'contain') {
    const scale = fitMode === 'cover' ? Math.max(viewWidth / fw, viewHeight / fh) : Math.min(viewWidth / fw, viewHeight / fh);
    scaleX = scale;
    scaleY = scale;
    offsetX = (viewWidth - fw * scale) / 2;
    offsetY = (viewHeight - fh * scale) / 2;
  }

  const zoomFactor = Math.max(0.5, Math.min(1.8, Number(zoomPct) / 100 || 1));
  if (zoomFactor !== 1) {
    const prevW = fw * scaleX;
    const prevH = fh * scaleY;
    scaleX *= zoomFactor;
    scaleY *= zoomFactor;
    offsetX -= (fw * scaleX - prevW) / 2;
    offsetY -= (fh * scaleY - prevH) / 2;
  }

  const renderedWidth = fw * scaleX;
  const xOffsetPx = (viewWidth * xOffsetPct) / 100;
  const yOffsetPx = (viewHeight * yOffsetPct) / 100;
  const point = (idx) => {
    const key = String(idx);
    const np = normalizedCoords ? normalizedCoords[key] || normalizedCoords[idx] : null;
    if (np) {
      const rx = np[0] * fw * scaleX + offsetX;
      const ry = np[1] * fh * scaleY + offsetY;
      return [2 * offsetX + renderedWidth - rx + xOffsetPx, ry + yOffsetPx];
    }
    const cp = coords[key] || coords[idx];
    if (!cp) return null;
    const rx = cp[0] * scaleX + offsetX;
    const ry = cp[1] * scaleY + offsetY;
    return [2 * offsetX + renderedWidth - rx + xOffsetPx, ry + yOffsetPx];
  };

  const jointStatus = {};
  const jointNotes = {};
  (analysis || []).forEach((item) => {
    const j = Number(item.joint);
    if (!Number.isFinite(j)) return;
    if (!(j in jointStatus)) jointStatus[j] = true;
    jointStatus[j] = jointStatus[j] && Boolean(item.correct);
    if (!item.correct && item.message) {
      if (!jointNotes[j]) jointNotes[j] = [];
      jointNotes[j].push(String(item.message));
    }
  });

  const drawLink = (a, b, color, width = 9) => {
    const p1 = point(a);
    const p2 = point(b);
    if (!p1 || !p2) return;
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  const leftColor = 'rgba(34, 197, 94, 0.95)';
  const rightColor = 'rgba(14, 165, 233, 0.95)';
  const neutralColor = 'rgba(245, 179, 49, 0.9)';

  connections.forEach(([a, b]) => {
    const bothLeft = [11, 13, 15, 23, 25, 27, 29, 31].includes(a) && [11, 13, 15, 23, 25, 27, 29, 31].includes(b);
    const bothRight = [12, 14, 16, 24, 26, 28, 30, 32].includes(a) && [12, 14, 16, 24, 26, 28, 30, 32].includes(b);
    const c = bothLeft ? leftColor : bothRight ? rightColor : neutralColor;
    drawLink(a, b, c, 9);
  });

  const lShoulder = point(11);
  const rShoulder = point(12);
  const lHip = point(23);
  const rHip = point(24);
  const lKnee = point(25);
  const rKnee = point(26);
  if (lShoulder && rShoulder && lHip && rHip) {
    const shoulderMid = [(lShoulder[0] + rShoulder[0]) / 2, (lShoulder[1] + rShoulder[1]) / 2];
    const hipMid = [(lHip[0] + rHip[0]) / 2, (lHip[1] + rHip[1]) / 2];
    const kneeMid = lKnee && rKnee ? [(lKnee[0] + rKnee[0]) / 2, (lKnee[1] + rKnee[1]) / 2] : null;
    const spineCheck = (analysis || []).find((item) => String(item.name || '').toLowerCase().includes('spine'));
    const spineColor = spineCheck && spineCheck.correct === false ? 'rgba(239, 68, 68, 0.98)' : 'rgba(16, 185, 129, 0.98)';

    ctx.lineWidth = 12;
    ctx.strokeStyle = spineColor;
    ctx.shadowColor = spineColor;
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.moveTo(shoulderMid[0], shoulderMid[1]);
    ctx.lineTo(hipMid[0], hipMid[1]);
    if (kneeMid) ctx.lineTo(kneeMid[0], kneeMid[1]);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = spineColor;
    [shoulderMid, hipMid, kneeMid].filter(Boolean).forEach((p) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 9, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  Object.entries(coords).forEach(([idx]) => {
    const jointIdx = Number(idx);
    const isCorrect = jointStatus[jointIdx] ?? true;
    const p = point(jointIdx);
    if (!p) return;
    const isHandJoint = [15, 16, 17, 18, 19, 20, 21, 22].includes(jointIdx);
    ctx.beginPath();
    ctx.fillStyle = isCorrect ? '#22c55e' : '#ef4444';
    const radius = isHandJoint ? (isCorrect ? 10 : 12) : (isCorrect ? 7.5 : 9);
    ctx.arc(p[0], p[1], radius, 0, Math.PI * 2);
    ctx.fill();
  });

  const drawJointNote = (jointIdx, notes) => {
    const anchor = point(jointIdx);
    if (!anchor || !Array.isArray(notes) || !notes.length) return;
    const text = notes[0];
    ctx.font = '600 13px Manrope, sans-serif';
    const padX = 9;
    const padY = 6;
    const textW = ctx.measureText(text).width;
    const boxW = Math.min(viewWidth - 14, textW + padX * 2);
    const boxH = 24;
    const rawX = anchor[0] + 14;
    const rawY = anchor[1] - 14;
    const x = Math.max(8, Math.min(rawX, viewWidth - boxW - 8));
    const y = Math.max(8, Math.min(rawY, viewHeight - boxH - 8));

    ctx.fillStyle = 'rgba(36, 10, 10, 0.9)';
    ctx.strokeStyle = '#ff5d5d';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd3d3';
    ctx.fillText(text, x + padX, y + boxH - padY - 1, boxW - padX * 2);
  };

  Object.entries(jointNotes).forEach(([jointIdx, notes]) => {
    drawJointNote(Number(jointIdx), notes);
  });
}

export default function LiveTrainer({
  token,
  defaultSport = 'Archery',
  canSaveSession = false,
  defaultStudent = '',
  enforceAssignedSport = false,
  studentOptions = [],
}) {
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const stageRef = useRef(null);
  const clockRef = useRef({ startMs: null, pausedMs: 0, pauseStartMs: null });

  const [sport, setSport] = useState(defaultSport || '');
  const [student, setStudent] = useState(defaultStudent || '');
  const { pushToast } = useToast();
  const [fullscreen, setFullscreen] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(true);
  const [customNote, setCustomNote] = useState('');
  const [drillFocus, setDrillFocus] = useState('');
  const [intensityRpe, setIntensityRpe] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [pendingSessionPayload, setPendingSessionPayload] = useState(null);
  const [savingSession, setSavingSession] = useState(false);
  const [fsCorrectionsOpen, setFsCorrectionsOpen] = useState(true);
  const [fsAnglesOpen, setFsAnglesOpen] = useState(true);
  const [fsCameraOpen, setFsCameraOpen] = useState(true);
  const [fsCalibrateOpen, setFsCalibrateOpen] = useState(false);

  const [overlayXOffsetPct, setOverlayXOffsetPct] = useState(() => {
    const raw = window.localStorage.getItem('live.overlay.xOffsetPct');
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [overlayYOffsetPct, setOverlayYOffsetPct] = useState(() => {
    const raw = window.localStorage.getItem('live.overlay.yOffsetPct');
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  });
  const [overlayZoomPct, setOverlayZoomPct] = useState(() => {
    const raw = window.localStorage.getItem('live.overlay.zoomPct');
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 100;
  });

  const live = useLivePose();
  const feedback = useMemo(() => live.analysis?.feedback || [], [live.analysis]);
  const topFeedback = useMemo(() => feedback.slice(0, 6), [feedback]);
  const angleEntries = useMemo(() => {
    const raw = live.analysis?.angles || {};
    return ANGLE_METRICS.map((item) => {
      const value = raw[item.label];
      return { key: item.id, label: item.label, value: Number.isFinite(Number(value)) ? Number(value) : null };
    }).filter((item) => item.value !== null);
  }, [live.analysis]);
  const advanced = useMemo(() => live.analysis?.advanced || {}, [live.analysis]);
  const cameraIntel = useMemo(() => live.analysis?.camera || {}, [live.analysis]);
  const framing = useMemo(() => live.analysis?.framing || {}, [live.analysis]);
  const training = useMemo(() => live.analysis?.training || {}, [live.analysis]);
  const sessionScore = useMemo(() => {
    const score = Number(training?.session_summary?.session_score);
    return Number.isFinite(score) ? score : null;
  }, [training]);
  const overlayFitMode = fullscreen ? 'contain' : 'cover';

  function getElapsedSeconds(nowMs = Date.now()) {
    const c = clockRef.current;
    if (!c.startMs) return 0;
    const activePause = c.pauseStartMs ? nowMs - c.pauseStartMs : 0;
    const effective = nowMs - c.startMs - c.pausedMs - activePause;
    return Math.max(0, Math.floor(effective / 1000));
  }

  function resetSessionClock() {
    clockRef.current = { startMs: null, pausedMs: 0, pauseStartMs: null };
    setElapsedSec(0);
  }

  function buildLiveSessionPayload(endedAtMs) {
    if (!canSaveSession) return null;
    if (!student.trim()) return null;
    if (!live.analysis?.angles) return null;

    const startedAtMs = clockRef.current.startMs || endedAtMs;
    const currentTraining = live.analysis?.training || {};
    const summary = currentTraining?.session_summary || {};

    return {
      student: student.trim(),
      sport: live.analysis?.sport || sport,
      angles: live.analysis.angles,
      feedback: [
        ...feedback.filter(Boolean),
        currentTraining?.rep_count ? `Rep count: ${currentTraining.rep_count}` : null,
        currentTraining?.best_rep?.score ? `Best rep score: ${currentTraining.best_rep.score}` : null,
      ].filter(Boolean),
      custom_note: [
        customNote.trim() || null,
        currentTraining?.phase ? `Phase: ${currentTraining.phase}` : null,
        currentTraining?.best_rep
          ? `Best rep #${currentTraining.best_rep.index} [${currentTraining.best_rep.start_s}s-${currentTraining.best_rep.end_s}s], score ${currentTraining.best_rep.score}`
          : null,
      ]
        .filter(Boolean)
        .join(' | ') || null,
      drill_focus: drillFocus.trim() || null,
      started_at: startedAtMs / 1000,
      ended_at: endedAtMs / 1000,
      duration_minutes: Math.max(1, Math.round(getElapsedSeconds(endedAtMs) / 60)),
      intensity_rpe: intensityRpe ? Number(intensityRpe) : null,
      tags: tagsText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
      session_score: summary?.session_score ?? null,
      score_breakdown: summary?.score_breakdown || null,
      rep_summary: {
        total_reps: currentTraining?.rep_count ?? 0,
        best_rep_score: currentTraining?.best_rep?.score ?? null,
        best_rep_index: currentTraining?.best_rep?.index ?? null,
      },
      phase_summary: summary?.phase_distribution || null,
      best_rep: currentTraining?.best_rep || null,
      best_frame: summary?.best_frame || null,
      camera_summary: {
        exposure: cameraIntel?.exposure ?? null,
        brightness: cameraIntel?.brightness ?? null,
        sharpness: cameraIntel?.sharpness ?? null,
        tracking_quality: advanced?.tracking_quality ?? null,
        framing: framing?.status ?? null,
        distance: framing?.distance ?? null,
        occlusion: live.analysis?.occlusion ?? null,
        visibility_score: live.analysis?.visibility_score ?? null,
      },
      movement_summary: summary?.movement || {
        body_speed_px_s: advanced?.body_speed_px_s ?? null,
        stability_score: advanced?.stability_score ?? null,
        balance_score: advanced?.balance_score ?? null,
      },
      timeline_summary: {
        score_series: summary?.score_series || [],
        rep_events: summary?.rep_events || [],
        phase_events: summary?.phase_events || [],
      },
    };
  }

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !videoRef.current) return;
    const resize = () => {
      const w = videoRef.current.clientWidth || 640;
      const h = videoRef.current.clientHeight || 480;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawOverlay(canvas, live.analysis, overlayFitMode, overlayXOffsetPct, overlayYOffsetPct, overlayZoomPct);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [overlayFitMode, overlayXOffsetPct, overlayYOffsetPct, overlayZoomPct]);

  useEffect(() => {
    if (overlayRef.current && live.analysis) {
      drawOverlay(overlayRef.current, live.analysis, overlayFitMode, overlayXOffsetPct, overlayYOffsetPct, overlayZoomPct);
    }
  }, [live.analysis, overlayFitMode, overlayXOffsetPct, overlayYOffsetPct, overlayZoomPct]);

  useEffect(() => {
    window.localStorage.setItem('live.overlay.xOffsetPct', String(overlayXOffsetPct));
  }, [overlayXOffsetPct]);

  useEffect(() => {
    window.localStorage.setItem('live.overlay.yOffsetPct', String(overlayYOffsetPct));
  }, [overlayYOffsetPct]);

  useEffect(() => {
    window.localStorage.setItem('live.overlay.zoomPct', String(overlayZoomPct));
  }, [overlayZoomPct]);

  useEffect(() => {
    const onFsChange = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    if (!live.error) return;
    pushToast({ type: 'error', message: live.error });
  }, [live.error, pushToast]);

  useEffect(() => {
    if (!live.running) return undefined;
    const timer = setInterval(() => {
      setElapsedSec(getElapsedSeconds());
    }, 500);
    return () => clearInterval(timer);
  }, [live.running]);

  const elapsedLabel = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(elapsedSec % 60).padStart(2, '0')}`;

  async function handleStart() {
    if (!sport.trim()) {
      pushToast({ type: 'error', message: 'Select a sport before starting live session.' });
      return;
    }
    if (!student.trim()) {
      pushToast({ type: 'error', message: 'Select a student before starting live session.' });
      return;
    }

    const streamConfig = performanceMode
      ? { fps: 22, width: 256, height: 192, lowLatency: true }
      : { fps: 16, width: 384, height: 288, lowLatency: false };

    let ruleProfile = null;
    try {
      ruleProfile = await getRules(student.trim(), sport);
    } catch {
      ruleProfile = null;
    }

    try {
      await live.start({
        token,
        videoEl: videoRef.current,
        sport,
        student,
        ruleProfile,
        ...streamConfig,
      });
      const now = Date.now();
      clockRef.current = { startMs: now, pausedMs: 0, pauseStartMs: null };
      setElapsedSec(0);
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to start live stream.') });
    }
  }

  function handlePauseResume() {
    if (!live.running) return;
    if (!live.paused) {
      if (!clockRef.current.pauseStartMs) {
        clockRef.current.pauseStartMs = Date.now();
      }
      live.pause();
      pushToast({ type: 'info', message: 'Live session paused.' });
      return;
    }

    const now = Date.now();
    if (clockRef.current.pauseStartMs) {
      clockRef.current.pausedMs += now - clockRef.current.pauseStartMs;
      clockRef.current.pauseStartMs = null;
    }
    live.resume();
    pushToast({ type: 'info', message: 'Live session resumed.' });
  }

  function handleStop() {
    const endedAt = Date.now();
    const payload = buildLiveSessionPayload(endedAt);

    live.stop();
    resetSessionClock();

    if (canSaveSession && payload) {
      setPendingSessionPayload(payload);
      setSavePromptOpen(true);
      pushToast({ type: 'info', message: 'Live session stopped. Save this session?' });
    } else {
      setPendingSessionPayload(null);
      setSavePromptOpen(false);
      pushToast({ type: 'info', message: 'Live session stopped.' });
    }
  }

  async function confirmSaveStoppedSession() {
    if (!pendingSessionPayload) {
      setSavePromptOpen(false);
      return;
    }
    try {
      setSavingSession(true);
      await createSession(pendingSessionPayload);
      pushToast({ type: 'success', message: 'Session saved successfully.' });
      setSavePromptOpen(false);
      setPendingSessionPayload(null);
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Failed to save session.') });
    } finally {
      setSavingSession(false);
    }
  }

  async function toggleFullscreen() {
    try {
      if (!stageRef.current) return;
      if (document.fullscreenElement === stageRef.current) {
        await document.exitFullscreen();
      } else {
        await stageRef.current.requestFullscreen();
      }
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to switch fullscreen.') });
    }
  }

  const detailsContent = (
    <>
      <div className="metrics-grid compact">
        <article className="metric-tile">
          <p>Overall Score</p>
          <strong>{sessionScore ?? '--'} / 100</strong>
        </article>
        <article className="metric-tile">
          <p>Tracking Quality</p>
          <strong>{advanced.tracking_quality ?? '--'}</strong>
        </article>
        <article className="metric-tile">
          <p>Rep Count</p>
          <strong>{training.rep_count ?? 0}</strong>
        </article>
        <article className="metric-tile">
          <p>Current Phase</p>
          <strong>{training.phase || '--'}</strong>
        </article>
      </div>
      <h3 className="panel-title">Live Corrections</h3>
      {!feedback.length ? (
        <p className="help-text">No corrections right now.</p>
      ) : (
        <ul className="feedback-list">
          {feedback.map((item, idx) => (
            <li key={`${item}-${idx}`}>{item}</li>
          ))}
        </ul>
      )}
      <h3 className="panel-title">Live Angles</h3>
      <div className="metrics-grid compact">
        {angleEntries.length ? (
          angleEntries.map((item) => (
            <article key={item.key} className="metric-tile">
              <p>{item.label}</p>
              <strong>{item.value?.toFixed(2)}</strong>
            </article>
          ))
        ) : (
          <p className="help-text">No angle metrics received yet.</p>
        )}
      </div>
      <h3 className="panel-title">Camera Intelligence</h3>
      <div className="metrics-grid compact">
        <article className="metric-tile"><p>Exposure</p><strong>{cameraIntel.exposure || '--'}</strong></article>
        <article className="metric-tile"><p>Brightness</p><strong>{cameraIntel.brightness ?? '--'}</strong></article>
        <article className="metric-tile"><p>Sharpness</p><strong>{cameraIntel.sharpness ?? '--'}</strong></article>
        <article className="metric-tile"><p>Framing</p><strong>{framing.status || '--'}</strong></article>
      </div>
    </>
  );

  return (
    <div className="live-workspace">
      <section className="panel live-startbar">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Live Session Controls</h2>
            <p className="panel-subtitle">Select sport and student, then start live tracking.</p>
          </div>
          <div className="panel-actions">
            <span className="status-badge neutral">Pipeline: {live.mode || 'local'}</span>
            {live.paused ? <span className="status-badge danger">Paused</span> : null}
          </div>
        </div>
        <div className="live-startbar-row">
          <FormField label="Sport">
            <select value={sport} onChange={(e) => setSport(e.target.value)} disabled={live.running || enforceAssignedSport}>
              <option value="">Select sport</option>
              {SPORTS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Student">
            {studentOptions.length ? (
              <select value={student} onChange={(e) => setStudent(e.target.value)} disabled={live.running}>
                <option value="">Select student</option>
                {studentOptions.map((item) => (
                  <option key={item.username} value={item.username}>{item.username}</option>
                ))}
              </select>
            ) : (
              <input
                value={student}
                onChange={(e) => setStudent(e.target.value)}
                placeholder="student username"
                disabled={live.running}
              />
            )}
          </FormField>
          <div className="button-row live-startbar-actions">
            {!live.running ? (
              <button type="button" className="primary-button" onClick={handleStart}>Start Live</button>
            ) : (
              <>
                <button type="button" className="ghost-button" onClick={handlePauseResume}>
                  {live.paused ? 'Resume Live' : 'Pause Live'}
                </button>
                <button type="button" className="danger-button" onClick={handleStop}>Stop Live</button>
              </>
            )}
            <button type="button" className="ghost-button" onClick={toggleFullscreen}>
              {fullscreen ? 'Exit Fullscreen' : 'Fullscreen Live'}
            </button>
          </div>
        </div>
      </section>

      <div className="live-top-grid">
        <section className="panel live-details-panel">
          <div className="live-details-scroll">{detailsContent}</div>
        </section>

        <section className="panel live-stage-panel">
          <div ref={stageRef} className="video-stage">
            <video ref={videoRef} muted playsInline className="live-video" />
            <canvas ref={overlayRef} className="live-overlay" />

            <div className="live-timer">Session {elapsedLabel}</div>
            <div className="live-score-chip">Score {sessionScore ?? '--'} / 100</div>

            {fullscreen ? (
              <>
                <button
                  type="button"
                  className="live-fs-section-toggle live-fs-toggle-camera"
                  onClick={() => setFsCameraOpen((v) => !v)}
                >
                  {fsCameraOpen ? 'Camera -' : 'Camera +'}
                </button>
                <button
                  type="button"
                  className="live-fs-section-toggle live-fs-toggle-corrections"
                  onClick={() => setFsCorrectionsOpen((v) => !v)}
                >
                  {fsCorrectionsOpen ? 'Corrections -' : 'Corrections +'}
                </button>
                <button
                  type="button"
                  className="live-fs-section-toggle live-fs-toggle-angles"
                  onClick={() => setFsAnglesOpen((v) => !v)}
                >
                  {fsAnglesOpen ? 'Angles -' : 'Angles +'}
                </button>
                <button
                  type="button"
                  className="live-fs-section-toggle live-fs-toggle-calibrate"
                  onClick={() => setFsCalibrateOpen((v) => !v)}
                >
                  {fsCalibrateOpen ? 'Calibrate -' : 'Calibrate +'}
                </button>
              </>
            ) : null}

            {fullscreen && fsCorrectionsOpen ? (
              <aside
                className={`live-fs-drawer live-fs-drawer-right live-fs-drawer-corrections ${
                  topFeedback.length ? 'has-issues' : 'no-issues'
                }`}
              >
                <h4>Live Corrections</h4>
                <div className="metrics-grid compact">
                  <article className="metric-tile"><p>Sport</p><strong>{live.analysis?.sport || sport}</strong></article>
                  <article className="metric-tile"><p>Status</p><strong>{live.analysis?.detected ? 'Tracking' : 'Waiting'}</strong></article>
                  <article className="metric-tile"><p>Feedback</p><strong>{feedback.length}</strong></article>
                  <article className="metric-tile"><p>Pipeline</p><strong>{live.mode || 'local'}</strong></article>
                </div>
                {!topFeedback.length ? (
                  <p className="live-fs-empty">No corrections</p>
                ) : (
                  <ul>
                    {topFeedback.map((item, idx) => (
                      <li key={`${item}-${idx}`}>{item}</li>
                    ))}
                  </ul>
                )}
              </aside>
            ) : null}

            {fullscreen && fsAnglesOpen ? (
              <aside className="live-fs-drawer live-fs-drawer-right live-fs-drawer-angles">
                <h4>Live Angles</h4>
                <div className="metrics-grid compact">
                  {angleEntries.length ? (
                    angleEntries.map((item) => (
                      <article key={item.key} className="metric-tile">
                        <p>{item.label}</p>
                        <strong>{item.value?.toFixed(2)}</strong>
                      </article>
                    ))
                  ) : (
                    <p className="live-fs-empty">No angle metrics yet.</p>
                  )}
                </div>
              </aside>
            ) : null}

            {fullscreen && fsCameraOpen ? (
              <aside className="live-fs-drawer live-fs-drawer-right live-fs-drawer-camera">
                <h4>Camera Intelligence</h4>
                <div className="metrics-grid compact">
                  <article className="metric-tile"><p>Exposure</p><strong>{cameraIntel.exposure || '--'}</strong></article>
                  <article className="metric-tile"><p>Brightness</p><strong>{cameraIntel.brightness ?? '--'}</strong></article>
                  <article className="metric-tile"><p>Sharpness</p><strong>{cameraIntel.sharpness ?? '--'}</strong></article>
                  <article className="metric-tile"><p>Tracking</p><strong>{advanced.tracking_quality ?? '--'}</strong></article>
                  <article className="metric-tile"><p>Framing</p><strong>{framing.status || '--'}</strong></article>
                  <article className="metric-tile"><p>Distance</p><strong>{framing.distance || '--'}</strong></article>
                  <article className="metric-tile"><p>Visibility</p><strong>{live.analysis?.visibility_score ?? '--'}</strong></article>
                  <article className="metric-tile"><p>Occlusion</p><strong>{live.analysis?.occlusion || '--'}</strong></article>
                </div>
              </aside>
            ) : null}

            {fullscreen && fsCalibrateOpen ? (
              <aside className="live-fs-drawer live-fs-drawer-left">
                <h4>Calibrate</h4>
                <FormField label={`Overlay Horizontal (${overlayXOffsetPct > 0 ? '+' : ''}${overlayXOffsetPct.toFixed(1)}%)`}>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    step="0.1"
                    value={overlayXOffsetPct}
                    onChange={(e) => setOverlayXOffsetPct(Number(e.target.value))}
                  />
                </FormField>
                <FormField label={`Overlay Vertical (${overlayYOffsetPct > 0 ? '+' : ''}${overlayYOffsetPct.toFixed(1)}%)`}>
                  <input
                    type="range"
                    min="-25"
                    max="25"
                    step="0.1"
                    value={overlayYOffsetPct}
                    onChange={(e) => setOverlayYOffsetPct(Number(e.target.value))}
                  />
                </FormField>
                <FormField label={`Overlay Zoom (${overlayZoomPct.toFixed(0)}%)`}>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="1"
                    value={overlayZoomPct}
                    onChange={(e) => setOverlayZoomPct(Number(e.target.value))}
                  />
                </FormField>
              </aside>
            ) : null}
          </div>
        </section>
      </div>

      <section className="panel live-input-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Session Metadata & Calibration</h2>
            <p className="panel-subtitle">Adjust calibration and capture coaching context for save.</p>
          </div>
        </div>

        <div className="form-grid">
          <FormField label="Coach Note">
            <textarea
              rows={2}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Write coaching observations for this run."
            />
          </FormField>
          <div className="form-inline">
            <FormField label="Drill Focus">
              <input value={drillFocus} onChange={(e) => setDrillFocus(e.target.value)} placeholder="Primary drill objective" />
            </FormField>
            <FormField label="Intensity RPE 1-10">
              <input type="number" min="1" max="10" value={intensityRpe} onChange={(e) => setIntensityRpe(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Tags (comma separated)">
            <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="form-check, evening, competition-prep" />
          </FormField>
        </div>

        <label className="check-field live-toggle-row">
          <input type="checkbox" checked={performanceMode} onChange={(e) => setPerformanceMode(e.target.checked)} disabled={live.running} />
          <span>Performance Mode {performanceMode ? 'ON' : 'OFF'}</span>
        </label>

        <div className="calibration-grid">
          <FormField label={`Overlay Horizontal (${overlayXOffsetPct > 0 ? '+' : ''}${overlayXOffsetPct.toFixed(1)}%)`}>
            <input type="range" min="-25" max="25" step="0.1" value={overlayXOffsetPct} onChange={(e) => setOverlayXOffsetPct(Number(e.target.value))} />
          </FormField>
          <FormField label={`Overlay Vertical (${overlayYOffsetPct > 0 ? '+' : ''}${overlayYOffsetPct.toFixed(1)}%)`}>
            <input type="range" min="-25" max="25" step="0.1" value={overlayYOffsetPct} onChange={(e) => setOverlayYOffsetPct(Number(e.target.value))} />
          </FormField>
          <FormField label={`Overlay Zoom (${overlayZoomPct.toFixed(0)}%)`}>
            <input type="range" min="50" max="150" step="1" value={overlayZoomPct} onChange={(e) => setOverlayZoomPct(Number(e.target.value))} />
          </FormField>
        </div>

        <div className="button-row sticky-action-row">
          <button
            type="button"
            className="ghost-button"
            onClick={() => {
              setOverlayXOffsetPct(0);
              setOverlayYOffsetPct(0);
              setOverlayZoomPct(100);
            }}
          >
            Reset Calibrate
          </button>
        </div>

      </section>

      <Modal
        open={savePromptOpen}
        title="Save Live Session"
        onClose={() => {
          if (savingSession) return;
          setSavePromptOpen(false);
          setPendingSessionPayload(null);
          pushToast({ type: 'info', message: 'Session discarded after stop.' });
        }}
        footer={(
          <>
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                if (savingSession) return;
                setSavePromptOpen(false);
                setPendingSessionPayload(null);
                pushToast({ type: 'info', message: 'Session discarded after stop.' });
              }}
            >
              Don&apos;t Save
            </button>
            <button type="button" className="primary-button" onClick={confirmSaveStoppedSession} disabled={savingSession}>
              {savingSession ? 'Saving...' : 'Save Session'}
            </button>
          </>
        )}
      >
        <p className="help-text">Live session stopped. Do you want to save this session to history?</p>
      </Modal>
    </div>
  );
}
