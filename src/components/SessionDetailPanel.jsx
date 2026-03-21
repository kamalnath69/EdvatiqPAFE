import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { exportSessionReportPdf } from '../utils/pdfReports';

const PIE_COLORS = ['#2563eb', '#0f172a', '#f59e0b', '#38bdf8'];

function toAngleRows(session) {
  return Object.entries(session?.angles || {}).map(([name, value]) => ({
    name,
    value: Number(value || 0),
  }));
}

function toPhaseRows(session) {
  const phases = session?.phase_summary || {};
  return Object.entries(phases).map(([name, value]) => ({ name, value: Number(value || 0) }));
}

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

function formatDuration(startedAt, endedAt, fallbackMinutes) {
  const fallback = Number(fallbackMinutes);
  if (Number.isFinite(fallback) && fallback > 0) return `${fallback} min`;
  const started = toTimestamp(startedAt);
  const ended = toTimestamp(endedAt);
  if (!started || !ended || ended <= started) return '--';
  return `${Math.max(1, Math.round((ended - started) / 60000))} min`;
}

function formatNumber(value, digits = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '--';
  return numeric.toFixed(digits);
}

function feedbackItems(session) {
  if (!Array.isArray(session?.feedback)) return [];
  return session.feedback.map((item) => String(item || '').trim()).filter(Boolean);
}

function tagItems(session) {
  if (!Array.isArray(session?.tags)) return [];
  return session.tags.map((item) => String(item || '').trim()).filter(Boolean);
}

