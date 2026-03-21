import { useEffect, useMemo, useRef, useState } from 'react';
import FormField from './ui/FormField';
import Modal from './ui/Modal';
import LiveCoachAssist from './LiveCoachAssist';
import { useLivePose } from '../hooks/useLivePose';
import { createSession } from '../services/sessionsApi';
import { getErrorMessage } from '../services/httpError';
import { getRules } from '../services/rulesApi';
import { getCoachConfig } from '../services/chatApi';
import { getLatestHardwareTelemetry } from '../services/hardwareApi';
import { SPORTS } from '../constants/sports';
import { ANGLE_METRICS } from '../constants/angles';
import { useToast } from '../hooks/useToast';

const OVERLAY_SEGMENTS = {
  face: new Set([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
  core: new Set([11, 12, 23, 24]),
  leftArm: new Set([11, 13, 15, 17, 19, 21]),
  rightArm: new Set([12, 14, 16, 18, 20, 22]),
  leftLeg: new Set([23, 25, 27, 29, 31]),
  rightLeg: new Set([24, 26, 28, 30, 32]),
};

const OVERLAY_COLORS = {
  face: 'rgba(191, 219, 254, 0.78)',
  core: 'rgba(56, 189, 248, 0.98)',
  leftArm: 'rgba(96, 165, 250, 0.98)',
  rightArm: 'rgba(14, 165, 233, 0.98)',
  leftLeg: 'rgba(45, 212, 191, 0.96)',
  rightLeg: 'rgba(34, 197, 94, 0.96)',
  issue: 'rgba(248, 113, 113, 0.99)',
  neutral: 'rgba(226, 232, 240, 0.8)',
  glow: 'rgba(8, 47, 73, 0.32)',
  jointCore: 'rgba(224, 242, 254, 0.94)',
  torsoFill: 'rgba(14, 165, 233, 0.12)',
};

function getOverlaySegment(jointIdx) {
  if (OVERLAY_SEGMENTS.face.has(jointIdx)) return 'face';
  if (OVERLAY_SEGMENTS.core.has(jointIdx)) return 'core';
  if (OVERLAY_SEGMENTS.leftArm.has(jointIdx)) return 'leftArm';
  if (OVERLAY_SEGMENTS.rightArm.has(jointIdx)) return 'rightArm';
  if (OVERLAY_SEGMENTS.leftLeg.has(jointIdx)) return 'leftLeg';
  if (OVERLAY_SEGMENTS.rightLeg.has(jointIdx)) return 'rightLeg';
  return 'core';
}

function getConnectionStyle(a, b) {
  const segmentA = getOverlaySegment(a);
  const segmentB = getOverlaySegment(b);
  const segment = segmentA === segmentB ? segmentA : 'core';
  if (segment === 'face') {
    return { color: OVERLAY_COLORS.face, width: 2.4, glowWidth: 5.2, blur: 4 };
  }
  if (segment === 'core') {
    return { color: OVERLAY_COLORS.core, width: 5.6, glowWidth: 11.5, blur: 9 };
  }
  return { color: OVERLAY_COLORS[segment] || OVERLAY_COLORS.neutral, width: 4.8, glowWidth: 9.6, blur: 8 };
}

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

  const drawLink = (a, b, color, width = 5, glowWidth = 10, blur = 8) => {
    const p1 = point(a);
    const p2 = point(b);
    if (!p1 || !p2) return;
    const gradient = ctx.createLinearGradient(p1[0], p1[1], p2[0], p2[1]);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = glowWidth;
    ctx.strokeStyle = OVERLAY_COLORS.glow;
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();

    ctx.lineWidth = width;
    ctx.strokeStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(p1[0], p1[1]);
    ctx.lineTo(p2[0], p2[1]);
    ctx.stroke();
    ctx.shadowBlur = 0;
  };

  const drawBodyPlate = (points, fillColor) => {
    const validPoints = points.filter(Boolean);
    if (validPoints.length < 3) return;
    ctx.beginPath();
    ctx.moveTo(validPoints[0][0], validPoints[0][1]);
    validPoints.slice(1).forEach((p) => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  };

  const lShoulder = point(11);
  const rShoulder = point(12);
  const lHip = point(23);
  const rHip = point(24);
  const lKnee = point(25);
  const rKnee = point(26);
  drawBodyPlate([lShoulder, rShoulder, rHip, lHip], OVERLAY_COLORS.torsoFill);

  connections.forEach(([a, b]) => {
    const style = getConnectionStyle(a, b);
    const incorrectLink = jointStatus[a] === false || jointStatus[b] === false;
    drawLink(
      a,
      b,
      incorrectLink ? OVERLAY_COLORS.issue : style.color,
      style.width,
      style.glowWidth,
      style.blur
    );
  });
  if (lShoulder && rShoulder && lHip && rHip) {
    const shoulderMid = [(lShoulder[0] + rShoulder[0]) / 2, (lShoulder[1] + rShoulder[1]) / 2];
    const hipMid = [(lHip[0] + rHip[0]) / 2, (lHip[1] + rHip[1]) / 2];
    const kneeMid = lKnee && rKnee ? [(lKnee[0] + rKnee[0]) / 2, (lKnee[1] + rKnee[1]) / 2] : null;
    const spineCheck = (analysis || []).find((item) => String(item.name || '').toLowerCase().includes('spine'));
    const spineColor = spineCheck && spineCheck.correct === false ? OVERLAY_COLORS.issue : OVERLAY_COLORS.core;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 13;
    ctx.strokeStyle = spineColor;
    ctx.shadowColor = spineColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(shoulderMid[0], shoulderMid[1]);
    ctx.lineTo(hipMid[0], hipMid[1]);
    if (kneeMid) ctx.lineTo(kneeMid[0], kneeMid[1]);
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.fillStyle = spineColor;
    [shoulderMid, hipMid, kneeMid].filter(Boolean).forEach((p) => {
      ctx.beginPath();
      ctx.arc(p[0], p[1], 7.5, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  Object.entries(coords).forEach(([idx]) => {
    const jointIdx = Number(idx);
    const isCorrect = jointStatus[jointIdx] ?? true;
    const p = point(jointIdx);
    if (!p) return;
    const isHandJoint = [15, 16, 17, 18, 19, 20, 21, 22].includes(jointIdx);
    const segment = getOverlaySegment(jointIdx);
    const baseColor = isCorrect ? (OVERLAY_COLORS[segment] || OVERLAY_COLORS.neutral) : OVERLAY_COLORS.issue;
    const isFace = segment === 'face';
    const isCore = segment === 'core';
    const radius = isFace
      ? (isCorrect ? 3.1 : 3.8)
      : isHandJoint
        ? (isCorrect ? 5.8 : 6.6)
        : isCore
          ? (isCorrect ? 5.6 : 6.5)
          : (isCorrect ? 4.8 : 5.8);
    ctx.beginPath();
    ctx.fillStyle = baseColor;
    ctx.arc(p[0], p[1], radius, 0, Math.PI * 2);
    ctx.fill();
    if (!isFace) {
      ctx.beginPath();
      ctx.fillStyle = OVERLAY_COLORS.jointCore;
      ctx.arc(p[0], p[1], Math.max(1.8, radius * 0.38), 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p[0], p[1], radius, 0, Math.PI * 2);
      ctx.strokeStyle = isCorrect ? 'rgba(224, 242, 254, 0.72)' : 'rgba(255, 230, 230, 0.94)';
      ctx.lineWidth = isCorrect ? 1.1 : 1.6;
      ctx.stroke();
    }
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
  const [liveGuidanceEnabled, setLiveGuidanceEnabled] = useState(() => {
    const raw = window.localStorage.getItem('live.aiGuidance.enabled');
    return raw === null ? true : raw === '1';
  });
  const [liveVoiceEnabled, setLiveVoiceEnabled] = useState(() => {
    const raw = window.localStorage.getItem('live.aiVoice.enabled');
    return raw === null ? true : raw === '1';
  });
  const [customNote, setCustomNote] = useState('');
  const [drillFocus, setDrillFocus] = useState('');
  const [intensityRpe, setIntensityRpe] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [coachConfig, setCoachConfig] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const [pendingSessionPayload, setPendingSessionPayload] = useState(null);
  const [savingSession, setSavingSession] = useState(false);
  const [fsCorrectionsOpen, setFsCorrectionsOpen] = useState(true);
  const [fsAnglesOpen, setFsAnglesOpen] = useState(true);
  const [fsCameraOpen, setFsCameraOpen] = useState(true);
  const [fsCalibrateOpen, setFsCalibrateOpen] = useState(false);
  const [liveGuidanceState, setLiveGuidanceState] = useState(null);
  const [hardwareTelemetry, setHardwareTelemetry] = useState(null);

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
  const analysis = live.analysis;
  const feedback = useMemo(() => analysis?.feedback || [], [analysis]);
  const topFeedback = useMemo(() => feedback.slice(0, 6), [feedback]);
  const angleEntries = useMemo(() => {
    const raw = analysis?.angles || {};
    return ANGLE_METRICS.map((item) => {
      const value = raw[item.label];
      return { key: item.id, label: item.label, value: Number.isFinite(Number(value)) ? Number(value) : null };
    }).filter((item) => item.value !== null);
  }, [analysis]);
  const advanced = useMemo(() => analysis?.advanced || {}, [analysis]);
  const cameraIntel = useMemo(() => analysis?.camera || {}, [analysis]);
  const framing = useMemo(() => analysis?.framing || {}, [analysis]);
  const training = useMemo(() => analysis?.training || {}, [analysis]);
  const sessionScore = useMemo(() => {
    const score = Number(training?.session_summary?.session_score);
    return Number.isFinite(score) ? score : null;
  }, [training]);
  const runtime = useMemo(() => analysis?.runtime || {}, [analysis]);
  const overlayFitMode = fullscreen ? 'contain' : 'cover';
  const liveStatusLabel = live.running ? (live.paused ? 'Paused' : 'Tracking Live') : 'Ready';
  const hardwareTimestamp = Number(hardwareTelemetry?.captured_at || hardwareTelemetry?.updated_at);
  const hardwareFreshnessLabel = useMemo(() => {
    if (!Number.isFinite(hardwareTimestamp)) return 'No sensor feed';
    const ageSeconds = Math.max(0, Math.round(Date.now() / 1000 - hardwareTimestamp));
    if (ageSeconds < 5) return 'Live now';
    if (ageSeconds < 60) return `${ageSeconds}s ago`;
    return `${Math.round(ageSeconds / 60)}m ago`;
  }, [hardwareTimestamp]);

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
    if (!live.analysis) return null;

    const startedAtMs = clockRef.current.startMs || endedAtMs;
    const currentTraining = live.analysis?.training || {};
    const summary = currentTraining?.session_summary || {};

    return {
      student: student.trim(),
      sport: live.analysis?.sport || sport,
      angles: live.analysis?.angles || {},
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
      sensor_summary: hardwareTelemetry
        ? {
            source: hardwareTelemetry.source || 'hardware',
            device_id: hardwareTelemetry.device_id || null,
            temperature_c: hardwareTelemetry.temperature_c ?? null,
            pressure_kpa: hardwareTelemetry.pressure_kpa ?? null,
            humidity_pct: hardwareTelemetry.humidity_pct ?? null,
            battery_pct: hardwareTelemetry.battery_pct ?? null,
            captured_at: hardwareTelemetry.captured_at ?? null,
            updated_at: hardwareTelemetry.updated_at ?? null,
          }
        : null,
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
      drawOverlay(canvas, analysis, overlayFitMode, overlayXOffsetPct, overlayYOffsetPct, overlayZoomPct);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [analysis, overlayFitMode, overlayXOffsetPct, overlayYOffsetPct, overlayZoomPct]);

  useEffect(() => {
    if (overlayRef.current && analysis) {
      drawOverlay(overlayRef.current, analysis, overlayFitMode, overlayXOffsetPct, overlayYOffsetPct, overlayZoomPct);
    }
  }, [analysis, overlayFitMode, overlayXOffsetPct, overlayYOffsetPct, overlayZoomPct]);

  useEffect(() => {
    let active = true;
    getCoachConfig()
      .then((data) => {
        if (!active) return;
        setCoachConfig(data);
        setLiveGuidanceEnabled(data.live_guidance_enabled ? (window.localStorage.getItem('live.aiGuidance.enabled') !== '0') : false);
        setLiveVoiceEnabled(
          data.live_guidance_enabled && data.voice_enabled
            ? (window.localStorage.getItem('live.aiVoice.enabled') !== '0')
            : false
        );
      })
      .catch(() => {
        if (!active) return;
        setCoachConfig(null);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const targetStudent = student.trim();
    if (!targetStudent) {
      setHardwareTelemetry(null);
      return undefined;
    }

    let active = true;
    let timerId;

    const loadTelemetry = async () => {
      try {
        const latest = await getLatestHardwareTelemetry(targetStudent);
        if (!active) return;
        setHardwareTelemetry(latest || null);
      } catch {
        if (!active) return;
        setHardwareTelemetry(null);
      }
    };

    loadTelemetry();
    timerId = window.setInterval(loadTelemetry, live.running ? 2500 : 6000);

    return () => {
      active = false;
      window.clearInterval(timerId);
    };
  }, [student, live.running]);

  useEffect(() => {
    window.localStorage.setItem('live.aiGuidance.enabled', liveGuidanceEnabled ? '1' : '0');
  }, [liveGuidanceEnabled]);

  useEffect(() => {
    window.localStorage.setItem('live.aiVoice.enabled', liveVoiceEnabled ? '1' : '0');
  }, [liveVoiceEnabled]);

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
  const aiCoachVisible = Boolean(coachConfig?.live_guidance_enabled);
  const aiVoiceVisible = Boolean(coachConfig?.live_guidance_enabled && coachConfig?.voice_enabled);
  const liveCoachActive = live.running && liveGuidanceEnabled;
  const liveCoachVoiceActive = live.running && liveGuidanceEnabled && liveVoiceEnabled && aiVoiceVisible;

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
      ? { fps: 26, width: 320, height: 240, lowLatency: true }
      : { fps: 20, width: 480, height: 360, lowLatency: false };

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
    <div className="live-detail-stack">
      <section className="live-detail-block live-detail-block-highlight">
        <div className="live-detail-heading">
          <span>Live Summary</span>
          <strong>Session intelligence at a glance</strong>
        </div>
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
      </section>

      <section className="live-detail-block">
        <div className="live-detail-heading">
          <span>Corrections</span>
          <strong>{feedback.length ? 'Active technique cues' : 'No urgent correction right now'}</strong>
        </div>
        {!feedback.length ? (
          <p className="help-text">The athlete is currently in a stable state. New correction cues will appear here.</p>
        ) : (
          <ul className="feedback-list">
            {feedback.map((item, idx) => (
              <li key={`${item}-${idx}`}>{item}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="live-detail-block">
        <div className="live-detail-heading">
          <span>Angles</span>
          <strong>Real-time body measurements</strong>
        </div>
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
      </section>

      <section className="live-detail-block">
        <div className="live-detail-heading">
          <span>Camera Intelligence</span>
          <strong>Frame quality and capture health</strong>
        </div>
        <div className="metrics-grid compact">
          <article className="metric-tile"><p>Exposure</p><strong>{cameraIntel.exposure || '--'}</strong></article>
          <article className="metric-tile"><p>Brightness</p><strong>{cameraIntel.brightness ?? '--'}</strong></article>
          <article className="metric-tile"><p>Sharpness</p><strong>{cameraIntel.sharpness ?? '--'}</strong></article>
          <article className="metric-tile"><p>Framing</p><strong>{framing.status || '--'}</strong></article>
        </div>
      </section>

      <section className="live-detail-block">
        <div className="live-detail-heading">
          <span>Hardware Telemetry</span>
          <strong>{hardwareTelemetry ? `Latest sensor feed ${hardwareFreshnessLabel}` : 'No connected telemetry yet'}</strong>
        </div>
        <div className="metrics-grid compact">
          <article className="metric-tile"><p>Temperature</p><strong>{hardwareTelemetry?.temperature_c != null ? `${Number(hardwareTelemetry.temperature_c).toFixed(1)} C` : '--'}</strong></article>
          <article className="metric-tile"><p>Pressure</p><strong>{hardwareTelemetry?.pressure_kpa != null ? `${Number(hardwareTelemetry.pressure_kpa).toFixed(1)} kPa` : '--'}</strong></article>
          <article className="metric-tile"><p>Humidity</p><strong>{hardwareTelemetry?.humidity_pct != null ? `${Number(hardwareTelemetry.humidity_pct).toFixed(0)} %` : '--'}</strong></article>
          <article className="metric-tile"><p>Battery</p><strong>{hardwareTelemetry?.battery_pct != null ? `${Number(hardwareTelemetry.battery_pct).toFixed(0)} %` : '--'}</strong></article>
          <article className="metric-tile"><p>Source</p><strong>{hardwareTelemetry?.source || '--'}</strong></article>
          <article className="metric-tile"><p>Device</p><strong>{hardwareTelemetry?.device_id || '--'}</strong></article>
        </div>
      </section>
    </div>
  );

  return (
    <div className="live-workspace">
      <section className="panel live-startbar live-command-bar">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Live Coaching Cockpit</h2>
            <p className="panel-subtitle">Choose the athlete, launch tracking, and keep every coaching signal visible in one focused training surface.</p>
          </div>
          <div className="panel-actions">
            <span className="status-badge primary">Status: {liveStatusLabel}</span>
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
        <div className="live-command-metrics">
          <article className="live-command-metric">
            <span>Session Timer</span>
            <strong>{elapsedLabel}</strong>
          </article>
          <article className="live-command-metric">
            <span>Session Score</span>
            <strong>{sessionScore ?? '--'} / 100</strong>
          </article>
          <article className="live-command-metric">
            <span>Tracking</span>
            <strong>{advanced.tracking_quality ?? '--'}</strong>
          </article>
          <article className="live-command-metric">
            <span>Current Phase</span>
            <strong>{training.phase || '--'}</strong>
          </article>
          <article className="live-command-metric">
            <span>Pipeline</span>
            <strong>{runtime.model_variant === 'lite' ? 'Low latency' : 'Balanced'}</strong>
          </article>
          <article className="live-command-metric">
            <span>Inference</span>
            <strong>{runtime.inference_ms != null ? `${runtime.inference_ms} ms` : '--'}</strong>
          </article>
          <article className="live-command-metric">
            <span>Temperature</span>
            <strong>{hardwareTelemetry?.temperature_c != null ? `${Number(hardwareTelemetry.temperature_c).toFixed(1)} C` : '--'}</strong>
          </article>
          <article className="live-command-metric">
            <span>Pressure</span>
            <strong>{hardwareTelemetry?.pressure_kpa != null ? `${Number(hardwareTelemetry.pressure_kpa).toFixed(1)} kPa` : '--'}</strong>
          </article>
        </div>
      </section>

      <div className="live-top-grid">
        <section className="panel live-stage-panel">
          <div className="panel-header live-stage-header">
            <div>
              <h2 className="panel-title">Live Stage</h2>
              <p className="panel-subtitle">Camera feed, skeleton overlay, and fullscreen coaching mode.</p>
            </div>
            <div className="panel-actions">
              <span className="status-badge neutral">Sport: {sport || '--'}</span>
              <span className="status-badge neutral">Student: {student || '--'}</span>
            </div>
          </div>
          <div ref={stageRef} className="video-stage">
            <video ref={videoRef} muted playsInline className="live-video" />
            <canvas ref={overlayRef} className="live-overlay" />

            <div className="live-stage-hud">
              <div className="live-stage-hud-card live-stage-hud-card-primary">
                <span>Session</span>
                <strong>{elapsedLabel}</strong>
              </div>
              <div className="live-stage-hud-card">
                <span>Score</span>
                <strong>{sessionScore ?? '--'} / 100</strong>
              </div>
              <div className="live-stage-hud-card">
                <span>Tracking</span>
                <strong>{advanced.tracking_quality ?? '--'}</strong>
              </div>
              <div className="live-stage-hud-card">
                <span>Latency</span>
                <strong>{runtime.inference_ms != null ? `${runtime.inference_ms} ms` : '--'}</strong>
              </div>
              <div className="live-stage-hud-card">
                <span>Temperature</span>
                <strong>{hardwareTelemetry?.temperature_c != null ? `${Number(hardwareTelemetry.temperature_c).toFixed(1)} C` : '--'}</strong>
              </div>
              <div className="live-stage-hud-card">
                <span>Pressure</span>
                <strong>{hardwareTelemetry?.pressure_kpa != null ? `${Number(hardwareTelemetry.pressure_kpa).toFixed(1)} kPa` : '--'}</strong>
              </div>
            </div>

            <div className="live-stage-watermark">
              <span>Edvatiq Performance Wall</span>
              <strong>{student || 'Select athlete'} · {sport || 'Select sport'}</strong>
            </div>

            {fullscreen ? (
              <div className="live-fs-dock">
                {aiCoachVisible ? (
                  <button
                    type="button"
                    className={`live-fs-dock-button ${liveGuidanceEnabled ? 'active' : ''}`}
                    onClick={() => setLiveGuidanceEnabled((value) => !value)}
                  >
                    AI Guide
                  </button>
                ) : null}
                {aiVoiceVisible ? (
                  <button
                    type="button"
                    className={`live-fs-dock-button ${liveVoiceEnabled ? 'active' : ''}`}
                    onClick={() => setLiveVoiceEnabled((value) => !value)}
                  >
                    Voice
                  </button>
                ) : null}
                <button
                  type="button"
                  className={`live-fs-dock-button ${fsCameraOpen ? 'active' : ''}`}
                  onClick={() => setFsCameraOpen((v) => !v)}
                >
                  Camera
                </button>
                <button
                  type="button"
                  className={`live-fs-dock-button ${fsCorrectionsOpen ? 'active' : ''}`}
                  onClick={() => setFsCorrectionsOpen((v) => !v)}
                >
                  Corrections
                </button>
                <button
                  type="button"
                  className={`live-fs-dock-button ${fsAnglesOpen ? 'active' : ''}`}
                  onClick={() => setFsAnglesOpen((v) => !v)}
                >
                  Angles
                </button>
                <button
                  type="button"
                  className={`live-fs-dock-button ${fsCalibrateOpen ? 'active' : ''}`}
                  onClick={() => setFsCalibrateOpen((v) => !v)}
                >
                  Calibrate
                </button>
              </div>
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
                  <article className="metric-tile"><p>Temp</p><strong>{hardwareTelemetry?.temperature_c != null ? `${Number(hardwareTelemetry.temperature_c).toFixed(1)} C` : '--'}</strong></article>
                  <article className="metric-tile"><p>Pressure</p><strong>{hardwareTelemetry?.pressure_kpa != null ? `${Number(hardwareTelemetry.pressure_kpa).toFixed(1)} kPa` : '--'}</strong></article>
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

            {fullscreen && aiCoachVisible && liveGuidanceEnabled ? (
              <aside className={`live-fs-drawer live-fs-drawer-left live-fs-drawer-guidance ${liveGuidanceState?.urgency || 'medium'}`}>
                <h4>Live AI Guidance</h4>
                <div className="metrics-grid compact">
                  <article className="metric-tile"><p>Status</p><strong>{liveGuidanceState?.speak_now ? 'Speaking' : 'Monitoring'}</strong></article>
                  <article className="metric-tile"><p>Source</p><strong>{coachConfig?.key_source === 'platform' ? 'Wallet' : 'Personal'}</strong></article>
                  <article className="metric-tile"><p>Phase</p><strong>{training.phase || '--'}</strong></article>
                  <article className="metric-tile"><p>Reps</p><strong>{training.rep_count ?? 0}</strong></article>
                  <article className="metric-tile"><p>Score</p><strong>{sessionScore ?? '--'}</strong></article>
                  <article className="metric-tile"><p>Temp</p><strong>{hardwareTelemetry?.temperature_c != null ? `${Number(hardwareTelemetry.temperature_c).toFixed(1)} C` : '--'}</strong></article>
                  <article className="metric-tile"><p>Pressure</p><strong>{hardwareTelemetry?.pressure_kpa != null ? `${Number(hardwareTelemetry.pressure_kpa).toFixed(1)} kPa` : '--'}</strong></article>
                </div>
                <div className="live-fs-guidance-card">
                  <strong>{liveGuidanceState?.cue || 'AI coach is monitoring for the next meaningful change.'}</strong>
                  <p>{liveGuidanceState?.summary || 'Guidance appears here in fullscreen and stays available while you train.'}</p>
                </div>
              </aside>
            ) : null}
          </div>
        </section>

        <section className="panel live-details-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Coach Intelligence Rail</h2>
              <p className="panel-subtitle">Corrections, angles, and camera quality stay readable without leaving the stage.</p>
            </div>
          </div>
          <div className="live-details-scroll">{detailsContent}</div>
        </section>
      </div>

      {aiCoachVisible ? (
        <LiveCoachAssist
          liveRunning={live.running}
          fullscreen={fullscreen}
          active={liveCoachActive}
          voiceActive={liveCoachVoiceActive}
          sport={analysis?.sport || sport}
          student={student.trim()}
          feedback={feedback}
          angles={analysis?.angles || {}}
          sessionScore={sessionScore}
          phase={training.phase || ''}
          repCount={training.rep_count ?? 0}
          trackingQuality={advanced.tracking_quality ?? ''}
          temperatureC={hardwareTelemetry?.temperature_c ?? null}
          pressureKpa={hardwareTelemetry?.pressure_kpa ?? null}
          drillFocus={drillFocus}
          customNote={customNote}
          pushToast={pushToast}
          onGuidanceChange={setLiveGuidanceState}
        />
      ) : null}

      <section className="panel live-input-panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Session Notes & Calibration</h2>
            <p className="panel-subtitle">Capture coaching context, tune overlay alignment, and control performance behavior before saving.</p>
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
        {aiCoachVisible ? (
          <label className="check-field live-toggle-row">
            <input type="checkbox" checked={liveGuidanceEnabled} onChange={(e) => setLiveGuidanceEnabled(e.target.checked)} />
            <span>Live AI Guidance {liveGuidanceEnabled ? 'ON' : 'OFF'}</span>
          </label>
        ) : null}
        {aiVoiceVisible ? (
          <label className="check-field live-toggle-row">
            <input type="checkbox" checked={liveVoiceEnabled} onChange={(e) => setLiveVoiceEnabled(e.target.checked)} />
            <span>Live Coach Voice {liveVoiceEnabled ? 'ON' : 'OFF'}</span>
          </label>
        ) : null}

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
