import { useEffect, useMemo, useRef, useState } from 'react';
import { ClipboardList, Edit3, LineChart, Settings2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import PageShell from './ui/PageShell';
import DataTable from './ui/DataTable';
import FormField from './ui/FormField';
import StatCard from './ui/StatCard';
import { useSessions } from '../hooks/useSessions';
import { useRules } from '../hooks/useRules';
import { useAuthUser } from '../hooks/useAuthUser';
import LiveTrainer from './LiveTrainer';
import SessionDetailPanel from './SessionDetailPanel';
import { addStaff, addStudent } from '../services/academiesApi';
import { assignSport, listStudents, updateStudentAngleMeasurements } from '../services/usersApi';
import ProfileSection from './ProfileSection';
import { getErrorMessage } from '../services/httpError';
import { SPORTS } from '../constants/sports';
import { useToast } from '../hooks/useToast';
import { usePlanAccess } from '../hooks/usePlanAccess';
import {
  ANGLE_METRICS,
  createAngleFormDefaults,
  extractRuleTargetsForForm,
  extractRuleToleranceForForm,
  formAnglesToLabeledMap,
} from '../constants/angles';

const PIE_COLORS = ['#f5c518', '#111111', '#ffe08a', '#f97316'];
const DEFAULT_HISTORY_FILTERS = {
  student: '',
  sport: '',
  dateFrom: '',
  dateTo: '',
  minScore: '',
  maxScore: '',
  minReps: '',
  query: '',
};

function nowMs() {
  return new Date().valueOf();
}

function toEpochMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n > 1_000_000_000_000 ? n : n * 1000;
}

function formatSessionDate(row) {
  const at = toEpochMs(row?.started_at ?? row?.timestamp);
  if (!at) return '--';
  return new Date(at).toLocaleString();
}

function shorten(text, max = 72) {
  const raw = String(text || '').trim();
  if (!raw) return '--';
  return raw.length > max ? `${raw.slice(0, max - 1)}...` : raw;
}

