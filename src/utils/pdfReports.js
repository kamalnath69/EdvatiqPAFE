import { jsPDF } from 'jspdf';

function toTimestamp(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
}

function formatDateTime(value) {
  const timestamp = toTimestamp(value);
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleString();
}

function formatDateOnly(value) {
  const timestamp = toTimestamp(value);
  if (!timestamp) return '--';
  return new Date(timestamp).toLocaleDateString();
}

function formatDurationMinutes(startedAt, endedAt, fallbackMinutes) {
  const fallback = Number(fallbackMinutes);
  if (Number.isFinite(fallback) && fallback > 0) return `${fallback} min`;
  const start = toTimestamp(startedAt);
  const end = toTimestamp(endedAt);
  if (!start || !end || end <= start) return '--';
  return `${Math.max(1, Math.round((end - start) / 60000))} min`;
}

function formatNumber(value, digits = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';
  return numeric.toFixed(digits);
}

function toFeedbackItems(session) {
  if (!Array.isArray(session?.feedback)) return [];
  return session.feedback.map((item) => String(item || '').trim()).filter(Boolean);
}

function toTagItems(session) {
  if (!Array.isArray(session?.tags)) return [];
  return session.tags.map((item) => String(item || '').trim()).filter(Boolean);
}

function buildWriter(title, subtitle) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let page = 1;
  let y = 0;

  function drawHeader() {
    pdf.setFillColor(17, 24, 39);
    pdf.roundedRect(margin, 10, contentWidth, 22, 4, 4, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(17);
    pdf.text(title, margin + 4, 19);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text(subtitle, margin + 4, 26);
    y = 40;
  }

  function drawFooter() {
    const footerY = pageHeight - 8;
    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, footerY - 4, pageWidth - margin, footerY - 4);
    pdf.setTextColor(100, 116, 139);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.text('Edvatiq Performance Intelligence', margin, footerY);
    pdf.text(`Page ${page}`, pageWidth - margin, footerY, { align: 'right' });
  }

  function addPage() {
    drawFooter();
    pdf.addPage();
    page += 1;
    drawHeader();
  }

  function ensureSpace(height = 12) {
    if (y + height <= pageHeight - 16) return;
    addPage();
  }

  function writeParagraph(text, options = {}) {
    const {
      fontSize = 10.5,
      color = [51, 65, 85],
      weight = 'normal',
      lineHeight = 5.2,
      spacingAfter = 2.5,
    } = options;
    const content = String(text || '').trim();
    if (!content) return;
    pdf.setTextColor(...color);
    pdf.setFont('helvetica', weight);
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(content, contentWidth);
    ensureSpace(lines.length * lineHeight + spacingAfter);
    pdf.text(lines, margin, y);
    y += lines.length * lineHeight + spacingAfter;
  }

  function writeSection(titleText, subtitleText = '') {
    ensureSpace(16);
    pdf.setTextColor(23, 43, 77);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12.5);
    pdf.text(titleText, margin, y);
    y += 6;
    if (subtitleText) {
      writeParagraph(subtitleText, {
        fontSize: 9.5,
        color: [100, 116, 139],
        lineHeight: 4.8,
        spacingAfter: 1.5,
      });
    }
  }

  function writeMetricGrid(items) {
    const filtered = items.filter((item) => item && item.label);
    if (!filtered.length) return;
    const columnCount = filtered.length >= 4 ? 4 : Math.min(filtered.length, 3);
    const gap = 4;
    const boxWidth = (contentWidth - gap * (columnCount - 1)) / columnCount;
    const boxHeight = 18;

    let index = 0;
    while (index < filtered.length) {
      const row = filtered.slice(index, index + columnCount);
      ensureSpace(boxHeight + 4);
      row.forEach((item, itemIndex) => {
        const x = margin + itemIndex * (boxWidth + gap);
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(222, 226, 230);
        pdf.roundedRect(x, y, boxWidth, boxHeight, 3, 3, 'FD');
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.text(String(item.label).toUpperCase(), x + 3, y + 5.5);
        pdf.setTextColor(17, 24, 39);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12.5);
        pdf.text(String(item.value || '--'), x + 3, y + 12.5);
      });
      y += boxHeight + 4;
      index += columnCount;
    }
  }

  function writeKeyValueGrid(items) {
    const filtered = items.filter((item) => item && item.label);
    if (!filtered.length) return;
    const columnCount = 2;
    const gap = 6;
    const columnWidth = (contentWidth - gap) / columnCount;
    let index = 0;
    while (index < filtered.length) {
      const row = filtered.slice(index, index + columnCount);
      let blockHeight = 0;
      const measured = row.map((item) => {
        const valueLines = pdf.splitTextToSize(String(item.value || '--'), columnWidth - 6);
        const height = 12 + valueLines.length * 4.8;
        blockHeight = Math.max(blockHeight, height);
        return { item, valueLines };
      });
      ensureSpace(blockHeight + 3);
      measured.forEach(({ item, valueLines }, columnIndex) => {
        const x = margin + columnIndex * (columnWidth + gap);
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(226, 232, 240);
        pdf.roundedRect(x, y, columnWidth, blockHeight, 3, 3, 'FD');
        pdf.setTextColor(107, 114, 128);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.text(String(item.label).toUpperCase(), x + 3, y + 5.5);
        pdf.setTextColor(17, 24, 39);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(valueLines, x + 3, y + 11);
      });
      y += blockHeight + 3;
      index += columnCount;
    }
  }

  function writeBullets(items) {
    const filtered = items.map((item) => String(item || '').trim()).filter(Boolean);
    if (!filtered.length) {
      writeParagraph('No details recorded.', { color: [100, 116, 139] });
      return;
    }
    filtered.forEach((item) => {
      const lines = pdf.splitTextToSize(item, contentWidth - 7);
      ensureSpace(lines.length * 5 + 3);
      pdf.setTextColor(37, 99, 235);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('•', margin, y);
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10.5);
      pdf.text(lines, margin + 5, y);
      y += lines.length * 5 + 1.5;
    });
    y += 1;
  }

  function writeTable(headers, rows) {
    const normalizedRows = rows.map((row) => row.map((cell) => String(cell ?? '--')));
    if (!normalizedRows.length) {
      writeParagraph('No rows available.', { color: [100, 116, 139] });
      return;
    }
    const weights = headers.map((header) => header.width || 1);
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    const widths = weights.map((weight) => (contentWidth * weight) / totalWeight);
    const baseX = margin;

    const drawRow = (cells, header = false) => {
      const cellLineSets = cells.map((cell, index) =>
        pdf.splitTextToSize(cell, Math.max(18, widths[index] - 5))
      );
      const rowHeight = Math.max(...cellLineSets.map((lines) => lines.length * 4.4 + 6));
      ensureSpace(rowHeight + 1);

      let cursorX = baseX;
      cellLineSets.forEach((lines, index) => {
        pdf.setFillColor(...(header ? [241, 245, 249] : [255, 255, 255]));
        pdf.setDrawColor(226, 232, 240);
        pdf.rect(cursorX, y, widths[index], rowHeight, 'FD');
        pdf.setTextColor(...(header ? [71, 85, 105] : [15, 23, 42]));
        pdf.setFont('helvetica', header ? 'bold' : 'normal');
        pdf.setFontSize(header ? 9 : 9.5);
        pdf.text(lines, cursorX + 2.5, y + 5);
        cursorX += widths[index];
      });

      y += rowHeight;
    };

    drawRow(headers.map((header) => header.label), true);
    normalizedRows.forEach((row) => drawRow(row, false));
    y += 2;
  }

  drawHeader();

  return {
    pdf,
    writeSection,
    writeParagraph,
    writeMetricGrid,
    writeKeyValueGrid,
    writeBullets,
    writeTable,
    finalize(fileName) {
      drawFooter();
      pdf.save(fileName);
    },
  };
}