function DetailTable({ title, subtitle, headers, rows }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h4 className="panel-title">{title}</h4>
          {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      <div className="table-wrap report-table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${index}-${cellIndex}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SessionDetailPanel({
  session,
  title = 'Selected Session Details',
  analyticsEnabled = true,
}) {
  const [exporting, setExporting] = useState(false);
  if (!session) return null;

  const scoreSeries = session?.timeline_summary?.score_series || [];
  const repEvents = session?.timeline_summary?.rep_events || [];
  const angleRows = toAngleRows(session);
  const phaseRows = toPhaseRows(session);
  const scoreBreakdown = Object.entries(session?.score_breakdown || {})
    .map(([name, value]) => ({ name, value: Number(value || 0) }))
    .filter((row) => Number.isFinite(row.value));
  const feedback = feedbackItems(session);
  const tags = tagItems(session);

  async function handleExportPdf() {
    if (exporting) return;
    try {
      setExporting(true);
      await exportSessionReportPdf(session, { title });
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="panel session-detail-shell">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">{title}</h3>
          <p className="panel-subtitle">Session summary, coach notes, movement details, and export-ready reporting.</p>
        </div>
        <div className="panel-actions">
          {analyticsEnabled ? (
            <button type="button" className="primary-button" onClick={handleExportPdf} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          ) : (
            <Link className="primary-button" to="/pricing">
              Upgrade to Pro
            </Link>
          )}
        </div>
      </div>

      <div className="stats-grid detail-kpi-grid">
        <article className="stat-card">
          <div className="stat-head">
            <p>Session Score</p>
          </div>
          <h3>{session?.session_score ?? '--'}</h3>
          <small>Full-session quality score</small>
        </article>
        <article className="stat-card">
          <div className="stat-head">
            <p>Rep Count</p>
          </div>
          <h3>{session?.rep_summary?.total_reps ?? 0}</h3>
          <small>Best rep {session?.rep_summary?.best_rep_score ?? '--'}</small>
        </article>
        <article className="stat-card">
          <div className="stat-head">
            <p>Tracking Quality</p>
          </div>
          <h3>{session?.camera_summary?.tracking_quality ?? '--'}</h3>
          <small>Occlusion {session?.camera_summary?.occlusion ?? '--'}</small>
        </article>
        <article className="stat-card">
          <div className="stat-head">
            <p>Duration</p>
          </div>
          <h3>{formatDuration(session?.started_at ?? session?.timestamp, session?.ended_at, session?.duration_minutes)}</h3>
          <small>{formatDateTime(session?.started_at ?? session?.timestamp)}</small>
        </article>
      </div>

      <div className="panel-grid detail-overview-grid">
        <section className="panel detail-summary-card">
          <div className="panel-header">
            <div>
              <h4 className="panel-title">Session overview</h4>
              <p className="panel-subtitle">Identity, schedule, ownership, and quick metadata.</p>
            </div>
          </div>
          <div className="detail-meta-grid">
            <article className="detail-meta-item">
              <span>Student</span>
              <strong>{session?.student || '--'}</strong>
            </article>
            <article className="detail-meta-item">
              <span>Sport</span>
              <strong>{session?.sport || '--'}</strong>
            </article>
            <article className="detail-meta-item">
              <span>Coach</span>
              <strong>{session?.created_by || '--'}</strong>
            </article>
            <article className="detail-meta-item">
              <span>Started</span>
              <strong>{formatDateTime(session?.started_at ?? session?.timestamp)}</strong>
            </article>
            <article className="detail-meta-item">
              <span>Ended</span>
              <strong>{formatDateTime(session?.ended_at)}</strong>
            </article>
            <article className="detail-meta-item">
              <span>Tags</span>
              <strong>{tags.length ? tags.join(', ') : '--'}</strong>
            </article>
          </div>
        </section>

        <section className="panel detail-feedback-card">
          <div className="panel-header">
            <div>
              <h4 className="panel-title">Coach feedback</h4>
              <p className="panel-subtitle">Primary correction cues and session notes live here, not in the tables.</p>
            </div>
          </div>
          <div className="detail-callout-stack">
            <article className="detail-callout">
              <span>Drill focus</span>
              <strong>{session?.drill_focus || 'No drill focus recorded.'}</strong>
            </article>
            <article className="detail-callout">
              <span>Coach note</span>
              <p>{session?.custom_note || 'No coach note recorded for this session yet.'}</p>
            </article>
          </div>
          <div className="detail-feedback-list">
            <p className="detail-section-label">Feedback cues</p>
            {feedback.length ? (
              <ul className="feedback-list">
                {feedback.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p className="help-text">No written feedback cues were stored for this session.</p>
            )}
          </div>
        </section>
      </div>

      {!analyticsEnabled ? (
        <section className="panel upgrade-panel">
          <h4 className="panel-title">AI Analytics is a Pro feature</h4>
          <p className="help-text">
            Upgrade to unlock advanced charts, exported reports, best-rep insights, and timeline intelligence for every session.
          </p>
          <Link className="primary-button" to="/pricing">
            View Pro Plans
          </Link>
        </section>
      ) : (
        <>
          <div className="panel-grid detail-support-grid">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h4 className="panel-title">Hardware telemetry</h4>
                  <p className="panel-subtitle">Environmental and device readings captured with the session.</p>
                </div>
              </div>
              <div className="detail-token-grid">
                <div className="detail-token">
                  <span>Temperature</span>
                  <strong>{session?.sensor_summary?.temperature_c != null ? `${formatNumber(session.sensor_summary.temperature_c, 1)} C` : '--'}</strong>
                  <small>Sensor feed</small>
                </div>
                <div className="detail-token">
                  <span>Pressure</span>
                  <strong>{session?.sensor_summary?.pressure_kpa != null ? `${formatNumber(session.sensor_summary.pressure_kpa, 1)} kPa` : '--'}</strong>
                  <small>Environment load</small>
                </div>
                <div className="detail-token">
                  <span>Humidity</span>
                  <strong>{session?.sensor_summary?.humidity_pct != null ? `${formatNumber(session.sensor_summary.humidity_pct, 0)} %` : '--'}</strong>
                  <small>Ambient</small>
                </div>
                <div className="detail-token">
                  <span>Device</span>
                  <strong>{session?.sensor_summary?.device_id || '--'}</strong>
                  <small>{session?.sensor_summary?.source || 'hardware'}</small>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h4 className="panel-title">Tracking & drill metrics</h4>
                  <p className="panel-subtitle">Camera quality, drill responsiveness, and best-frame context.</p>
                </div>
              </div>
              <div className="detail-token-grid">
                <div className="detail-token">
                  <span>Tracking</span>
                  <strong>{session?.camera_summary?.tracking_quality || '--'}</strong>
                  <small>Occlusion {session?.camera_summary?.occlusion || '--'}</small>
                </div>
                <div className="detail-token">
                  <span>Best frame</span>
                  <strong>{session?.best_frame?.score ?? '--'}</strong>
                  <small>{session?.best_frame?.t !== undefined ? `${session.best_frame.t}s` : 'No timestamp'}</small>
                </div>
                <div className="detail-token">
                  <span>Reaction drill</span>
                  <strong>{session?.rep_summary?.drill_avg_ms ? `${session.rep_summary.drill_avg_ms} ms` : '--'}</strong>
                  <small>Best {session?.rep_summary?.drill_best_ms ? `${session.rep_summary.drill_best_ms} ms` : '--'}</small>
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h4 className="panel-title">Best rep snapshot</h4>
                  <p className="panel-subtitle">Highest-quality repetition from the recorded timeline.</p>
                </div>
              </div>
              <div className="detail-best-rep-grid">
                <div className="detail-best-rep-copy">
                  <div className="detail-token-grid compact">
                    <div className="detail-token">
                      <span>Rep index</span>
                      <strong>{session?.best_rep?.index ?? '--'}</strong>
                    </div>
                    <div className="detail-token">
                      <span>Rep score</span>
                      <strong>{session?.best_rep?.score ?? '--'}</strong>
                    </div>
                    <div className="detail-token">
                      <span>Window</span>
                      <strong>
                        {session?.best_rep?.start_s ?? '--'}s to {session?.best_rep?.end_s ?? '--'}s
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="detail-best-frame">
                  {session?.best_frame?.thumbnail ? (
                    <img src={session.best_frame.thumbnail} alt="Best frame" className="best-frame-preview" />
                  ) : (
                    <div className="detail-frame-placeholder">No best frame thumbnail captured.</div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <div className="panel-grid detail-charts-grid">
            <section className="panel chart-panel">
              <h4 className="panel-title">Session Score Over Time</h4>
              <p className="panel-subtitle">Trend across the recorded timeline for this session.</p>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={scoreSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                    <XAxis dataKey="t" stroke="#6b778c" />
                    <YAxis stroke="#6b778c" domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#0052cc" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel chart-panel">
              <h4 className="panel-title">Angles Snapshot</h4>
              <p className="panel-subtitle">Recorded angle measurements for this session.</p>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={angleRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                    <XAxis dataKey="name" stroke="#6b778c" angle={-18} textAnchor="end" height={80} />
                    <YAxis stroke="#6b778c" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#2684ff" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel chart-panel">
              <h4 className="panel-title">Phase Distribution</h4>
              <p className="panel-subtitle">Time distribution by phase throughout the session.</p>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={phaseRows} dataKey="value" nameKey="name" outerRadius={90}>
                      {phaseRows.map((_, index) => (
                        <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel chart-panel">
              <h4 className="panel-title">Score Breakdown</h4>
              <p className="panel-subtitle">How the total quality score was composed.</p>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={scoreBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dfe1e6" />
                    <XAxis dataKey="name" stroke="#6b778c" angle={-18} textAnchor="end" height={80} />
                    <YAxis stroke="#6b778c" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="panel-grid detail-table-grid">
            <DetailTable
              title="Angle Details"
              subtitle="Readable metric table in addition to the chart view."
              headers={['Angle', 'Value']}
              rows={
                angleRows.length
                  ? angleRows.map((row) => [row.name, formatNumber(row.value, 1)])
                  : [['No angle measurements recorded', '--']]
              }
            />
            <DetailTable
              title="Score Component Details"
              subtitle="Breakdown values used in the session score."
              headers={['Component', 'Score']}
              rows={
                scoreBreakdown.length
                  ? scoreBreakdown.map((row) => [row.name, formatNumber(row.value, 1)])
                  : [['No score components recorded', '--']]
              }
            />
          </div>

          <DetailTable
            title="Timeline Events"
            subtitle="Rep-by-rep timing, phase, and score values."
            headers={['Rep', 'Time (s)', 'Phase', 'Score']}
            rows={
              repEvents.length
                ? repEvents.map((event) => [event.rep, event.t, event.phase, event.score])
                : [['--', '--', 'No rep events recorded', '--']]
            }
          />
        </>
      )}
    </section>
  );
}
