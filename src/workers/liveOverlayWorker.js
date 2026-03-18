let canvas = null;
let ctx = null;

function drawOverlay(payload) {
  if (!ctx || !canvas) return;
  const { coords, connections, analysis, frame_width: fw, frame_height: fh } = payload || {};
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!coords || !connections || !fw || !fh) return;

  const sx = canvas.width / fw;
  const sy = canvas.height / fh;
  const mx = (x) => canvas.width - x * sx;
  const my = (y) => y * sy;
  const jointStatus = {};
  (analysis || []).forEach((item) => {
    const j = Number(item.joint);
    if (!Number.isFinite(j)) return;
    if (!(j in jointStatus)) jointStatus[j] = true;
    jointStatus[j] = jointStatus[j] && Boolean(item.correct);
  });

  const drawLink = (a, b, color, width = 4.5) => {
    const p1 = coords[String(a)] || coords[a];
    const p2 = coords[String(b)] || coords[b];
    if (!p1 || !p2) return;
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(mx(p1[0]), my(p1[1]));
    ctx.lineTo(mx(p2[0]), my(p2[1]));
    ctx.stroke();
  };

  const leftColor = 'rgba(34, 197, 94, 0.95)';
  const rightColor = 'rgba(14, 165, 233, 0.95)';
  const neutralColor = 'rgba(245, 179, 49, 0.9)';

  connections.forEach(([a, b]) => {
    const bothLeft = [11, 13, 15, 23, 25, 27, 29, 31].includes(a) && [11, 13, 15, 23, 25, 27, 29, 31].includes(b);
    const bothRight = [12, 14, 16, 24, 26, 28, 30, 32].includes(a) && [12, 14, 16, 24, 26, 28, 30, 32].includes(b);
    const c = bothLeft ? leftColor : bothRight ? rightColor : neutralColor;
    drawLink(a, b, c, 4.5);
  });

  const lShoulder = coords['11'] || coords[11];
  const rShoulder = coords['12'] || coords[12];
  const lHip = coords['23'] || coords[23];
  const rHip = coords['24'] || coords[24];
  const lKnee = coords['25'] || coords[25];
  const rKnee = coords['26'] || coords[26];
  if (lShoulder && rShoulder && lHip && rHip) {
    const shoulderMid = [(lShoulder[0] + rShoulder[0]) / 2, (lShoulder[1] + rShoulder[1]) / 2];
    const hipMid = [(lHip[0] + rHip[0]) / 2, (lHip[1] + rHip[1]) / 2];
    const kneeMid = lKnee && rKnee ? [(lKnee[0] + rKnee[0]) / 2, (lKnee[1] + rKnee[1]) / 2] : null;
    const spineCheck = (analysis || []).find((item) => String(item.name || '').toLowerCase().includes('spine'));
    const spineColor = spineCheck && spineCheck.correct === false ? 'rgba(239, 68, 68, 0.98)' : 'rgba(16, 185, 129, 0.98)';

    ctx.lineWidth = 8;
    ctx.strokeStyle = spineColor;
    ctx.beginPath();
    ctx.moveTo(mx(shoulderMid[0]), my(shoulderMid[1]));
    ctx.lineTo(mx(hipMid[0]), my(hipMid[1]));
    if (kneeMid) ctx.lineTo(mx(kneeMid[0]), my(kneeMid[1]));
    ctx.stroke();

    ctx.fillStyle = spineColor;
    [shoulderMid, hipMid, kneeMid].filter(Boolean).forEach((p) => {
      ctx.beginPath();
      ctx.arc(mx(p[0]), my(p[1]), 6, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  Object.entries(coords).forEach(([idx, point]) => {
    const jointIdx = Number(idx);
    const isCorrect = jointStatus[jointIdx] ?? true;
    ctx.beginPath();
    ctx.fillStyle = isCorrect ? '#22c55e' : '#ef4444';
    ctx.arc(mx(point[0]), my(point[1]), isCorrect ? 4.2 : 5.2, 0, Math.PI * 2);
    ctx.fill();
  });

  (analysis || [])
    .filter((item) => !item.correct && item.message)
    .slice(0, 6)
    .forEach((item) => {
      const p = coords[String(item.joint)] || coords[item.joint];
      if (!p) return;
      const x = mx(p[0]) + 8;
      const y = my(p[1]) - 8;
      const text = String(item.message).slice(0, 42);
      ctx.font = '12px Sora, sans-serif';
      ctx.fillStyle = 'rgba(5, 10, 20, 0.85)';
      const pad = 4;
      const w = ctx.measureText(text).width + pad * 2;
      ctx.fillRect(x - pad, y - 12, w, 16);
      ctx.fillStyle = '#ff8a8a';
      ctx.fillText(text, x, y);
    });
}

self.onmessage = (event) => {
  const data = event.data || {};
  if (data.type === 'init') {
    canvas = data.canvas;
    ctx = canvas.getContext('2d');
    return;
  }
  if (data.type === 'resize' && canvas) {
    canvas.width = data.width;
    canvas.height = data.height;
    return;
  }
  if (data.type === 'draw') {
    drawOverlay(data.payload);
  }
};