export async function exportSessionReportPdf(session, options = {}) {
  const title = options.title || 'Session Report';
  const writer = buildWriter('Edvatiq Session Report', 'Performance session summary, coaching notes, and movement details.');
  const scoreBreakdown = Object.entries(session?.score_breakdown || {}).filter(([, value]) => Number.isFinite(Number(value)));
  const angleRows = Object.entries(session?.angles || {}).filter(([, value]) => Number.isFinite(Number(value)));
  const repEvents = session?.timeline_summary?.rep_events || [];
  const feedbackItems = toFeedbackItems(session);
  const tagItems = toTagItems(session);

  writer.writeSection(title, 'Structured session export with summary, cues, camera quality, movement metrics, and rep timeline.');
  writer.writeMetricGrid([
    { label: 'Session score', value: formatNumber(session?.session_score, 0) },
    { label: 'Rep count', value: session?.rep_summary?.total_reps ?? '--' },
    { label: 'Best rep', value: formatNumber(session?.rep_summary?.best_rep_score, 0) },
    { label: 'Tracking', value: session?.camera_summary?.tracking_quality || '--' },
  ]);

  writer.writeSection('Session identity');
  writer.writeKeyValueGrid([
    { label: 'Student', value: session?.student || '--' },
    { label: 'Sport', value: session?.sport || '--' },
    { label: 'Coach', value: session?.created_by || '--' },
    { label: 'Date', value: formatDateOnly(session?.started_at ?? session?.timestamp) },
    { label: 'Started', value: formatDateTime(session?.started_at ?? session?.timestamp) },
    { label: 'Ended', value: formatDateTime(session?.ended_at) },
    { label: 'Duration', value: formatDurationMinutes(session?.started_at ?? session?.timestamp, session?.ended_at, session?.duration_minutes) },
    { label: 'Tags', value: tagItems.length ? tagItems.join(', ') : '--' },
  ]);

  writer.writeSection('Coaching summary');
  writer.writeKeyValueGrid([
    { label: 'Drill focus', value: session?.drill_focus || 'No drill focus recorded.' },
    { label: 'Coach note', value: session?.custom_note || 'No coach note recorded.' },
  ]);

  writer.writeSection('Feedback cues');
  writer.writeBullets(feedbackItems);

  writer.writeSection('Tracking and drill metrics');
  writer.writeTable(
    [
      { label: 'Metric', width: 1.25 },
      { label: 'Value', width: 0.9 },
      { label: 'Context', width: 1.2 },
    ],
    [
      ['Tracking quality', session?.camera_summary?.tracking_quality || '--', `Occlusion ${session?.camera_summary?.occlusion || '--'}`],
      ['Reaction hits', session?.rep_summary?.drill_hits ?? 0, `Attempts ${session?.rep_summary?.drill_attempts ?? 0}`],
      ['Drill average', session?.rep_summary?.drill_avg_ms ? `${session.rep_summary.drill_avg_ms} ms` : '--', `Best ${session?.rep_summary?.drill_best_ms ? `${session.rep_summary.drill_best_ms} ms` : '--'}`],
      ['Best frame', session?.best_frame?.score ?? '--', session?.best_frame?.t !== undefined ? `${session.best_frame.t}s` : '--'],
    ]
  );

  writer.writeSection('Hardware telemetry');
  writer.writeTable(
    [
      { label: 'Signal', width: 1.1 },
      { label: 'Value', width: 0.9 },
      { label: 'Context', width: 1.2 },
    ],
    [
      ['Temperature', session?.sensor_summary?.temperature_c != null ? `${formatNumber(session.sensor_summary.temperature_c, 1)} C` : '--', 'Captured from connected hardware'],
      ['Pressure', session?.sensor_summary?.pressure_kpa != null ? `${formatNumber(session.sensor_summary.pressure_kpa, 1)} kPa` : '--', 'Environmental pressure reading'],
      ['Humidity', session?.sensor_summary?.humidity_pct != null ? `${formatNumber(session.sensor_summary.humidity_pct, 0)} %` : '--', 'Ambient moisture'],
      ['Battery', session?.sensor_summary?.battery_pct != null ? `${formatNumber(session.sensor_summary.battery_pct, 0)} %` : '--', session?.sensor_summary?.device_id || session?.sensor_summary?.source || '--'],
    ]
  );

  writer.writeSection('Angle measurements');
  writer.writeTable(
    [
      { label: 'Angle', width: 1.6 },
      { label: 'Value', width: 0.8 },
    ],
    angleRows.length ? angleRows.map(([name, value]) => [name, formatNumber(value, 1)]) : [['No angle metrics recorded', '--']]
  );

  writer.writeSection('Score breakdown');
  writer.writeTable(
    [
      { label: 'Component', width: 1.6 },
      { label: 'Score', width: 0.8 },
    ],
    scoreBreakdown.length ? scoreBreakdown.map(([name, value]) => [name, formatNumber(value, 1)]) : [['No score components recorded', '--']]
  );

  writer.writeSection('Rep timeline');
  writer.writeTable(
    [
      { label: 'Rep', width: 0.5 },
      { label: 'Time', width: 0.7 },
      { label: 'Phase', width: 0.9 },
      { label: 'Score', width: 0.6 },
    ],
    repEvents.length
      ? repEvents.map((event) => [event.rep, `${event.t ?? '--'}s`, event.phase || '--', formatNumber(event.score, 0)])
      : [['--', '--', 'No rep events recorded', '--']]
  );

  const stamp = new Date().toISOString().slice(0, 10);
  const student = String(session?.student || 'session').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const sport = String(session?.sport || 'sport').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  writer.finalize(`${student}-${sport}-report-${stamp}.pdf`);
}

