import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Clock3, Sparkles } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import PageShell from './ui/PageShell';
import DataTable from './ui/DataTable';
import StatCard from './ui/StatCard';
import FormField from './ui/FormField';
import { useAuthUser } from '../hooks/useAuthUser';
import { useSessions } from '../hooks/useSessions';
import { useRules } from '../hooks/useRules';
import LiveTrainer from './LiveTrainer';
import SessionDetailPanel from './SessionDetailPanel';
import ProfileSection from './ProfileSection';
import { SPORTS } from '../constants/sports';
import { ANGLE_METRICS } from '../constants/angles';
import { useToast } from '../hooks/useToast';
import { usePlanAccess } from '../hooks/usePlanAccess';

export default function StudentDashboard() {
  const { user, token } = useAuthUser();
  const sessions = useSessions({ mode: 'student', username: user?.username });
  const rules = useRules();
  const planAccess = usePlanAccess();
  const { pushToast } = useToast();
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [historyFilters, setHistoryFilters] = useState({
    sport: '',
    dateFrom: '',
    dateTo: '',
    minScore: '',
    maxScore: '',
    minReps: '',
    query: '',
  });

  const sections = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { key: 'live', label: 'Live Coach', icon: <Sparkles size={16} /> },
    { key: 'history', label: 'Session History', icon: <Clock3 size={16} /> },
    { key: 'rules', label: 'Rule Status', icon: <Sparkles size={16} /> },
    { key: 'profile', label: 'Profile', icon: <Sparkles size={16} /> },
  ];

  const chartData = useMemo(() => {
    const bySport = sessions.data.reduce((acc, item) => {
      const key = item.sport || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(bySport).map(([sport, count]) => ({ sport, count }));
  }, [sessions.data]);

  const feedbackCount = useMemo(
    () => sessions.data.reduce((acc, item) => acc + (item.feedback?.length || 0), 0),
    [sessions.data]
  );
  const feedbackBySport = useMemo(() => {
    const grouped = sessions.data.reduce((acc, item) => {
      const key = item.sport || 'unknown';
      acc[key] = (acc[key] || 0) + (item.feedback?.length || 0);
      return acc;
    }, {});
    return Object.entries(grouped).map(([sport, count]) => ({ sport, count }));
  }, [sessions.data]);
  const availableSports = useMemo(() => {
    const values = new Set(sessions.data.map((item) => item.sport).filter(Boolean));
    if (user?.assigned_sport) values.add(user.assigned_sport);
    return values.size ? [...values] : SPORTS;
  }, [sessions.data, user]);
  const filteredSessions = useMemo(() => {
    const toMs = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return n > 1_000_000_000_000 ? n : n * 1000;
    };
    const fromMs = historyFilters.dateFrom ? new Date(`${historyFilters.dateFrom}T00:00:00`).getTime() : null;
    const toMsBound = historyFilters.dateTo ? new Date(`${historyFilters.dateTo}T23:59:59`).getTime() : null;
    const minScore = historyFilters.minScore === '' ? null : Number(historyFilters.minScore);
    const maxScore = historyFilters.maxScore === '' ? null : Number(historyFilters.maxScore);
    const minReps = historyFilters.minReps === '' ? null : Number(historyFilters.minReps);
    const q = historyFilters.query.trim().toLowerCase();
    return sessions.data.filter((item) => {
      const sportOk = !historyFilters.sport || item.sport === historyFilters.sport;
      const at = toMs(item.started_at ?? item.timestamp);
      const fromOk = fromMs === null || (at !== null && at >= fromMs);
      const toOk = toMsBound === null || (at !== null && at <= toMsBound);
      const score = Number(item.session_score);
      const scoreMinOk = minScore === null || (Number.isFinite(score) && score >= minScore);
      const scoreMaxOk = maxScore === null || (Number.isFinite(score) && score <= maxScore);
      const reps = Number(item?.rep_summary?.total_reps);
      const repsOk = minReps === null || (Number.isFinite(reps) && reps >= minReps);
      const blob = [
        item.sport,
        item.custom_note,
        item.drill_focus,
        Array.isArray(item.feedback) ? item.feedback.join(' ') : '',
        Array.isArray(item.tags) ? item.tags.join(' ') : '',
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const queryOk = !q || blob.includes(q);
      return sportOk && fromOk && toOk && scoreMinOk && scoreMaxOk && repsOk && queryOk;
    });
  }, [sessions.data, historyFilters]);
  const filteredSessionRows = useMemo(
    () => filteredSessions.map((item, idx) => ({ ...item, id: `${item.sport}-${item.timestamp || 'na'}-${idx}` })),
    [filteredSessions]
  );
  const selectedSession = useMemo(
    () => filteredSessionRows.find((item) => item.id === selectedSessionId) || null,
    [filteredSessionRows, selectedSessionId]
  );

  useEffect(() => {
    if (!rules.error) return;
    pushToast({ type: 'error', message: rules.error });
  }, [rules.error, pushToast]);

  async function handleLoadRules() {
    if (!selectedSport || !user?.username) return;
    try {
      const data = await rules.fetchRules(user.username, selectedSport);
      if (data && typeof data === 'object' && 'default' in data) {
        pushToast({ type: 'info', message: 'Using default rules for this sport.' });
      } else {
        pushToast({ type: 'success', message: 'Custom override active for this sport.' });
      }
    } catch {
      // hook handles error state
    }
  }

  return (
    <PageShell
      title="Athlete Dashboard"
      subtitle="Review your posture sessions, trends and active rule profile."
      sections={sections}
    >
      {(section) => (
        <>
          {section === 'overview' ? (
            <div className="panel-grid">
              <div className="stats-grid">
                <StatCard label="Sessions Logged" value={sessions.data.length} />
                <StatCard label="Sports Practiced" value={new Set(sessions.data.map((s) => s.sport)).size} />
                <StatCard label="Feedback Points" value={feedbackCount} />
              </div>
              <section className="panel chart-panel">
                <h2 className="panel-title">Training Volume by Sport</h2>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#28334a" />
                      <XAxis dataKey="sport" stroke="#9cb0cf" />
                      <YAxis stroke="#9cb0cf" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="panel chart-panel">
                <h2 className="panel-title">Feedback Intensity by Sport</h2>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={feedbackBySport}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#28334a" />
                      <XAxis dataKey="sport" stroke="#9cb0cf" />
                      <YAxis stroke="#9cb0cf" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#f5b331" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          ) : null}

          {section === 'history' ? (
            <>
              {!selectedSession ? (
                <>
                  <section className="panel">
                    <h2 className="panel-title">Filters</h2>
                    <div className="form-inline">
                      <FormField label="Sport">
                        <select
                          value={historyFilters.sport}
                          onChange={(e) => setHistoryFilters((prev) => ({ ...prev, sport: e.target.value }))}
                        >
                          <option value="">All sports</option>
                          {availableSports.map((item) => (
                            <option key={item} value={item}>
                              {item}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Date From">
                        <input
                          type="date"
                          value={historyFilters.dateFrom}
                          onChange={(e) => setHistoryFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Date To">
                        <input
                          type="date"
                          value={historyFilters.dateTo}
                          onChange={(e) => setHistoryFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Min Score">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={historyFilters.minScore}
                          onChange={(e) => setHistoryFilters((prev) => ({ ...prev, minScore: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Max Score">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={historyFilters.maxScore}
                          onChange={(e) => setHistoryFilters((prev) => ({ ...prev, maxScore: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Min Reps">
                        <input
                          type="number"
                          min="0"
                          value={historyFilters.minReps}
                          onChange={(e) => setHistoryFilters((prev) => ({ ...prev, minReps: e.target.value }))}
                        />
                      </FormField>
                      <FormField label="Search Text">
                        <input
                          value={historyFilters.query}
                          onChange={(e) => setHistoryFilters((prev) => ({ ...prev, query: e.target.value }))}
                          placeholder="notes, tags, feedback..."
                        />
                      </FormField>
                    </div>
                  </section>
                  <DataTable
                    title="Your Sessions"
                    rows={filteredSessionRows}
                    emptyText="You do not have sessions yet."
                    onRowClick={(row) => setSelectedSessionId(row.id)}
                    selectedRowId={selectedSessionId}
                    columns={[
                      { key: 'sport', label: 'Sport' },
                      {
                        key: 'session_score',
                        label: 'Score',
                        render: (row) => row.session_score ?? '--',
                      },
                      {
                        key: 'rep_summary',
                        label: 'Reps',
                        render: (row) => row.rep_summary?.total_reps ?? '--',
                      },
                      {
                        key: 'feedback',
                        label: 'Feedback',
                        render: (row) => row.feedback?.join(', ') || 'No notes',
                      },
                      {
                        key: 'angles',
                        label: 'Angles',
                        render: (row) => `${Object.keys(row.angles || {}).length} metrics`,
                      },
                      {
                        key: 'drill_focus',
                        label: 'Drill Focus',
                        render: (row) => row.drill_focus || '--',
                      },
                      {
                        key: 'custom_note',
                        label: 'Coach Note',
                        render: (row) => row.custom_note || '--',
                      },
                    ]}
                  />
                </>
              ) : null}
              {selectedSession ? (
                <section className="panel">
                  <div className="button-row" style={{ marginBottom: '0.8rem' }}>
                    <button type="button" className="ghost-button" onClick={() => setSelectedSessionId('')}>
                      Back To Session List
                    </button>
                  </div>
                  <SessionDetailPanel
                    session={selectedSession}
                    title="Selected Session Intelligence"
                    analyticsEnabled={planAccess.ai_analytics}
                  />
                </section>
              ) : null}
            </>
          ) : null}

          {section === 'live' ? (
            <LiveTrainer
              token={token}
              defaultSport={user?.assigned_sport || 'Archery'}
              defaultStudent={user?.username || ''}
              enforceAssignedSport
            />
          ) : null}

          {section === 'rules' ? (
            <section className="panel">
              <h2 className="panel-title">Rule Visibility</h2>
              <div className="form-inline">
                <FormField label="Sport">
                  <select value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)}>
                    <option value="">Select sport</option>
                    {availableSports.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </FormField>
                <button type="button" className="primary-button" onClick={handleLoadRules} disabled={rules.loading}>
                  {rules.loading ? 'Loading...' : 'Load Rules'}
                </button>
              </div>
              {rules.rules ? (
                <>
                  <div className="metrics-grid compact">
                    {ANGLE_METRICS.map((metric) => {
                      const target = rules.rules?.targets?.[metric.label] ?? rules.rules?.[metric.label];
                      const tolerance = rules.rules?.tolerances?.[metric.label];
                      return (
                        <article key={metric.id} className="metric-tile">
                          <p>{metric.label}</p>
                          <strong>{target !== undefined ? target : '--'}</strong>
                          <small className="help-text">Tolerance: {tolerance !== undefined ? tolerance : '--'}</small>
                        </article>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </section>
          ) : null}

          {section === 'profile' ? <ProfileSection /> : null}
        </>
      )}
    </PageShell>
  );
}
