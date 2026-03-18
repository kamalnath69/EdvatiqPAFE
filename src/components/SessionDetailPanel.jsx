import { useRef, useState } from 'react';
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

const PIE_COLORS = ['#f5c518', '#1b1b1b', '#f59e0b'];

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

export default function SessionDetailPanel({
  session,
  title = 'Selected Session Details',
  analyticsEnabled = true,
}) {
  const exportRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  if (!session) return null;
  const scoreSeries = session?.timeline_summary?.score_series || [];
  const repEvents = session?.timeline_summary?.rep_events || [];
  const angleRows = toAngleRows(session);
  const phaseRows = toPhaseRows(session);
  const scoreBreakdown = Object.entries(session?.score_breakdown || {})
    .map(([name, value]) => ({ name, value: Number(value || 0) }))
    .filter((row) => Number.isFinite(row.value));

  async function handleExportPdf() {
    if (!exportRef.current || exporting) return;
    try {
      setExporting(true);
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(exportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const stamp = new Date().toISOString().slice(0, 10);
      const student = String(session?.student || 'session').replace(/\s+/g, '-');
      const sport = String(session?.sport || 'sport').replace(/\s+/g, '-');
      pdf.save(`${student}-${sport}-report-${stamp}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h3 className="panel-title">{title}</h3>
        <div className="panel-actions">
          {analyticsEnabled ? (
            <button type="button" className="primary-button" onClick={handleExportPdf} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export PDF'}
            </button>
          ) : (
            <Link className="primary-button" to="/pricing">Upgrade to Pro</Link>
          )}
        </div>
      </div>
      <div ref={exportRef}>
      <div className="stats-grid">
        <article className="stat-card">
          <div className="stat-head">
            <p>Session Score</p>
          </div>
          <h3>{session?.session_score ?? '--'}</h3>
          <small>Quality score across full session timeline</small>
        </article>
        <article className="stat-card">
          <div className="stat-head">
            <p>Rep Count</p>
          </div>
          <h3>{session?.rep_summary?.total_reps ?? 0}</h3>
          <small>Best rep score: {session?.rep_summary?.best_rep_score ?? '--'}</small>
        </article>
        <article className="stat-card">
          <div className="stat-head">
            <p>Tracking Quality</p>
          </div>
          <h3>{session?.camera_summary?.tracking_quality ?? '--'}</h3>
          <small>Occlusion: {session?.camera_summary?.occlusion ?? '--'}</small>
        </article>
      </div>

      {!analyticsEnabled ? (
        <section className="panel upgrade-panel">
          <h4 className="panel-title">AI Analytics is a Pro feature</h4>
          <p className="help-text">
            Upgrade to unlock advanced charts, best-rep insights, and timeline intelligence for every session.
          </p>
          <Link className="primary-button" to="/pricing">View Pro Plans</Link>
        </section>
      ) : (
        <>
          <div className="panel-grid">
            <section className="panel chart-panel">
              <h4 className="panel-title">Session Score Over Time</h4>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={scoreSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f587f" />
                    <XAxis dataKey="t" stroke="#9cb0cf" />
                    <YAxis stroke="#9cb0cf" domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#f5c518" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel chart-panel">
              <h4 className="panel-title">Angles Snapshot</h4>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={angleRows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f587f" />
                    <XAxis dataKey="name" stroke="#9cb0cf" angle={-18} textAnchor="end" height={80} />
                    <YAxis stroke="#9cb0cf" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f5c518" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel chart-panel">
              <h4 className="panel-title">Phase Distribution</h4>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={phaseRows} dataKey="value" nameKey="name" outerRadius={90}>
                      {phaseRows.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="panel chart-panel">
              <h4 className="panel-title">Score Breakdown</h4>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={scoreBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#3f587f" />
                    <XAxis dataKey="name" stroke="#9cb0cf" angle={-18} textAnchor="end" height={80} />
                    <YAxis stroke="#9cb0cf" domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#1b1b1b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          <div className="panel-grid">
            <section className="panel">
              <h4 className="panel-title">Best Rep</h4>
              <p className="help-text">Index: {session?.best_rep?.index ?? '--'}</p>
              <p className="help-text">Score: {session?.best_rep?.score ?? '--'}</p>
              <p className="help-text">
                Window: {session?.best_rep?.start_s ?? '--'}s - {session?.best_rep?.end_s ?? '--'}s
              </p>
            </section>
            <section className="panel">
              <h4 className="panel-title">Best Frame</h4>
              {session?.best_frame?.thumbnail ? (
                <img src={session.best_frame.thumbnail} alt="Best frame" className="best-frame-preview" />
              ) : (
                <p className="help-text">No frame captured.</p>
              )}
              <p className="help-text">Score: {session?.best_frame?.score ?? '--'}</p>
              <p className="help-text">Time: {session?.best_frame?.t ?? '--'}s</p>
            </section>
            <section className="panel">
              <h4 className="panel-title">Reaction Drill</h4>
              <p className="help-text">
                Hits / Attempts: {session?.rep_summary?.drill_hits ?? 0} / {session?.rep_summary?.drill_attempts ?? 0}
              </p>
              <p className="help-text">Average: {session?.rep_summary?.drill_avg_ms ?? '--'} ms</p>
              <p className="help-text">Best: {session?.rep_summary?.drill_best_ms ?? '--'} ms</p>
            </section>
          </div>

          <section className="panel">
            <h4 className="panel-title">Timeline Events</h4>
            {!repEvents.length ? (
              <p className="help-text">No rep events recorded.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Rep</th>
                      <th>Time (s)</th>
                      <th>Phase</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repEvents.map((event, idx) => (
                      <tr key={`${event.rep}-${idx}`}>
                        <td>{event.rep}</td>
                        <td>{event.t}</td>
                        <td>{event.phase}</td>
                        <td>{event.score}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      </div>
    </section>
  );
}