function filterSessionsForReport(sessions, report) {
  const sport = String(report?.sport || '').trim().toLowerCase();
  const timeWindow = report?.filters?.time_window || report?.chart_config?.time_window || '30d';
  const now = Date.now();
  const windowMap = {
    '7d': 7,
    '30d': 30,
    '90d': 90,
  };
  const minTimestamp = windowMap[timeWindow] ? now - windowMap[timeWindow] * 24 * 60 * 60 * 1000 : null;
  return sessions
    .filter((session) => {
      if (sport && String(session?.sport || '').trim().toLowerCase() !== sport) return false;
      const startedAt = toTimestamp(session?.started_at ?? session?.timestamp);
      if (minTimestamp && startedAt && startedAt < minTimestamp) return false;
      return true;
    })
    .sort((left, right) => (toTimestamp(right?.started_at ?? right?.timestamp) || 0) - (toTimestamp(left?.started_at ?? left?.timestamp) || 0));
}

export async function exportWorkspaceReportPdf(report, sessions = []) {
  const filteredSessions = filterSessionsForReport(sessions, report);
  const scores = filteredSessions.map((item) => Number(item.session_score)).filter((item) => Number.isFinite(item));
  const reps = filteredSessions.map((item) => Number(item?.rep_summary?.total_reps)).filter((item) => Number.isFinite(item));
  const feedbackPoints = filteredSessions.reduce((sum, item) => sum + (Array.isArray(item.feedback) ? item.feedback.length : 0), 0);
  const metrics = report?.metrics || {};

  const writer = buildWriter('Edvatiq Performance Report', 'Structured report export with summary metrics, recommendations, and recent session details.');
  writer.writeSection(report?.title || 'Workspace report', report?.summary || 'Saved report export generated from the Edvatiq workspace.');
  writer.writeMetricGrid([
    { label: 'Scope', value: report?.scope || 'personal' },
    { label: 'Sessions', value: filteredSessions.length },
    { label: 'Average score', value: scores.length ? formatNumber(scores.reduce((sum, value) => sum + value, 0) / scores.length, 1) : '--' },
    { label: 'Feedback cues', value: feedbackPoints },
  ]);

  writer.writeSection('Report definition');
  writer.writeKeyValueGrid([
    { label: 'Student', value: report?.student || 'Academy-wide' },
    { label: 'Sport', value: report?.sport || '--' },
    { label: 'Audience', value: metrics.audience || '--' },
    { label: 'Time window', value: report?.filters?.time_window || report?.chart_config?.time_window || '--' },
    { label: 'Updated', value: formatDateTime(report?.updated_at) },
    { label: 'Comparison mode', value: report?.filters?.include_comparison ? 'Included' : 'Standard' },
  ]);

  writer.writeSection('Highlights');
  writer.writeBullets(
    [metrics.highlights, metrics.recommendation]
      .join('\n')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  );

  writer.writeSection('Risk flags');
  writer.writeBullets(
    String(metrics.risks || '')
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
  );

  writer.writeSection('Session totals');
  writer.writeTable(
    [
      { label: 'Metric', width: 1.5 },
      { label: 'Value', width: 0.8 },
      { label: 'Context', width: 1.2 },
    ],
    [
      ['Average reps', reps.length ? formatNumber(reps.reduce((sum, value) => sum + value, 0) / reps.length, 1) : '--', 'Per session in selected window'],
      ['Best score', scores.length ? formatNumber(Math.max(...scores), 0) : '--', 'Highest recorded session score'],
      ['Latest report update', formatDateTime(report?.updated_at), 'Most recent report save/export'],
    ]
  );

  writer.writeSection('Recent session details', 'Latest session records included in this report window.');
  writer.writeTable(
    [
      { label: 'Date', width: 0.95 },
      { label: 'Student', width: 0.9 },
      { label: 'Sport', width: 0.7 },
      { label: 'Score', width: 0.5 },
      { label: 'Reps', width: 0.45 },
      { label: 'Coach note', width: 1.35 },
    ],
    filteredSessions.length
      ? filteredSessions.slice(0, 10).map((session) => [
          formatDateOnly(session?.started_at ?? session?.timestamp),
          session?.student || '--',
          session?.sport || '--',
          formatNumber(session?.session_score, 0),
          session?.rep_summary?.total_reps ?? '--',
          session?.custom_note || session?.drill_focus || 'No note recorded.',
        ])
      : [['--', '--', '--', '--', '--', 'No sessions matched the current report filters.']]
  );

  const fileName = `${String(report?.title || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date()
    .toISOString()
    .slice(0, 10)}.pdf`;
  writer.finalize(fileName);
}