function toFeedbackArray(raw) {
  return String(raw || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

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

export default function StaffDashboard() {
  const { token, user } = useAuthUser();
  const isAcademyAdmin = user?.role === 'academy_admin' || user?.role === 'academyAdmin';
  const sessions = useSessions({ mode: 'all' });
  const rules = useRules();
  const planAccess = usePlanAccess();
  const [historyFilters, setHistoryFilters] = useState(DEFAULT_HISTORY_FILTERS);
  const [notice, setNotice] = useState({ type: '', message: '' });
  const { pushToast } = useToast();
  const [students, setStudents] = useState([]);
  const sessionStartedAtRef = useRef(nowMs());
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const sessionForm = useForm({
    defaultValues: {
      student: '',
      sport: SPORTS[0],
      angles: createAngleFormDefaults(),
      feedback: '',
      custom_note: '',
      drill_focus: '',
      intensity_rpe: '',
      tags: '',
    },
  });
  const rulesForm = useForm({
    defaultValues: {
      student: '',
      sport: SPORTS[0],
      targets: createAngleFormDefaults(),
      tolerances: createAngleFormDefaults(),
    },
  });
  const memberForm = useForm({
    defaultValues: { mode: 'student', username: '', password: '', can_add_students: false },
  });
  const angleForm = useForm({ defaultValues: { student: '', measurements: createAngleFormDefaults() } });
  const assignSportForm = useForm({ defaultValues: { student: '', sport: SPORTS[0] } });

  const sections = [
    { key: 'overview', label: 'Overview', icon: <LineChart size={16} /> },
    { key: 'live', label: 'Live Coach', icon: <Settings2 size={16} /> },
    { key: 'members', label: 'Members', icon: <Users size={16} /> },
    { key: 'angles', label: 'Student Targets', icon: <Settings2 size={16} /> },
    { key: 'assign', label: 'Assign Sport', icon: <Settings2 size={16} /> },
    { key: 'sessions', label: 'Create Session', icon: <Edit3 size={16} /> },
    { key: 'history', label: 'Session History', icon: <ClipboardList size={16} /> },
    { key: 'rules', label: 'Rule Profiles', icon: <Settings2 size={16} /> },
    { key: 'profile', label: 'Profile', icon: <Users size={16} /> },
  ];

  const filteredSessions = useMemo(() => {
    const fromMs = historyFilters.dateFrom ? new Date(`${historyFilters.dateFrom}T00:00:00`).getTime() : null;
    const toMsBound = historyFilters.dateTo ? new Date(`${historyFilters.dateTo}T23:59:59`).getTime() : null;
    const minScore = historyFilters.minScore === '' ? null : Number(historyFilters.minScore);
    const maxScore = historyFilters.maxScore === '' ? null : Number(historyFilters.maxScore);
    const minReps = historyFilters.minReps === '' ? null : Number(historyFilters.minReps);
    const q = historyFilters.query.trim().toLowerCase();

    return sessions.data.filter((item) => {
      const studentOk = !historyFilters.student || item.student === historyFilters.student;
      const sportOk = !historyFilters.sport || item.sport === historyFilters.sport;
      const at = toEpochMs(item.started_at ?? item.timestamp);
      const fromOk = fromMs === null || (at !== null && at >= fromMs);
      const toOk = toMsBound === null || (at !== null && at <= toMsBound);
      const score = Number(item.session_score);
      const scoreMinOk = minScore === null || (Number.isFinite(score) && score >= minScore);
      const scoreMaxOk = maxScore === null || (Number.isFinite(score) && score <= maxScore);
      const reps = Number(item?.rep_summary?.total_reps);
      const repsOk = minReps === null || (Number.isFinite(reps) && reps >= minReps);
      const blob = [
        item.student,
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
      return studentOk && sportOk && fromOk && toOk && scoreMinOk && scoreMaxOk && repsOk && queryOk;
    });
  }, [sessions.data, historyFilters]);
  const filteredSessionRows = useMemo(
    () => filteredSessions.map((s, idx) => ({ ...s, id: `${s.student}-${s.sport}-${s.timestamp || 'na'}-${idx}` })),
    [filteredSessions]
  );
  const studentOptions = useMemo(
    () => students.map((item) => ({ value: item.username, label: item.username })),
    [students]
  );
  const sportDistribution = useMemo(() => {
    const countBySport = filteredSessions.reduce((acc, item) => {
      const key = item.sport || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(countBySport).map(([name, value]) => ({ name, value }));
  }, [filteredSessions]);
  const studentSessionCounts = useMemo(() => {
    const countByStudent = filteredSessions.reduce((acc, item) => {
      const key = item.student || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(countByStudent)
      .map(([name, sessionsCount]) => ({ name, sessionsCount }))
      .sort((a, b) => b.sessionsCount - a.sessionsCount)
      .slice(0, 8);
  }, [filteredSessions]);
  const totalFeedback = useMemo(
    () => filteredSessions.reduce((acc, item) => acc + (item.feedback?.length || 0), 0),
    [filteredSessions]
  );
  const avgFeedbackPerSession = filteredSessions.length
    ? (totalFeedback / filteredSessions.length).toFixed(2)
    : '0.00';
  const activeFilterCount = useMemo(
    () => Object.values(historyFilters).filter((value) => String(value || '').trim() !== '').length,
    [historyFilters]
  );
  const avgSessionScore = useMemo(() => {
    const scores = filteredSessions
      .map((row) => Number(row.session_score))
      .filter((value) => Number.isFinite(value));
    if (!scores.length) return '--';
    return (scores.reduce((acc, value) => acc + value, 0) / scores.length).toFixed(1);
  }, [filteredSessions]);
  const avgRepCount = useMemo(() => {
    const reps = filteredSessions
      .map((row) => Number(row?.rep_summary?.total_reps))
      .filter((value) => Number.isFinite(value));
    if (!reps.length) return '--';
    return (reps.reduce((acc, value) => acc + value, 0) / reps.length).toFixed(1);
  }, [filteredSessions]);
  const selectedSession = useMemo(
    () => filteredSessionRows.find((item) => item.id === selectedSessionId) || null,
    [filteredSessionRows, selectedSessionId]
  );

  useEffect(() => {
    if (!notice.message) return;
    pushToast({ type: notice.type || 'info', message: notice.message });
  }, [notice, pushToast]);

  useEffect(() => {
    if (!sessions.error) return;
    pushToast({ type: 'error', message: sessions.error });
  }, [sessions.error, pushToast]);

  useEffect(() => {
    if (!rules.error) return;
    pushToast({ type: 'error', message: rules.error });
  }, [rules.error, pushToast]);

  useEffect(() => {
    async function loadStudents() {
      try {
        const data = await listStudents();
        setStudents(data);
      } catch (err) {
        setStudents([]);
        setNotice({ type: 'error', message: getErrorMessage(err, 'Failed to load academy students.') });
      }
    }
    loadStudents();
  }, []);

  async function handleCreateSession(values) {
    try {
      await sessions.create({
        student: values.student,
        sport: values.sport,
        angles: formAnglesToLabeledMap(values.angles),
        feedback: toFeedbackArray(values.feedback),
        custom_note: values.custom_note?.trim() || null,
        drill_focus: values.drill_focus?.trim() || null,
        started_at: sessionStartedAtRef.current / 1000,
        ended_at: nowMs() / 1000,
        intensity_rpe: values.intensity_rpe ? Number(values.intensity_rpe) : null,
        tags: toFeedbackArray(values.tags),
      });
      sessionForm.reset({
        student: '',
        sport: SPORTS[0],
        angles: createAngleFormDefaults(),
        feedback: '',
        custom_note: '',
        drill_focus: '',
        intensity_rpe: '',
        tags: '',
      });
      sessionStartedAtRef.current = nowMs();
      setNotice({ type: 'success', message: 'Session created successfully.' });
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err, 'Failed to create session.') });
    }
  }

  async function handleSaveRules(values) {
    try {
      const payload = {
        targets: formAnglesToLabeledMap(values.targets),
        tolerances: buildToleranceMap(values.tolerances),
      };
      await rules.saveOverride(values.student, values.sport, payload);
      setNotice({ type: 'success', message: 'Rule profile saved.' });
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err, 'Failed to save rule profile.') });
    }
  }

  async function handleLoadRules(values) {
    try {
      const data = await rules.fetchRules(values.student, values.sport);
      const targets = extractRuleTargetsForForm(data);
      const tolerances = extractRuleToleranceForForm(data);
      ANGLE_METRICS.forEach((item) => {
        rulesForm.setValue(`targets.${item.id}`, targets[item.id]);
        rulesForm.setValue(`tolerances.${item.id}`, tolerances[item.id]);
      });
      setNotice({ type: 'success', message: 'Rule profile loaded.' });
    } catch {
      // hook already sets error
    }
  }

  async function handleCreateMember(values) {
    const academyId = user?.academy_id;
    if (!academyId) {
      setNotice({ type: 'error', message: 'Academy ID missing on your account.' });
      return;
    }
    try {
      const payload = { username: values.username, password: values.password, role: values.mode };
      if (values.mode === 'staff') {
        await addStaff(academyId, payload, values.can_add_students);
        setNotice({ type: 'success', message: 'Staff created.' });
      } else {
        await addStudent(academyId, payload);
        setNotice({ type: 'success', message: 'Student created.' });
      }
      memberForm.reset({ mode: 'student', username: '', password: '', can_add_students: false });
      const data = await listStudents();
      setStudents(data);
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err, 'Failed to create member.') });
    }
  }

  async function handleUpdateAngles(values) {
    try {
      await updateStudentAngleMeasurements(values.student, formAnglesToLabeledMap(values.measurements));
      setNotice({ type: 'success', message: 'Student angle targets updated.' });
      angleForm.reset({ student: '', measurements: createAngleFormDefaults() });
    } catch (err) {
      setNotice({
        type: 'error',
        message: getErrorMessage(err, 'Failed to update student angle targets.'),
      });
    }
  }

  async function handleAssignSport(values) {
    try {
      await assignSport(values.student, values.sport);
      setNotice({ type: 'success', message: 'Assigned sport updated for student.' });
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err, 'Failed to assign sport.') });
    }
  }

  return (
    <PageShell
      title="Staff Performance Desk"
      subtitle="Create sessions, coach live posture, and manage student-specific sport rules."
      sections={sections}
    >
      {(section) => (
        <>
          {section === 'overview' ? (
            <div className="panel-grid">
              <div className="stats-grid">
                <StatCard label="Total Sessions" value={filteredSessions.length} />
                <StatCard label="Unique Students" value={new Set(filteredSessions.map((s) => s.student)).size} />
                <StatCard label="Sports Tracked" value={new Set(filteredSessions.map((s) => s.sport)).size} />
                <StatCard label="Avg Feedback / Session" value={avgFeedbackPerSession} />
              </div>
              <section className="panel chart-panel">
                <h2 className="panel-title">Sessions by Sport</h2>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={sportDistribution} dataKey="value" nameKey="name" outerRadius={95}>
                        {sportDistribution.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </section>
              <section className="panel chart-panel">
                <h2 className="panel-title">Most Active Students</h2>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={studentSessionCounts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#3e4d67" />
                      <XAxis dataKey="name" stroke="#a9b4c9" />
                      <YAxis stroke="#a9b4c9" allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="sessionsCount" fill="#f5c518" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </section>
            </div>
          ) : null}

          {section === 'sessions' ? (
            <section className="panel enterprise-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Create Session</h2>
                  <p className="panel-subtitle">
                    Capture quantitative metrics and coaching notes in one structured session record.
                  </p>
                </div>
                <div className="panel-actions">
                  <span className="status-badge primary">Duration auto-calculated</span>
                </div>
              </div>
              <form className="form-grid form-grid-xl" onSubmit={sessionForm.handleSubmit(handleCreateSession)}>
                <FormField label="Student">
                  <select {...sessionForm.register('student', { required: true })}>
                    <option value="">Select student</option>
                    {studentOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Sport">
                  <select {...sessionForm.register('sport', { required: true })}>
                    {SPORTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="metrics-grid">
                  {ANGLE_METRICS.map((metric) => (
                    <FormField key={metric.id} label={metric.label}>
                      <input
                        type="number"
                        step={metric.step}
                        {...sessionForm.register(`angles.${metric.id}`)}
                        placeholder="0"
                      />
                    </FormField>
                  ))}
                </div>
                <FormField label="Feedback Notes (comma separated)">
                  <textarea rows={3} {...sessionForm.register('feedback')} />
                </FormField>
                <FormField label="Coach Note (example: Release improved; keep chin alignment steady.)">
                  <textarea rows={2} {...sessionForm.register('custom_note')} />
                </FormField>
                <div className="form-inline">
                  <FormField label="Drill Focus (example: Anchor consistency)">
                    <input {...sessionForm.register('drill_focus')} />
                  </FormField>
                  <FormField label="Intensity RPE 1-10 (example: 7)">
                    <input type="number" min="1" max="10" {...sessionForm.register('intensity_rpe')} />
                  </FormField>
                </div>
                <FormField label="Tags (comma separated, example: evening, form-check, pre-tournament)">
                  <input {...sessionForm.register('tags')} />
                </FormField>
                <div className="sticky-action-row">
                  <button type="submit" className="primary-button" disabled={sessionForm.formState.isSubmitting}>
                    Create Session
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {section === 'live' ? <LiveTrainer token={token} defaultSport={SPORTS[0]} canSaveSession studentOptions={students} /> : null}

          {section === 'history' ? (
            <div className="history-stack">
              {!selectedSession ? (
                <>
                  <section className="panel session-filter-shell">
                    <div className="session-filter-top">
                      <div>
                        <h2 className="panel-title">Session Filters</h2>
                        <p className="panel-subtitle">Refine by athlete, date window, quality score and rep density.</p>
                      </div>
                      <div className="panel-actions">
                        <span className="status-badge primary">Results: {filteredSessionRows.length}</span>
                        <span className="status-badge neutral">Active Filters: {activeFilterCount}</span>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setHistoryFilters(DEFAULT_HISTORY_FILTERS)}
                        >
                          Reset Filters
                        </button>
                      </div>
                    </div>
                    <div className="session-filter-grid">
                      <FormField label="Student">
                        <select
                          value={historyFilters.student}
                          onChange={(e) => setHistoryFilters((prev) => ({ ...prev, student: e.target.value }))}
                        >
                          <option value="">All students</option>
                          {studentOptions.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Sport">
                        <select
                          value={historyFilters.sport}
                          onChange={(e) => setHistoryFilters((prev) => ({ ...prev, sport: e.target.value }))}
                        >
                          <option value="">All sports</option>
                          {SPORTS.map((item) => (
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
                  <section className="stats-grid">
                    <article className="stat-card">
                      <div className="stat-head">
                        <p>Fetched Sessions</p>
                      </div>
                      <h3>{filteredSessionRows.length}</h3>
                      <small>Current result set after filters</small>
                    </article>
                    <article className="stat-card">
                      <div className="stat-head">
                        <p>Average Score</p>
                      </div>
                      <h3>{avgSessionScore}</h3>
                      <small>Mean session quality score</small>
                    </article>
                    <article className="stat-card">
                      <div className="stat-head">
                        <p>Average Reps</p>
                      </div>
                      <h3>{avgRepCount}</h3>
                      <small>Mean reps in filtered sessions</small>
                    </article>
                  </section>
                  <DataTable
                    title="Fetched Session Records"
                    rows={filteredSessionRows}
                    emptyText="No sessions match filters."
                    onRowClick={(row) => setSelectedSessionId(row.id)}
                    selectedRowId={selectedSessionId}
                    columns={[
                      {
                        key: 'started_at',
                        label: 'Session Time',
                        render: (row) => formatSessionDate(row),
                      },
                      { key: 'student', label: 'Student' },
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
                        key: 'duration',
                        label: 'Duration',
                        render: (row) => (row.duration_minutes ? `${row.duration_minutes} min` : '--'),
                      },
                      {
                        key: 'tracking',
                        label: 'Tracking',
                        render: (row) => row?.camera_summary?.tracking_quality || '--',
                      },
                      {
                        key: 'summary',
                        label: 'Summary',
                        render: (row) => shorten(row.custom_note || row.drill_focus || row.feedback?.[0]),
                      },
                    ]}
                  />
                </>
              ) : null}
              {selectedSession ? (
                <section className="panel history-detail-panel">
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
            </div>
          ) : null}

          {section === 'rules' ? (
            <section className="panel enterprise-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Sport Rule Profiles</h2>
                  <p className="panel-subtitle">
                    Define angle targets and tolerance envelopes per student and sport for consistent analysis.
                  </p>
                </div>
              </div>
              <form className="form-grid form-grid-xl" onSubmit={rulesForm.handleSubmit(handleSaveRules)}>
                <FormField label="Student">
                  <select {...rulesForm.register('student', { required: true })}>
                    <option value="">Select student</option>
                    {studentOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Sport">
                  <select {...rulesForm.register('sport', { required: true })}>
                    {SPORTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </FormField>
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
                <div className="button-row sticky-action-row">
                  <button type="submit" className="primary-button" disabled={rulesForm.formState.isSubmitting}>
                    Save Rule Profile
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={rulesForm.handleSubmit(handleLoadRules)}
                    disabled={rules.loading}
                  >
                    Load Current Profile
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          {section === 'members' ? (
            <section className="panel">
              <h2 className="panel-title">Create Academy Members</h2>
              <p className="help-text">
                Academy Admin creates staff/students. Staff can create students only if permitted.
              </p>
              <form className="form-grid" onSubmit={memberForm.handleSubmit(handleCreateMember)}>
                <FormField label="Role">
                  <select {...memberForm.register('mode')}>
                    <option value="student">student</option>
                    {isAcademyAdmin ? <option value="staff">staff</option> : null}
                  </select>
                </FormField>
                <FormField label="Username">
                  <input {...memberForm.register('username', { required: true })} />
                </FormField>
                <FormField label="Password">
                  <input type="password" {...memberForm.register('password', { required: true })} />
                </FormField>
                <label className="check-field">
                  <input type="checkbox" {...memberForm.register('can_add_students')} />
                  <span>Allow this staff to add students</span>
                </label>
                <button type="submit" className="primary-button" disabled={memberForm.formState.isSubmitting}>
                  Create Member
                </button>
              </form>
            </section>
          ) : null}

          {section === 'angles' ? (
            <section className="panel">
              <h2 className="panel-title">Student Baseline Angle Targets</h2>
              <p className="help-text">
                This stores each student's baseline profile values. Example: Spine 10, Hip level 12.
                Rule profiles are sport-specific and separate.
              </p>
              <form className="form-grid" onSubmit={angleForm.handleSubmit(handleUpdateAngles)}>
                <FormField label="Student">
                  <select {...angleForm.register('student', { required: true })}>
                    <option value="">Select student</option>
                    {students.map((item) => (
                      <option key={item.username} value={item.username}>
                        {item.username}
                      </option>
                    ))}
                  </select>
                </FormField>
                <div className="metrics-grid">
                  {ANGLE_METRICS.map((metric) => (
                    <FormField key={metric.id} label={metric.label}>
                      <input type="number" step={metric.step} {...angleForm.register(`measurements.${metric.id}`)} />
                    </FormField>
                  ))}
                </div>
                <button type="submit" className="primary-button" disabled={angleForm.formState.isSubmitting}>
                  Update Baseline Targets
                </button>
              </form>
            </section>
          ) : null}

          {section === 'assign' ? (
            <section className="panel">
              <h2 className="panel-title">Assign Sport to Student</h2>
              <form className="form-grid" onSubmit={assignSportForm.handleSubmit(handleAssignSport)}>
                <FormField label="Student">
                  <select {...assignSportForm.register('student', { required: true })}>
                    <option value="">Select student</option>
                    {students.map((item) => (
                      <option key={item.username} value={item.username}>
                        {item.username}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Sport">
                  <select {...assignSportForm.register('sport', { required: true })}>
                    {SPORTS.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </FormField>
                <button type="submit" className="primary-button" disabled={assignSportForm.formState.isSubmitting}>
                  Update Assigned Sport
                </button>
              </form>
            </section>
          ) : null}

          {section === 'profile' ? <ProfileSection /> : null}
        </>
      )}
    </PageShell>
  );
}
