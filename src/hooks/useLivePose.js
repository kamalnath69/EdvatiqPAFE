import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [15, 17], [15, 19], [15, 21],
  [17, 19], [19, 21],
  [16, 18], [16, 20], [16, 22],
  [18, 20], [20, 22],
  [11, 23], [12, 24],
  [23, 24],
  [23, 25], [25, 27], [27, 29], [29, 31],
  [27, 31],
  [24, 26], [26, 28], [28, 30], [30, 32],
  [28, 32],
];

const LANDMARK_VIS_THRESHOLD = 0.35;
const HAND_VIS_THRESHOLD = 0.05;
const FACE_VIS_THRESHOLD = 0.45;
const SMOOTHING_ALPHA_BODY = 0.74;
const SMOOTHING_ALPHA_HAND = 0.82;
const MOTION_HISTORY_MAX = 24;
const CAMERA_METRICS_INTERVAL_FAST = 700;
const CAMERA_METRICS_INTERVAL_BALANCED = 420;
const BEST_FRAME_CAPTURE_FAST = 2600;
const BEST_FRAME_CAPTURE_BALANCED = 1400;
const PHASES = {
  SETUP: 'setup',
  EXECUTION: 'execution',
  FOLLOW_THROUGH: 'follow-through',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildRuleBounds(ruleProfile, name) {
  const target = Number(ruleProfile?.targets?.[name]);
  const tol = Number(ruleProfile?.tolerances?.[name]);
  if (Number.isFinite(target) && Number.isFinite(tol)) {
    return { min: target - tol, max: target + tol };
  }
  return null;
}

function calcAngle(a, b, c) {
  if (!a || !b || !c) return null;
  const bax = a[0] - b[0];
  const bay = a[1] - b[1];
  const bcx = c[0] - b[0];
  const bcy = c[1] - b[1];
  const n1 = Math.hypot(bax, bay);
  const n2 = Math.hypot(bcx, bcy);
  if (!n1 || !n2) return null;
  const cos = Math.max(-1, Math.min(1, (bax * bcx + bay * bcy) / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

function lineTilt(a, b) {
  if (!a || !b) return null;
  return Math.abs((Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI);
}

function verticalDeviation(a, b) {
  const tilt = lineTilt(a, b);
  if (tilt === null) return null;
  return Math.abs(90 - tilt);
}

function horizontalDeviation(a, b) {
  const tilt = lineTilt(a, b);
  if (tilt === null) return null;
  return Math.min(tilt, Math.abs(180 - tilt));
}

function checkMetric(name, value, joint, ruleProfile) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { name, angle: 0, correct: true, message: '', joint };
  }
  const bounds = buildRuleBounds(ruleProfile, name);
  const correct = !bounds || (value >= bounds.min && value <= bounds.max);
  const message = !correct && bounds
    ? `Keep ${name} between ${bounds.min.toFixed(2)} and ${bounds.max.toFixed(2)}`
    : '';
  return {
    name,
    angle: Number(value.toFixed(2)),
    correct,
    message,
    joint,
  };
}

function safeNum(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function avg(nums) {
  const valid = nums.filter((n) => Number.isFinite(n));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function getSportKey(sport) {
  return String(sport || 'Archery').trim().toLowerCase();
}

function getPhaseForSport(sport, payload) {
  const key = getSportKey(sport);
  const lElbow = safeNum(payload?.angles?.['Left elbow']);
  const rElbow = safeNum(payload?.angles?.['Right elbow']);
  const lKnee = safeNum(payload?.angles?.['Left knee posture']);
  const rKnee = safeNum(payload?.angles?.['Right knee posture']);
  const knee = avg([lKnee, rKnee]);
  const elbow = avg([lElbow, rElbow]);

  if (key.includes('squat')) {
    if (knee === null) return PHASES.SETUP;
    if (knee < 115) return PHASES.FOLLOW_THROUGH;
    if (knee < 150) return PHASES.EXECUTION;
    return PHASES.SETUP;
  }
  if (key.includes('archery')) {
    if (elbow === null) return PHASES.SETUP;
    if (elbow < 122) return PHASES.FOLLOW_THROUGH;
    if (elbow < 155) return PHASES.EXECUTION;
    return PHASES.SETUP;
  }
  if (key.includes('cricket')) {
    if (rElbow === null) return PHASES.SETUP;
    if (rElbow > 158) return PHASES.FOLLOW_THROUGH;
    if (rElbow > 120) return PHASES.EXECUTION;
    return PHASES.SETUP;
  }
  if (key.includes('tennis')) {
    if (rElbow === null) return PHASES.SETUP;
    if (rElbow > 162) return PHASES.FOLLOW_THROUGH;
    if (rElbow > 125) return PHASES.EXECUTION;
    return PHASES.SETUP;
  }
  return PHASES.SETUP;
}

function getRepSignalValue(sport, payload) {
  const key = getSportKey(sport);
  const lElbow = safeNum(payload?.angles?.['Left elbow']);
  const rElbow = safeNum(payload?.angles?.['Right elbow']);
  const lKnee = safeNum(payload?.angles?.['Left knee posture']);
  const rKnee = safeNum(payload?.angles?.['Right knee posture']);
  const knee = avg([lKnee, rKnee]);
  const elbow = avg([lElbow, rElbow]);

  if (key.includes('squat')) return knee;
  if (key.includes('archery')) return elbow;
  if (key.includes('cricket')) return rElbow ?? elbow;
  if (key.includes('tennis')) return rElbow ?? elbow;
  return elbow;
}

function getRepThresholds(sport) {
  const key = getSportKey(sport);
  if (key.includes('squat')) return { loadBelow: 118, completeAbove: 155, direction: 'down-then-up' };
  if (key.includes('archery')) return { loadBelow: 122, completeAbove: 158, direction: 'down-then-up' };
  if (key.includes('cricket')) return { loadBelow: 118, completeAbove: 160, direction: 'down-then-up' };
  if (key.includes('tennis')) return { loadBelow: 125, completeAbove: 162, direction: 'down-then-up' };
  return { loadBelow: 120, completeAbove: 155, direction: 'down-then-up' };
}

function calcRepScore(payload) {
  const correctCount = Array.isArray(payload.analysis) ? payload.analysis.filter((x) => x.correct).length : 0;
  const total = Array.isArray(payload.analysis) && payload.analysis.length ? payload.analysis.length : 1;
  const ruleScore = (correctCount / total) * 100;
  const quality = safeNum(payload?.advanced?.tracking_quality) ?? 60;
  const stability = safeNum(payload?.advanced?.stability_score) ?? 60;
  const balance = safeNum(payload?.advanced?.balance_score) ?? 60;
  return Math.round((ruleScore * 0.4) + (quality * 0.2) + (stability * 0.2) + (balance * 0.2));
}

function captureFrameThumbnail(videoEl, canvasEl) {
  if (!videoEl || !canvasEl || !videoEl.videoWidth || !videoEl.videoHeight) return null;
  const targetW = 220;
  const targetH = Math.max(120, Math.round((targetW / videoEl.videoWidth) * videoEl.videoHeight));
  canvasEl.width = targetW;
  canvasEl.height = targetH;
  const ctx = canvasEl.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(videoEl, 0, 0, targetW, targetH);
  return canvasEl.toDataURL('image/jpeg', 0.55);
}

function analyzeCameraFrame(videoEl, scratchCanvas) {
  const vw = videoEl.videoWidth || 0;
  const vh = videoEl.videoHeight || 0;
  if (!vw || !vh || !scratchCanvas) {
    return { brightness: null, sharpness: null, exposure: 'unknown', quality_score: null };
  }

  const targetW = 160;
  const targetH = Math.max(90, Math.round((targetW / vw) * vh));
  scratchCanvas.width = targetW;
  scratchCanvas.height = targetH;
  const ctx = scratchCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { brightness: null, sharpness: null, exposure: 'unknown', quality_score: null };
  }
  ctx.drawImage(videoEl, 0, 0, targetW, targetH);
  const data = ctx.getImageData(0, 0, targetW, targetH).data;

  let brightnessSum = 0;
  let sharpnessSum = 0;
  let pxCount = 0;
  for (let y = 0; y < targetH - 1; y += 2) {
    for (let x = 0; x < targetW - 1; x += 2) {
      const i = (y * targetW + x) * 4;
      const j = (y * targetW + (x + 1)) * 4;
      const k = ((y + 1) * targetW + x) * 4;
      const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      const grayR = 0.2126 * data[j] + 0.7152 * data[j + 1] + 0.0722 * data[j + 2];
      const grayD = 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2];
      brightnessSum += gray;
      sharpnessSum += Math.abs(gray - grayR) + Math.abs(gray - grayD);
      pxCount += 1;
    }
  }

  const brightness = pxCount ? (brightnessSum / pxCount / 255) * 100 : null;
  const sharpness = pxCount ? clamp((sharpnessSum / pxCount) * 1.35, 0, 100) : null;
  const exposure = brightness === null ? 'unknown' : brightness < 25 ? 'low' : brightness > 82 ? 'high' : 'good';
  const qualityScore =
    brightness === null || sharpness === null
      ? null
      : Math.round(clamp((sharpness * 0.62) + ((100 - Math.abs(55 - brightness) * 1.7) * 0.38), 0, 100));

  return {
    brightness: brightness === null ? null : Number(brightness.toFixed(1)),
    sharpness: sharpness === null ? null : Number(sharpness.toFixed(1)),
    exposure,
    quality_score: qualityScore,
  };
}

function smoothPose(prevPose, currentPose) {
  if (!currentPose) return null;
  if (!prevPose || prevPose.length !== currentPose.length) {
    return currentPose.map((lm) => ({ ...lm }));
  }
  return currentPose.map((lm, idx) => {
    const prev = prevPose[idx];
    if (!prev) return { ...lm };
    const isHand = [15, 16, 17, 18, 19, 20, 21, 22].includes(idx);
    const alpha = isHand ? SMOOTHING_ALPHA_HAND : SMOOTHING_ALPHA_BODY;
    return {
      ...lm,
      x: prev.x + (lm.x - prev.x) * alpha,
      y: prev.y + (lm.y - prev.y) * alpha,
      z: prev.z + (lm.z - prev.z) * alpha,
      visibility: lm.visibility,
      presence: lm.presence,
    };
  });
}

function buildLocalPayload(pose, videoEl, sport, student, ruleProfile, cameraMetrics = null) {
  const fw = videoEl.videoWidth || 640;
  const fh = videoEl.videoHeight || 480;
  if (!pose) {
    return {
      detected: false,
      sport,
      student,
      feedback: ['No pose detected. Step fully into frame.'],
      analysis: [],
      angles: {},
      coords: {},
      connections: POSE_CONNECTIONS,
      frame_width: fw,
      frame_height: fh,
    };
  }

  const coords = {};
  const normalized_coords = {};
  pose.forEach((lm, idx) => {
    const isHand = [15, 16, 17, 18, 19, 20, 21, 22].includes(idx);
    const isFace = idx === 0;
    const threshold = isHand ? HAND_VIS_THRESHOLD : (isFace ? FACE_VIS_THRESHOLD : LANDMARK_VIS_THRESHOLD);
    const visibility = Number(lm.visibility ?? 1);
    const presence = Number(lm.presence ?? 1);
    if (visibility < threshold || presence < threshold) {
      return;
    }
    const nx = Math.min(1, Math.max(0, Number(lm.x ?? 0)));
    const ny = Math.min(1, Math.max(0, Number(lm.y ?? 0)));
    normalized_coords[idx] = [nx, ny];
    coords[idx] = [nx * fw, ny * fh];
  });

  const p = (idx) => coords[idx];
  const midShoulder = p(11) && p(12) ? [(p(11)[0] + p(12)[0]) / 2, (p(11)[1] + p(12)[1]) / 2] : null;
  const midHip = p(23) && p(24) ? [(p(23)[0] + p(24)[0]) / 2, (p(23)[1] + p(24)[1]) / 2] : null;
  const shoulderWidth = p(11) && p(12) ? Math.hypot(p(12)[0] - p(11)[0], p(12)[1] - p(11)[1]) : null;
  const leftElbow = calcAngle(p(11), p(13), p(15));
  const rightElbow = calcAngle(p(12), p(14), p(16));
  const shoulders = horizontalDeviation(p(11), p(12));
  const spine = verticalDeviation(midShoulder, midHip);
  const hipLevel = horizontalDeviation(p(23), p(24));
  const hipWidth = p(23) && p(24) ? Math.hypot(p(24)[0] - p(23)[0], p(24)[1] - p(23)[1]) : null;
  const ankleWidth = p(27) && p(28) ? Math.hypot(p(28)[0] - p(27)[0], p(28)[1] - p(27)[1]) : null;
  const stanceWidth = hipWidth && ankleWidth ? ankleWidth / hipWidth : null;
  const leftKnee = calcAngle(p(23), p(25), p(27));
  const rightKnee = calcAngle(p(24), p(26), p(28));
  const headAlignment = p(0) && midShoulder && shoulderWidth
    ? Math.abs((p(0)[0] - midShoulder[0]) / shoulderWidth) * 100
    : null;
  const neckTilt = p(0) && midShoulder ? verticalDeviation(p(0), midShoulder) : null;

  const analysis = [
    checkMetric('Left elbow', leftElbow, 13, ruleProfile),
    checkMetric('Right elbow', rightElbow, 14, ruleProfile),
    checkMetric('Shoulders', shoulders, 11, ruleProfile),
    checkMetric('Spine', spine, 23, ruleProfile),
    checkMetric('Hip level', hipLevel, 24, ruleProfile),
    checkMetric('Stance width', stanceWidth, 25, ruleProfile),
    checkMetric('Left knee posture', leftKnee, 25, ruleProfile),
    checkMetric('Right knee posture', rightKnee, 26, ruleProfile),
    checkMetric('Head alignment', headAlignment, 0, ruleProfile),
    checkMetric('Neck tilt', neckTilt, 0, ruleProfile),
  ];

  const feedback = analysis.filter((i) => !i.correct && i.message).map((i) => i.message);
  const points = Object.values(coords);
  let framing = { status: 'unknown', distance: 'unknown', center_offset_x: null, center_offset_y: null, body_coverage: null };
  if (points.length > 6) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    points.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const coverage = clamp((bw * bh) / (fw * fh), 0, 1);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const offsetX = Math.abs(cx - fw / 2) / (fw / 2);
    const offsetY = Math.abs(cy - fh / 2) / (fh / 2);
    framing = {
      status: offsetX < 0.2 && offsetY < 0.25 ? 'centered' : 'off_center',
      distance: coverage < 0.15 ? 'too_far' : coverage > 0.67 ? 'too_close' : 'optimal',
      center_offset_x: Number(offsetX.toFixed(3)),
      center_offset_y: Number(offsetY.toFixed(3)),
      body_coverage: Number((coverage * 100).toFixed(1)),
    };
  }

  const critical = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
  const missing = critical.filter((idx) => !coords[idx]).length;
  const visibilityScore = Number(((coords ? Object.keys(coords).length : 0) / 33 * 100).toFixed(1));
  const occlusion = missing >= 5 ? 'high' : missing >= 2 ? 'medium' : 'low';

  if (framing.status === 'off_center') feedback.push('Recenter your body in frame');
  if (framing.distance === 'too_far') feedback.push('Move closer for better tracking');
  if (framing.distance === 'too_close') feedback.push('Step back slightly to show full body');
  if (occlusion !== 'low') feedback.push('Keep both arms and legs fully visible');
  if (cameraMetrics?.exposure === 'low') feedback.push('Increase lighting');
  if (cameraMetrics?.exposure === 'high') feedback.push('Reduce backlight/glare');
  if (cameraMetrics?.sharpness !== null && cameraMetrics.sharpness < 20) feedback.push('Camera blur detected');

  const angles = analysis.reduce((acc, i) => {
    acc[i.name] = i.angle;
    return acc;
  }, {});

  return {
    detected: true,
    sport,
    student,
    feedback: feedback.length ? feedback.slice(0, 8) : ['Posture looks good.'],
    analysis,
    angles,
    coords,
    normalized_coords,
    camera: cameraMetrics,
    framing,
    visibility_score: visibilityScore,
    occlusion,
    connections: POSE_CONNECTIONS,
    frame_width: fw,
    frame_height: fh,
  };
}

export function useLivePose() {
  const [connected, setConnected] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [mode, setMode] = useState('local');

  const streamRef = useRef(null);
  const frameCbIdRef = useRef(null);
  const rafIdRef = useRef(null);
  const videoElRef = useRef(null);
  const ruleProfileRef = useRef(null);
  const landmarkerRef = useRef({});
  const localLoopActiveRef = useRef(false);
  const pausedRef = useRef(false);
  const prevPoseRef = useRef(null);
  const motionHistoryRef = useRef([]);
  const holdStartRef = useRef(null);
  const cameraCanvasRef = useRef(typeof document !== 'undefined' ? document.createElement('canvas') : null);
  const thumbnailCanvasRef = useRef(typeof document !== 'undefined' ? document.createElement('canvas') : null);
  const cameraMetricsRef = useRef({ value: null, lastAt: 0 });
  const lastBestFrameCaptureAtRef = useRef(0);
  const repStateRef = useRef({
    count: 0,
    armed: false,
    repStartTs: null,
    phase: PHASES.SETUP,
    bestRep: null,
  });
  const sessionStartPerfRef = useRef(null);
  const sessionStatsRef = useRef({
    frameCount: 0,
    validFrameCount: 0,
    sumTracking: 0,
    sumStability: 0,
    sumBalance: 0,
    sumSpeed: 0,
    phaseCounts: { [PHASES.SETUP]: 0, [PHASES.EXECUTION]: 0, [PHASES.FOLLOW_THROUGH]: 0 },
    scoreSeries: [],
    repEvents: [],
    phaseEvents: [],
    lastPhase: PHASES.SETUP,
    bestFrame: null,
  });

  const stop = useCallback(() => {
    setRunning(false);
    setConnected(false);
    setPaused(false);
    pausedRef.current = false;
    localLoopActiveRef.current = false;
    if (frameCbIdRef.current && videoElRef.current && typeof videoElRef.current.cancelVideoFrameCallback === 'function') {
      videoElRef.current.cancelVideoFrameCallback(frameCbIdRef.current);
      frameCbIdRef.current = null;
    }
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    videoElRef.current = null;
    prevPoseRef.current = null;
    motionHistoryRef.current = [];
    holdStartRef.current = null;
    repStateRef.current = {
      count: 0,
      armed: false,
      repStartTs: null,
      phase: PHASES.SETUP,
      bestRep: null,
    };
    sessionStartPerfRef.current = null;
    cameraMetricsRef.current = { value: null, lastAt: 0 };
    lastBestFrameCaptureAtRef.current = 0;
    sessionStatsRef.current = {
      frameCount: 0,
      validFrameCount: 0,
      sumTracking: 0,
      sumStability: 0,
      sumBalance: 0,
      sumSpeed: 0,
      phaseCounts: { [PHASES.SETUP]: 0, [PHASES.EXECUTION]: 0, [PHASES.FOLLOW_THROUGH]: 0 },
      scoreSeries: [],
      repEvents: [],
      phaseEvents: [],
      lastPhase: PHASES.SETUP,
      bestFrame: null,
    };
  }, []);

  const initLocalLandmarker = useCallback(async (modelVariant = 'full') => {
    const variant = modelVariant === 'lite' ? 'lite' : 'full';
    if (landmarkerRef.current?.[variant]) return landmarkerRef.current[variant];
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );
    const landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          variant === 'lite'
            ? 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task'
            : 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    landmarkerRef.current[variant] = landmarker;
    return landmarker;
  }, []);

  const start = useCallback(
    async ({
      videoEl,
      sport = 'Archery',
      student = '',
      fps = 10,
      width = 320,
      height = 240,
      lowLatency = true,
      ruleProfile = null,
    }) => {
      try {
        setError('');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: width },
            height: { ideal: height },
            frameRate: lowLatency ? { ideal: Math.max(18, fps), max: Math.max(18, fps + 6) } : { ideal: fps },
            facingMode: 'user',
          },
          audio: false,
        });
        streamRef.current = stream;
        videoElRef.current = videoEl;
        videoEl.srcObject = stream;
        await videoEl.play();

        const modelVariant = lowLatency ? 'lite' : 'full';
        const landmarker = await initLocalLandmarker(modelVariant);
        ruleProfileRef.current = ruleProfile;
        setMode('local');
        setConnected(true);
        setRunning(true);
        setPaused(false);
        pausedRef.current = false;
        localLoopActiveRef.current = true;
        cameraMetricsRef.current = { value: null, lastAt: 0 };
        lastBestFrameCaptureAtRef.current = 0;
        sessionStartPerfRef.current = performance.now();
        sessionStatsRef.current.phaseEvents = [{ t: 0, phase: PHASES.SETUP }];
        const minInterval = Math.max(20, Math.floor(1000 / Math.max(1, fps)));
        const cameraMetricsInterval = lowLatency ? CAMERA_METRICS_INTERVAL_FAST : CAMERA_METRICS_INTERVAL_BALANCED;
        const bestFrameCaptureInterval = lowLatency ? BEST_FRAME_CAPTURE_FAST : BEST_FRAME_CAPTURE_BALANCED;
        let lastAt = 0;

        const scheduleNext = () => {
          if (!localLoopActiveRef.current || !videoElRef.current) return;
          if (typeof videoElRef.current.requestVideoFrameCallback === 'function') {
            frameCbIdRef.current = videoElRef.current.requestVideoFrameCallback((mediaNow) => loop(mediaNow));
          } else {
            rafIdRef.current = requestAnimationFrame((rafNow) => loop(rafNow));
          }
        };

        const loop = (frameNow = performance.now()) => {
          if (!localLoopActiveRef.current || !videoElRef.current) return;
          if (pausedRef.current) {
            scheduleNext();
            return;
          }
          const now = Number.isFinite(frameNow) ? frameNow : performance.now();
          if (now - lastAt >= minInterval) {
            const detectStartedAt = performance.now();
            const result = landmarker.detectForVideo(videoElRef.current, now);
            const inferenceMs = performance.now() - detectStartedAt;
            const pose = result?.landmarks?.[0] || result?.poseLandmarks?.[0] || null;
            const smoothedPose = smoothPose(prevPoseRef.current, pose);
            prevPoseRef.current = smoothedPose;
            let cameraMetrics = cameraMetricsRef.current.value;
            if (now - cameraMetricsRef.current.lastAt >= cameraMetricsInterval || !cameraMetrics) {
              cameraMetrics = analyzeCameraFrame(videoElRef.current, cameraCanvasRef.current);
              cameraMetricsRef.current = { value: cameraMetrics, lastAt: now };
            }
            const payload = buildLocalPayload(
              smoothedPose,
              videoElRef.current,
              sport,
              student,
              ruleProfileRef.current,
              cameraMetrics
            );

            if (payload.detected && payload.coords?.[23] && payload.coords?.[24]) {
              const hipMidX = (payload.coords[23][0] + payload.coords[24][0]) / 2;
              const hipMidY = (payload.coords[23][1] + payload.coords[24][1]) / 2;
              motionHistoryRef.current.push({ x: hipMidX, y: hipMidY, t: now });
              if (motionHistoryRef.current.length > MOTION_HISTORY_MAX) motionHistoryRef.current.shift();
            } else {
              motionHistoryRef.current = [];
            }

            let bodySpeed = 0;
            let stabilityScore = null;
            if (motionHistoryRef.current.length >= 3) {
              const latest = motionHistoryRef.current[motionHistoryRef.current.length - 1];
              const prev = motionHistoryRef.current[motionHistoryRef.current.length - 2];
              const dt = Math.max(1, latest.t - prev.t);
              const d = Math.hypot(latest.x - prev.x, latest.y - prev.y);
              bodySpeed = Number(((d / dt) * 1000).toFixed(1));

              const meanX = motionHistoryRef.current.reduce((acc, p) => acc + p.x, 0) / motionHistoryRef.current.length;
              const meanY = motionHistoryRef.current.reduce((acc, p) => acc + p.y, 0) / motionHistoryRef.current.length;
              const jitter =
                motionHistoryRef.current.reduce((acc, p) => acc + Math.hypot(p.x - meanX, p.y - meanY), 0) /
                motionHistoryRef.current.length;
              stabilityScore = Math.round(clamp(100 - (jitter / Math.max(1, payload.frame_width || 640)) * 900, 0, 100));
            }

            let balanceScore = null;
            if (payload.coords?.[23] && payload.coords?.[24] && payload.coords?.[27] && payload.coords?.[28]) {
              const hipCenterX = (payload.coords[23][0] + payload.coords[24][0]) / 2;
              const ankleCenterX = (payload.coords[27][0] + payload.coords[28][0]) / 2;
              const dev = Math.abs(hipCenterX - ankleCenterX) / Math.max(1, payload.frame_width || 640);
              balanceScore = Math.round(clamp(100 - dev * 330, 0, 100));
            }

            const allCorrect = payload.detected && Array.isArray(payload.analysis) && payload.analysis.length
              ? payload.analysis.every((item) => item.correct)
              : false;
            if (allCorrect && holdStartRef.current === null) holdStartRef.current = now;
            if (!allCorrect) holdStartRef.current = null;
            const holdSec = holdStartRef.current ? Math.max(0, Math.floor((now - holdStartRef.current) / 1000)) : 0;

            payload.advanced = {
              body_speed_px_s: bodySpeed,
              stability_score: stabilityScore,
              balance_score: balanceScore,
              hold_seconds: holdSec,
              tracking_quality: payload.camera?.quality_score ?? null,
              lateral_velocity_px_s: motionHistoryRef.current.length >= 2
                ? Number((((motionHistoryRef.current[motionHistoryRef.current.length - 1].x - motionHistoryRef.current[motionHistoryRef.current.length - 2].x)
                  / Math.max(1, (motionHistoryRef.current[motionHistoryRef.current.length - 1].t - motionHistoryRef.current[motionHistoryRef.current.length - 2].t))) * 1000).toFixed(1))
                : 0,
              vertical_velocity_px_s: motionHistoryRef.current.length >= 2
                ? Number((((motionHistoryRef.current[motionHistoryRef.current.length - 1].y - motionHistoryRef.current[motionHistoryRef.current.length - 2].y)
                  / Math.max(1, (motionHistoryRef.current[motionHistoryRef.current.length - 1].t - motionHistoryRef.current[motionHistoryRef.current.length - 2].t))) * 1000).toFixed(1))
                : 0,
            };
            payload.runtime = {
              model_variant: modelVariant,
              inference_ms: Number(inferenceMs.toFixed(1)),
              cadence_ms: minInterval,
              target_fps: Math.round(1000 / Math.max(1, minInterval)),
            };

            const phase = getPhaseForSport(sport, payload);
            repStateRef.current.phase = phase;
            const signal = getRepSignalValue(sport, payload);
            const thresholds = getRepThresholds(sport);
            if (Number.isFinite(signal)) {
              if (!repStateRef.current.armed && signal <= thresholds.loadBelow) {
                repStateRef.current.armed = true;
                repStateRef.current.repStartTs = now;
              }
              if (repStateRef.current.armed && signal >= thresholds.completeAbove) {
                repStateRef.current.count += 1;
                const repEnd = now;
                const repStart = repStateRef.current.repStartTs || now;
                const repScore = calcRepScore(payload);
                const repMeta = {
                  index: repStateRef.current.count,
                  score: repScore,
                  start_s: sessionStartPerfRef.current ? Number(((repStart - sessionStartPerfRef.current) / 1000).toFixed(2)) : null,
                  end_s: sessionStartPerfRef.current ? Number(((repEnd - sessionStartPerfRef.current) / 1000).toFixed(2)) : null,
                  phase,
                  key_angles: {
                    left_elbow: safeNum(payload?.angles?.['Left elbow']),
                    right_elbow: safeNum(payload?.angles?.['Right elbow']),
                    left_knee: safeNum(payload?.angles?.['Left knee posture']),
                    right_knee: safeNum(payload?.angles?.['Right knee posture']),
                  },
                };
                if (!repStateRef.current.bestRep || repMeta.score > repStateRef.current.bestRep.score) {
                  repStateRef.current.bestRep = repMeta;
                }
                repStateRef.current.armed = false;
                repStateRef.current.repStartTs = null;
              }
            }

            payload.training = {
              phase: repStateRef.current.phase,
              rep_count: repStateRef.current.count,
              best_rep: repStateRef.current.bestRep,
            };

            const stat = sessionStatsRef.current;
            stat.frameCount += 1;
            if (payload.detected) stat.validFrameCount += 1;
            stat.phaseCounts[repStateRef.current.phase] = (stat.phaseCounts[repStateRef.current.phase] || 0) + 1;
            stat.sumTracking += Number(payload.advanced?.tracking_quality || 0);
            stat.sumStability += Number(payload.advanced?.stability_score || 0);
            stat.sumBalance += Number(payload.advanced?.balance_score || 0);
            stat.sumSpeed += Number(payload.advanced?.body_speed_px_s || 0);

            const liveScore = calcRepScore(payload);
            const elapsedS = sessionStartPerfRef.current ? Number(((now - sessionStartPerfRef.current) / 1000).toFixed(2)) : 0;
            if (stat.scoreSeries.length === 0 || elapsedS - stat.scoreSeries[stat.scoreSeries.length - 1].t >= 1) {
              stat.scoreSeries.push({ t: elapsedS, score: liveScore });
              if (stat.scoreSeries.length > 240) stat.scoreSeries.shift();
            }

            if (repStateRef.current.phase !== stat.lastPhase) {
              stat.phaseEvents.push({ t: elapsedS, phase: repStateRef.current.phase });
              stat.lastPhase = repStateRef.current.phase;
            }

            const repEventsCount = stat.repEvents.length;
            if (payload.training.rep_count > repEventsCount) {
              stat.repEvents.push({
                rep: payload.training.rep_count,
                t: elapsedS,
                phase: repStateRef.current.phase,
                score: liveScore,
              });
            }

            if (!stat.bestFrame || liveScore > stat.bestFrame.score + 1) {
              const canCapture = now - lastBestFrameCaptureAtRef.current >= bestFrameCaptureInterval;
              const thumb = canCapture ? captureFrameThumbnail(videoElRef.current, thumbnailCanvasRef.current) : stat.bestFrame?.thumbnail;
              if (canCapture) lastBestFrameCaptureAtRef.current = now;
              stat.bestFrame = {
                score: liveScore,
                t: elapsedS,
                thumbnail: thumb,
              };
            }

            const avg = (n, denom) => (denom > 0 ? Number((n / denom).toFixed(2)) : null);
            const denom = Math.max(1, stat.frameCount);
            const qualityAvg = avg(stat.sumTracking, denom);
            const stabilityAvg = avg(stat.sumStability, denom);
            const balanceAvg = avg(stat.sumBalance, denom);
            const speedAvg = avg(stat.sumSpeed, denom);
            const validRatio = Number(((stat.validFrameCount / denom) * 100).toFixed(1));
            const sessionScore = Math.round(
              clamp(
                (Number(qualityAvg || 0) * 0.3) +
                (Number(stabilityAvg || 0) * 0.3) +
                (Number(balanceAvg || 0) * 0.2) +
                (validRatio * 0.2),
                0,
                100
              )
            );

            payload.training.session_summary = {
              session_score: sessionScore,
              score_breakdown: {
                tracking_quality: qualityAvg,
                stability: stabilityAvg,
                balance: balanceAvg,
                valid_tracking_ratio: validRatio,
              },
              phase_distribution: stat.phaseCounts,
              rep_events: stat.repEvents.slice(-120),
              phase_events: stat.phaseEvents.slice(-160),
              score_series: stat.scoreSeries.slice(-240),
              best_frame: stat.bestFrame,
              movement: {
                avg_body_speed_px_s: speedAvg,
                avg_stability_score: stabilityAvg,
                avg_balance_score: balanceAvg,
              },
            };

            setAnalysis(payload);
            lastAt = now;
          }
          scheduleNext();
        };
        scheduleNext();
      } catch {
        setError('Unable to start browser pose model. Check camera permissions and network for model download.');
        stop();
      }
    },
    [initLocalLandmarker, stop]
  );

  useEffect(() => {
    return () => {
      stop();
      Object.values(landmarkerRef.current || {}).forEach((instance) => instance?.close?.());
      landmarkerRef.current = {};
    };
  }, [stop]);

  const pause = useCallback(() => {
    if (!running || pausedRef.current) return;
    pausedRef.current = true;
    setPaused(true);
  }, [running]);

  const resume = useCallback(() => {
    if (!running || !pausedRef.current) return;
    pausedRef.current = false;
    setPaused(false);
  }, [running]);

  return { connected, running, paused, error, analysis, mode, start, stop, pause, resume };
}
