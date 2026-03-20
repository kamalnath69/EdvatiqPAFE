import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Bell, CalendarDays, Clock3, FileText, Flag, Settings2, Sparkles } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts';
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
import {
  WorkspaceCalendarSection,
  WorkspaceFavoritesPanel,
  WorkspaceHelpSection,
  WorkspaceNotificationsSection,
  WorkspaceReportsSection,
  WorkspaceSettingsSection,
  WorkspaceTrainingPlansSection,
} from './WorkspaceModules';
import { SPORTS } from '../constants/sports';
import {
  ANGLE_METRICS,
  createAngleFormDefaults,
  extractRuleTargetsForForm,
  extractRuleToleranceForForm,
  formAnglesToLabeledMap,
} from '../constants/angles';
import { useToast } from '../hooks/useToast';
import { usePlanAccess } from '../hooks/usePlanAccess';
import { addFavorite } from '../services/workspaceApi';

function buildToleranceMap(raw) {
  const tolerance = {};
  Object.entries(raw || {}).forEach(([key, value]) => {
    if (value === '' || value === null || value === undefined) return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const metric = ANGLE_METRICS.find((item) => item.id === key);
    if (!metric) return;
    tolerance[metric.label] = n;
  });
  return tolerance;
}

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const scorePoint = payload.find((item) => item.dataKey === 'score');
  const repsPoint = payload.find((item) => item.dataKey === 'reps');
  return (
    <div className="chart-tooltip-card">
      <strong>{label}</strong>
      <span>Session score: {scorePoint?.value ?? '--'}</span>
      <span>Reps: {repsPoint?.value ?? '--'}</span>
    </div>
  );
}

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
  const rulesForm = useForm({
    defaultValues: {
      sport: '',
      targets: createAngleFormDefaults(),
      tolerances: createAngleFormDefaults(),
    },
  });

  const sections = [
    { key: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { key: 'live', label: 'Live Coach', icon: <Sparkles size={16} /> },
    { key: 'history', label: 'Session History', icon: <Clock3 size={16} /> },
    { key: 'rules', label: 'Rule Status', icon: <Sparkles size={16} /> },
    { key: 'plans', label: 'Training Plans', icon: <Flag size={16} /> },
    { key: 'reports', label: 'Reports', icon: <FileText size={16} /> },
    { key: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={16} />, sidebarHidden: true },
    { key: 'settings', label: 'Settings', icon: <Settings2 size={16} /> },
  ];

  const chartData = useMemo(() => {
    const bySport = sessions.data.reduce((acc, item) => {
      const key = item.sport || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(bySport).map(([sport, count]) => ({ sport, count }));
  }, [sessions.data]);
  const scoreTrend = useMemo(() => {
    const toMs = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return n > 1_000_000_000_000 ? n : n * 1000;
    };
    return [...sessions.data]
      .sort((a, b) => (toMs(a.started_at ?? a.timestamp) || 0) - (toMs(b.started_at ?? b.timestamp) || 0))
      .slice(-8)
      .map((item, index) => {
        const at = toMs(item.started_at ?? item.timestamp);
        return {
          index: index + 1,
          label: at ? new Date(at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : `S${index + 1}`,
          score: Number.isFinite(Number(item.session_score)) ? Number(item.session_score) : 0,
          reps: Number.isFinite(Number(item?.rep_summary?.total_reps)) ? Number(item.rep_summary.total_reps) : 0,
        };
      });
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
  const mixData = useMemo(() => {
    const feedbackMap = Object.fromEntries(feedbackBySport.map((item) => [item.sport, item.count]));
    const base = chartData.map((item) => ({
      sport: item.sport,
      sessions: item.count,
      feedback: feedbackMap[item.sport] || 0,
    }));
    const maxSessions = Math.max(...base.map((item) => item.sessions), 1);
    const maxFeedback = Math.max(...base.map((item) => item.feedback), 1);
    return base
      .map((item) => ({
        ...item,
        sessionPct: Math.round((item.sessions / maxSessions) * 100),
        feedbackPct: Math.round((item.feedback / maxFeedback) * 100),
      }))
      .sort((a, b) => b.sessions - a.sessions || b.feedback - a.feedback);
  }, [chartData, feedbackBySport]);
  const avgScore = useMemo(() => {
    const scores = sessions.data.map((item) => Number(item.session_score)).filter((item) => Number.isFinite(item));
    if (!scores.length) return '--';
    return (scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1);
  }, [sessions.data]);
  const bestScore = useMemo(() => {
    const scores = sessions.data.map((item) => Number(item.session_score)).filter((item) => Number.isFinite(item));
    if (!scores.length) return '--';
    return Math.max(...scores).toFixed(0);
  }, [sessions.data]);
  const avgReps = useMemo(() => {
    const reps = sessions.data
      .map((item) => Number(item?.rep_summary?.total_reps))
      .filter((item) => Number.isFinite(item));
    if (!reps.length) return '--';
    return (reps.reduce((sum, value) => sum + value, 0) / reps.length).toFixed(1);
  }, [sessions.data]);
  const latestSession = useMemo(() => {
    const toMs = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      return n > 1_000_000_000_000 ? n : n * 1000;
    };
    return [...sessions.data]
      .sort((a, b) => (toMs(b.started_at ?? b.timestamp) || 0) - (toMs(a.started_at ?? a.timestamp) || 0))[0] || null;
  }, [sessions.data]);
  const primarySport = useMemo(() => {
    if (!chartData.length) return user?.assigned_sport || '--';
    return [...chartData].sort((a, b) => b.count - a.count)[0]?.sport || '--';
  }, [chartData, user]);
  const scoreMomentum = useMemo(() => {
    if (scoreTrend.length < 2) return null;
    const last = Number(scoreTrend.at(-1)?.score);
    const prev = Number(scoreTrend.at(-2)?.score);
    if (!Number.isFinite(last) || !Number.isFinite(prev)) return null;
    const diff = last - prev;
    return `${diff > 0 ? '+' : ''}${diff.toFixed(0)}`;
  }, [scoreTrend]);
  const recentSessionRows = useMemo(
    () =>
      [...sessions.data]
        .slice()
        .sort((a, b) => Number(b.started_at ?? b.timestamp ?? 0) - Number(a.started_at ?? a.timestamp ?? 0))
        .slice(0, 5)
        .map((item, idx) => ({ ...item, id: `${item.sport || 'session'}-${idx}` })),
    [sessions.data]
  );
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

  useEffect(() => {
    rulesForm.setValue('sport', selectedSport || '');
  }, [selectedSport, rulesForm]);

  async function handleLoadRules() {
    if (!selectedSport || !user?.username) return;
    try {
      const data = await rules.fetchRules(user.username, selectedSport);
      const targets = extractRuleTargetsForForm(data);
      const tolerances = extractRuleToleranceForForm(data);
      ANGLE_METRICS.forEach((metric) => {
        rulesForm.setValue(`targets.${metric.id}`, targets[metric.id]);
        rulesForm.setValue(`tolerances.${metric.id}`, tolerances[metric.id]);
      });
      pushToast({ type: 'success', message: 'Rules loaded.' });
    } catch {
      // hook handles error state
    }
  }

  async function handleSaveRules(values) {
    if (!user?.username || !values.sport) return;
    try {
      const payload = {
        targets: formAnglesToLabeledMap(values.targets),
        tolerances: buildToleranceMap(values.tolerances),
      };
      await rules.saveOverride(user.username, values.sport, payload);
      pushToast({ type: 'success', message: 'Rules updated successfully.' });
    } catch {
      // hook handles error state
    }
  }

  async function handleFavoriteSession(row) {
    try {
      await addFavorite({
        entity_type: 'session',
        entity_id: row.id,
        title: `${row.sport} session`,
        subtitle: row.drill_focus || row.custom_note || 'Saved session',
        href: '/dashboard',
        icon: 'session',
      });
      pushToast({ type: 'success', message: 'Session added to favorites.' });
    } catch {
      pushToast({ type: 'error', message: 'Unable to favorite this session.' });
    }
  }

  return (
    <PageShell
      title="Athlete Dashboard"
      subtitle="Review your posture sessions, trends and active rule profile."
      sections={sections}
      heroStats={[
        { label: 'Sessions Logged', value: sessions.data.length },
        { label: 'Sports Practiced', value: new Set(sessions.data.map((s) => s.sport)).size },
        { label: 'Feedback Points', value: feedbackCount },
      ]}
      heroNote="Athlete progress view"
    >
      {(section) => (
        <>
          {section === 'overview' ? (
            <div className="athlete-overview">
              <section className="panel athlete-overview-hero">
                <div className="athlete-overview-copy">
                  <span className="section-kicker">Athlete Performance Overview</span>
                  <h2 className="panel-title">A cleaner read on your posture progress</h2>
                  <p className="panel-subtitle">
                    Track quality over time, spot your primary training focus, and jump into the sessions that matter most.
                  </p>
                  <div className="athlete-overview-tags">
                    <span className="workspace-hero-tag">Primary Sport: {primarySport}</span>
                    <span className="workspace-hero-tag">Assigned Sport: {user?.assigned_sport || '--'}</span>
                    <span className="workspace-hero-tag">Latest Score: {latestSession?.session_score ?? '--'}</span>
                  </div>
                </div>
                <div className="athlete-overview-aside">
                  <div className="athlete-overview-focus">
                    <span>Next coaching focus</span>
                    <strong>{latestSession?.drill_focus || latestSession?.feedback?.[0] || 'Start a live coaching session to generate your next priority cue.'}</strong>
                    <p>{latestSession?.custom_note || 'Recent coach notes and AI guidance will surface here when sessions are recorded.'}</p>
                  </div>
                </div>
              </section>

              <div className="stats-grid athlete-kpi-grid">
                <StatCard label="Average Score" value={avgScore} hint="Across logged sessions" />
                <StatCard label="Best Session" value={bestScore} hint="Highest recorded quality score" />
                <StatCard label="Average Reps" value={avgReps} hint="Per recorded session" />
                <StatCard
                  label="Latest Session"
                  value={
                    latestSession
                      ? new Date(Number(latestSession.started_at ?? latestSession.timestamp) * 1000).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })
                      : '--'
                  }
                  hint="Most recent recorded workout"
                />
              </div>

              <div className="panel-grid athlete-overview-grid">
                <section className="panel chart-panel athlete-main-chart">
                  <div className="panel-header">
                    <div>
                      <h2 className="panel-title">Session Score Trend</h2>
                      <p className="panel-subtitle">How your session quality is moving across the most recent training blocks.</p>
                    </div>
                    <div className="chart-inline-stats">
                      <span className="chart-stat-pill">Avg {avgScore}</span>
                      <span className={`chart-stat-pill ${scoreMomentum && scoreMomentum.startsWith('+') ? 'positive' : ''}`}>
                        Momentum {scoreMomentum || '--'}
                      </span>
                    </div>
                  </div>
                  <div className="chart-wrap modern-chart-wrap">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={scoreTrend} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id="scoreTrendFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#4c9aff" stopOpacity="0.34" />
                            <stop offset="100%" stopColor="#4c9aff" stopOpacity="0.02" />
                          </linearGradient>
                          <linearGradient id="scoreTrendStroke" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#0052cc" />
                            <stop offset="100%" stopColor="#2684ff" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#ebecf0" />
                        <XAxis dataKey="label" stroke="#7a869a" tickLine={false} axisLine={false} />
                        <YAxis stroke="#7a869a" tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#4c9aff', strokeOpacity: 0.28 }} />
                        {avgScore !== '--' ? (
                          <ReferenceLine
                            y={Number(avgScore)}
                            stroke="#97a0af"
                            strokeDasharray="4 4"
                            ifOverflow="extendDomain"
                          />
                        ) : null}
                        <Area
                          type="monotone"
                          dataKey="score"
                          stroke="url(#scoreTrendStroke)"
                          strokeWidth={3}
                          fill="url(#scoreTrendFill)"
                          activeDot={{ r: 5, fill: '#ffffff', stroke: '#0052cc', strokeWidth: 3 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="panel athlete-overview-sidecard">
                  <div className="panel-header">
                    <div>
                      <h2 className="panel-title">Training Mix</h2>
                      <p className="panel-subtitle">Which sports and feedback categories are getting the most attention.</p>
                    </div>
                  </div>
                  <div className="metrics-grid compact">
                    <article className="metric-tile">
                      <p>Sports Practiced</p>
                      <strong>{new Set(sessions.data.map((s) => s.sport)).size}</strong>
                    </article>
                    <article className="metric-tile">
                      <p>Feedback Points</p>
                      <strong>{feedbackCount}</strong>
                    </article>
                  </div>
                  <div className="mix-graph">
                    {mixData.length ? (
                      mixData.map((item) => (
                        <article key={item.sport} className="mix-row">
                          <div className="mix-row-head">
                            <strong>{item.sport}</strong>
                            <span>{item.sessions} sessions</span>
                          </div>
                          <div className="mix-bar-stack">
                            <div className="mix-bar-track">
                              <span className="mix-bar-fill sessions" style={{ width: `${item.sessionPct}%` }} />
                            </div>
                            <div className="mix-bar-track secondary">
                              <span className="mix-bar-fill feedback" style={{ width: `${item.feedbackPct}%` }} />
                            </div>
                          </div>
                          <div className="mix-row-meta">
                            <span>Session share</span>
                            <span>{item.feedback} feedback cues</span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="help-text">Training mix appears after you log a few sessions.</p>
                    )}
                  </div>
                </section>
              </div>

              <DataTable
                title="Recent Sessions"
                rows={recentSessionRows}
                emptyText="You do not have sessions yet."
                emptyActionLabel="Go To Support"
                emptyActionHref="/support"
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
                    key: 'drill_focus',
                    label: 'Drill Focus',
                    render: (row) => row.drill_focus || '--',
                  },
                  {
                    key: 'feedback',
                    label: 'Top Feedback',
                    render: (row) => row.feedback?.[0] || 'No notes',
                  },
                  {
                    key: 'actions',
                    label: 'Pin',
                    render: (row) => (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleFavoriteSession(row);
                        }}
                      >
                        Save
                      </button>
                    ),
                  },
                ]}
              />

              <div className="panel-grid" style={{ marginTop: '1rem' }}>
                <WorkspaceTrainingPlansSection role="student" />
                <WorkspaceFavoritesPanel />
              </div>
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
                    emptyActionLabel="Go To Support"
                    emptyActionHref="/support"
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
                      {
                        key: 'actions',
                        label: 'Pin',
                        render: (row) => (
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleFavoriteSession(row);
                            }}
                          >
                            Save
                          </button>
                        ),
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
              canSaveSession
              enforceAssignedSport
            />
          ) : null}

          {section === 'rules' ? (
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Rule Profile</h2>
                  <p className="panel-subtitle">Load your sport profile, adjust targets and tolerances, and save your own override.</p>
                </div>
              </div>
              <form className="form-grid form-grid-xl" onSubmit={rulesForm.handleSubmit(handleSaveRules)}>
                <div className="form-inline">
                  <FormField label="Sport">
                    <select
                      value={selectedSport}
                      onChange={(e) => {
                        setSelectedSport(e.target.value);
                        rulesForm.setValue('sport', e.target.value);
                      }}
                    >
                      <option value="">Select sport</option>
                      {availableSports.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <div className="button-row" style={{ alignItems: 'end' }}>
                    <button type="button" className="ghost-button" onClick={handleLoadRules} disabled={rules.loading || !selectedSport}>
                      {rules.loading ? 'Loading...' : 'Load Rules'}
                    </button>
                    <button type="submit" className="primary-button" disabled={rules.loading || !selectedSport}>
                      Save Rules
                    </button>
                  </div>
                </div>
                <div className="metrics-grid">
                  {ANGLE_METRICS.map((metric) => (
                    <div key={metric.id} className="metric-pair">
                      <FormField label={`${metric.label} Target`}>
                        <input type="number" step={metric.step} {...rulesForm.register(`targets.${metric.id}`)} />
                      </FormField>
                      <FormField label={`${metric.label} +/- Tolerance`}>
                        <input type="number" step={metric.step} {...rulesForm.register(`tolerances.${metric.id}`)} />
                      </FormField>
                    </div>
                  ))}
                </div>
              </form>
            </section>
          ) : null}

          {section === 'plans' ? <WorkspaceTrainingPlansSection role="student" /> : null}

          {section === 'reports' ? <WorkspaceReportsSection role="student" /> : null}

          {section === 'calendar' ? <WorkspaceCalendarSection role="student" /> : null}

          {section === 'notifications' ? <WorkspaceNotificationsSection /> : null}

          {section === 'settings' ? (
            <div className="panel-grid">
              <WorkspaceSettingsSection />
              <WorkspaceHelpSection />
              <ProfileSection />
            </div>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
