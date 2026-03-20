import { useEffect, useMemo, useState } from 'react';
import { Activity, Bell, Building2, CalendarDays, CreditCard, FileText, Link2, Settings2, ShieldCheck, Users, Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import PageShell from './ui/PageShell';
import DataTable from './ui/DataTable';
import FormField from './ui/FormField';
import StatCard from './ui/StatCard';
import StatusBadge from './ui/StatusBadge';
import ConfirmDialog from './ui/ConfirmDialog';
import { useAcademies } from '../hooks/useAcademies';
import { useUsers } from '../hooks/useUsers';
import { useSessions } from '../hooks/useSessions';
import { useLeads } from '../hooks/useLeads';
import ProfileSection from './ProfileSection';
import PolicyManager from './PolicyManager';
import PlanManager from './PlanManager';
import {
  WorkspaceAuditSection,
  WorkspaceBillingSection,
  WorkspaceCalendarSection,
  WorkspaceFavoritesPanel,
  WorkspaceHelpSection,
  WorkspaceInviteSection,
  WorkspaceNotificationsSection,
  WorkspaceReportsSection,
  WorkspaceSettingsSection,
  WorkspaceSystemSection,
} from './WorkspaceModules';
import { getErrorMessage } from '../services/httpError';
import { SPORTS } from '../constants/sports';
import { useToast } from '../hooks/useToast';

function AdminKpis({ academies, users, sessions }) {
  return (
    <div className="stats-grid">
      <StatCard label="Academies" value={academies.length} hint="Program hubs" icon={<Building2 />} />
      <StatCard label="Users" value={users.length} hint="Across all roles" icon={<Users />} />
      <StatCard label="Sessions" value={sessions.length} hint="Posture logs" icon={<Activity />} />
      <StatCard label="Staff + Admins" value={users.filter((u) => u.role !== 'student').length} icon={<ShieldCheck />} />
    </div>
  );
}

const CHART_COLORS = ['#f5c518', '#1b1b1b', '#ffe08a', '#f97316'];

export default function AdminDashboard() {
  const academies = useAcademies();
  const users = useUsers(true);
  const sessions = useSessions({ mode: 'all' });
  const leads = useLeads();
  const [confirm, setConfirm] = useState({ type: '', key: '', open: false });
  const [notice, setNotice] = useState({ type: '', message: '' });
  const { pushToast } = useToast();
  const [assignAcademy, setAssignAcademy] = useState('');
  const [leadFilters, setLeadFilters] = useState({
    status: '',
    type: 'all',
    dateFrom: '',
    dateTo: '',
    query: '',
  });

  const academyForm = useForm({
    defaultValues: {
      academy_id: '',
      name: '',
      address: '',
      city: '',
      state: '',
      country: '',
      contact_email: '',
      contact_phone: '',
    },
  });
  const userForm = useForm({ defaultValues: { username: '', password: '', role: 'academy_admin', academy_id: '' } });
  const assignForm = useForm({ defaultValues: { username: '', sport: SPORTS[0] } });
  const academyUserForm = useForm({
    defaultValues: { academy_id: '', username: '', password: '', mode: 'staff', can_add_students: false },
  });

  const sections = [
    { key: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    { key: 'notifications', label: 'Notifications', icon: <Bell size={16} />, sidebarHidden: true },
    { key: 'reports', label: 'Reports', icon: <FileText size={16} /> },
    { key: 'calendar', label: 'Calendar', icon: <CalendarDays size={16} /> },
    { key: 'audit', label: 'Audit', icon: <ShieldCheck size={16} /> },
    { key: 'billing', label: 'Billing', icon: <CreditCard size={16} /> },
    { key: 'system', label: 'System', icon: <Zap size={16} /> },
    { key: 'invites', label: 'Invites', icon: <Link2 size={16} /> },
    { key: 'academies', label: 'Academies', icon: <Building2 size={16} /> },
    { key: 'users', label: 'Users', icon: <Users size={16} /> },
    { key: 'actions', label: 'Quick Actions', icon: <ShieldCheck size={16} /> },
    { key: 'leads', label: 'Leads', icon: <Activity size={16} /> },
    { key: 'plans', label: 'Plans', icon: <ShieldCheck size={16} /> },
    { key: 'policies', label: 'Policies', icon: <ShieldCheck size={16} /> },
    { key: 'settings', label: 'Settings', icon: <Settings2 size={16} /> },
  ];

  const academyRows = useMemo(
    () =>
      academies.data.map((a) => ({
        ...a,
        id: a.academy_id || a.name,
      })),
    [academies.data]
  );
  const academyOptions = useMemo(
    () => academies.data.map((item) => ({ id: item.academy_id, name: item.name || item.academy_id })),
    [academies.data]
  );
  const studentUsers = useMemo(
    () => users.data.filter((item) => item.role === 'student'),
    [users.data]
  );
  const assignableStudents = useMemo(() => {
    if (!assignAcademy) return studentUsers;
    return studentUsers.filter((item) => item.academy_id === assignAcademy);
  }, [studentUsers, assignAcademy]);
  const loadError = academies.error || users.error || sessions.error;
  const leadError = leads.demo.error || leads.support.error;
  const leadsLoading = leads.demo.loading || leads.support.loading;
  const usersByRole = useMemo(() => {
    const grouped = users.data.reduce((acc, item) => {
      const key = item.role || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [users.data]);
  const sessionsBySport = useMemo(() => {
    const grouped = sessions.data.reduce((acc, item) => {
      const key = item.sport || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, total]) => ({ name, total }));
  }, [sessions.data]);

  useEffect(() => {
    if (!notice.message) return;
    pushToast({ type: notice.type || 'info', message: notice.message });
  }, [notice, pushToast]);

  useEffect(() => {
    if (!loadError) return;
    pushToast({ type: 'error', message: loadError });
  }, [loadError, pushToast]);

  useEffect(() => {
    if (!leadError) return;
    pushToast({ type: 'error', message: leadError });
  }, [leadError, pushToast]);

  useEffect(() => {
    const selectedStudent = assignForm.getValues('username');
    if (!selectedStudent) return;
    if (!assignableStudents.some((item) => item.username === selectedStudent)) {
      assignForm.setValue('username', '');
    }
  }, [assignableStudents, assignForm]);

  async function handleCreateAcademy(values) {
    try {
      await academies.create(values);
      academyForm.reset({
        academy_id: '',
        name: '',
        address: '',
        city: '',
        state: '',
        country: '',
        contact_email: '',
        contact_phone: '',
      });
      setNotice({ type: 'success', message: 'Academy created.' });
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err, 'Failed to create academy.') });
    }
  }

  async function handleCreateUser(values) {
    try {
      await users.create(values);
      userForm.reset({ username: '', password: '', role: 'academy_admin', academy_id: '' });
      setNotice({ type: 'success', message: 'User created.' });
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err, 'Failed to create user.') });
    }
  }

  async function handleAssign(values) {
    try {
      await users.assign(values.username, values.sport);
      assignForm.reset({ username: '', sport: values.sport || SPORTS[0] });
      setNotice({ type: 'success', message: 'Sport assigned.' });
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err, 'Failed to assign sport.') });
    }
  }

  async function handleAcademyUser(values) {
    try {
      const payload = { username: values.username, password: values.password, role: values.mode };
      if (values.mode === 'academy_admin') await academies.createAdmin(values.academy_id, payload);
      if (values.mode === 'staff') await academies.createStaff(values.academy_id, payload, values.can_add_students);
      if (values.mode === 'student') await academies.createStudent(values.academy_id, payload);
      academyUserForm.reset({
        academy_id: '',
        username: '',
        password: '',
        mode: 'staff',
        can_add_students: false,
      });
      setNotice({ type: 'success', message: 'Academy user created.' });
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err, 'Failed to create academy user.') });
    }
  }

  async function handleConfirmDelete() {
    try {
      if (confirm.type === 'academy') await academies.remove(confirm.key);
      if (confirm.type === 'user') await users.remove(confirm.key);
      setNotice({ type: 'success', message: 'Deleted successfully.' });
    } catch (err) {
      setNotice({ type: 'error', message: getErrorMessage(err, 'Delete failed.') });
    } finally {
      setConfirm({ type: '', key: '', open: false });
    }
  }

  const leadRows = useMemo(() => {
    const all = [
      ...leads.demo.data.map((item) => ({ ...item, kind: 'demo' })),
      ...leads.support.data.map((item) => ({ ...item, kind: 'support' })),
    ];
    const fromMs = leadFilters.dateFrom ? new Date(`${leadFilters.dateFrom}T00:00:00`).getTime() : null;
    const toMs = leadFilters.dateTo ? new Date(`${leadFilters.dateTo}T23:59:59`).getTime() : null;
    const query = leadFilters.query.trim().toLowerCase();
    return all
      .filter((row) => {
        if (leadFilters.type !== 'all' && row.kind !== leadFilters.type) return false;
        if (leadFilters.status && row.status !== leadFilters.status) return false;
        const at = row.created_at ? row.created_at * 1000 : null;
        if (fromMs && at && at < fromMs) return false;
        if (toMs && at && at > toMs) return false;
        if (query) {
          const blob = [
            row.name,
            row.email,
            row.organization,
            row.message,
            row.goals,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!blob.includes(query)) return false;
        }
        return true;
      })
      .map((row, idx) => ({ ...row, id: row.id || `${row.kind}-${idx}` }));
  }, [leads.demo.data, leads.support.data, leadFilters]);

  return (
    <PageShell
      title="Admin Command Center"
      subtitle="Manage users, academies, access and performance records."
      sections={sections}
      heroStats={[
        { label: 'Academies', value: academies.data.length },
        { label: 'Platform Users', value: users.data.length },
        { label: 'Lead Inbox', value: leadRows.length },
      ]}
      heroNote="Platform governance"
    >
      {(section) => (
        <>
          {section === 'overview' ? (
            <>
              <AdminKpis academies={academies.data} users={users.data} sessions={sessions.data} />
              <div className="panel-grid">
                <section className="panel chart-panel">
                  <h2 className="panel-title">Users by Role</h2>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={usersByRole} dataKey="value" nameKey="name" outerRadius={90}>
                          {usersByRole.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </section>
                <section className="panel chart-panel">
                  <h2 className="panel-title">Sessions by Sport</h2>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={sessionsBySport}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3e4d67" />
                        <XAxis dataKey="name" stroke="#a9b4c9" />
                        <YAxis stroke="#a9b4c9" allowDecimals={false} />
                        <Tooltip />
                      <Bar dataKey="total" fill="#f5c518" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
              <DataTable
                title="Latest Sessions"
                emptyText="No sessions available yet."
                emptyActionLabel="Review Pricing"
                emptyActionHref="/pricing"
                rows={sessions.data.slice(0, 8).map((s, idx) => ({ ...s, id: `${s.student}-${idx}` }))}
                columns={[
                  { key: 'student', label: 'Student' },
                  { key: 'sport', label: 'Sport' },
                  {
                    key: 'created_by',
                    label: 'Coach',
                    render: (row) => row.created_by || '--',
                  },
                  {
                    key: 'duration_minutes',
                    label: 'Duration',
                    render: (row) => (row.duration_minutes ? `${row.duration_minutes} min` : '--'),
                  },
                  {
                    key: 'feedback',
                    label: 'Feedback',
                    render: (row) => row.feedback?.join(', ') || 'No notes',
                  },
                ]}
              />
              <WorkspaceFavoritesPanel />
            </>
          ) : null}

          {section === 'notifications' ? <WorkspaceNotificationsSection /> : null}

          {section === 'reports' ? <WorkspaceReportsSection role="admin" students={users.data.filter((item) => item.role === 'student')} /> : null}

          {section === 'calendar' ? <WorkspaceCalendarSection students={users.data.filter((item) => item.role === 'student')} role="admin" /> : null}

          {section === 'audit' ? <WorkspaceAuditSection /> : null}

          {section === 'billing' ? <WorkspaceBillingSection /> : null}

          {section === 'system' ? <WorkspaceSystemSection /> : null}

          {section === 'invites' ? <WorkspaceInviteSection defaultRole="academy_admin" /> : null}

          {section === 'academies' ? (
            <div className="panel-grid">
              <section className="panel">
                <h2 className="panel-title">Create Academy</h2>
                <form className="form-grid" onSubmit={academyForm.handleSubmit(handleCreateAcademy)}>
                  <FormField label="Academy ID">
                    <input {...academyForm.register('academy_id', { required: true })} placeholder="ACAD-001" />
                  </FormField>
                  <FormField label="Academy Name">
                    <input {...academyForm.register('name', { required: true })} placeholder="Elite Archery Academy" />
                  </FormField>
                  <FormField label="Address">
                    <input {...academyForm.register('address', { required: true })} />
                  </FormField>
                  <FormField label="City">
                    <input {...academyForm.register('city', { required: true })} />
                  </FormField>
                  <FormField label="State">
                    <input {...academyForm.register('state', { required: true })} />
                  </FormField>
                  <FormField label="Country">
                    <input {...academyForm.register('country', { required: true })} />
                  </FormField>
                  <FormField label="Contact Email">
                    <input type="email" {...academyForm.register('contact_email')} />
                  </FormField>
                  <FormField label="Contact Phone">
                    <input {...academyForm.register('contact_phone')} />
                  </FormField>
                  <button type="submit" className="primary-button" disabled={academyForm.formState.isSubmitting}>
                    Add Academy
                  </button>
                </form>
              </section>

              <DataTable
                title="Academies"
                rows={academyRows}
                emptyText="Create your first academy."
                emptyActionLabel="Book a Demo"
                emptyActionHref="/book-demo"
                columns={[
                  { key: 'academy_id', label: 'Academy ID' },
                  { key: 'name', label: 'Name' },
                  { key: 'city', label: 'City' },
                  { key: 'state', label: 'State' },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row) => (
                      <button
                        type="button"
                        className="danger-link"
                        onClick={() => setConfirm({ type: 'academy', key: row.academy_id, open: true })}
                      >
                        Delete
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          ) : null}

          {section === 'users' ? (
            <div className="panel-grid">
              <section className="panel">
                <h2 className="panel-title">Create Platform User</h2>
                <form className="form-grid" onSubmit={userForm.handleSubmit(handleCreateUser)}>
                  <FormField label="Username">
                    <input {...userForm.register('username', { required: true })} />
                  </FormField>
                  <FormField label="Password">
                    <input type="password" {...userForm.register('password', { required: true })} />
                  </FormField>
                  <FormField label="Role">
                    <select {...userForm.register('role')}>
                      <option value="academy_admin">academy_admin</option>
                      <option value="admin">admin</option>
                    </select>
                  </FormField>
                  <FormField label="Academy ID (optional)">
                    <select {...userForm.register('academy_id')}>
                      <option value="">None</option>
                      {academyOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.id} - {item.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <button type="submit" className="primary-button" disabled={userForm.formState.isSubmitting}>
                    Add User
                  </button>
                </form>
              </section>

              <DataTable
                title="Users"
                rows={users.data.map((u) => ({ ...u, id: u.username }))}
                emptyText="No users available."
                emptyActionLabel="Book a Demo"
                emptyActionHref="/book-demo"
                columns={[
                  { key: 'username', label: 'Username' },
                  {
                    key: 'role',
                    label: 'Role',
                    render: (row) => <StatusBadge value={row.role} />,
                  },
                  { key: 'academy_id', label: 'Academy' },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row) => (
                      <button
                        type="button"
                        className="danger-link"
                        onClick={() => setConfirm({ type: 'user', key: row.username, open: true })}
                      >
                        Delete
                      </button>
                    ),
                  },
                ]}
              />
            </div>
          ) : null}

          {section === 'actions' ? (
            <div className="panel-grid">
              <section className="panel">
                <h2 className="panel-title">Assign Sport</h2>
                <form className="form-grid" onSubmit={assignForm.handleSubmit(handleAssign)}>
                  <FormField label="Academy Filter">
                    <select value={assignAcademy} onChange={(e) => setAssignAcademy(e.target.value)}>
                      <option value="">All academies</option>
                      {academyOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.id} - {item.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Student">
                    <select {...assignForm.register('username', { required: true })}>
                      <option value="">Select student</option>
                      {assignableStudents.map((item) => (
                        <option key={item.username} value={item.username}>
                          {item.username} ({item.academy_id || 'no academy'})
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Sport">
                    <select {...assignForm.register('sport', { required: true })}>
                      {SPORTS.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <button type="submit" className="primary-button" disabled={assignForm.formState.isSubmitting}>
                    Assign
                  </button>
                </form>
              </section>

              <section className="panel">
                <h2 className="panel-title">Add Academy Member</h2>
                <form className="form-grid" onSubmit={academyUserForm.handleSubmit(handleAcademyUser)}>
                  <FormField label="Academy ID">
                    <select {...academyUserForm.register('academy_id', { required: true })}>
                      <option value="">Select academy</option>
                      {academyOptions.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.id} - {item.name}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  <FormField label="Username">
                    <input {...academyUserForm.register('username', { required: true })} />
                  </FormField>
                  <FormField label="Password">
                    <input type="password" {...academyUserForm.register('password', { required: true })} />
                  </FormField>
                  <FormField label="Role">
                    <select {...academyUserForm.register('mode')}>
                      <option value="academy_admin">academy_admin</option>
                      <option value="staff">staff</option>
                      <option value="student">student</option>
                    </select>
                  </FormField>
                  <label className="check-field">
                    <input type="checkbox" {...academyUserForm.register('can_add_students')} />
                    <span>Staff can add students</span>
                  </label>
                  <button type="submit" className="primary-button" disabled={academyUserForm.formState.isSubmitting}>
                    Create Academy User
                  </button>
                </form>
              </section>
            </div>
          ) : null}

          {section === 'plans' ? (
            <section className="panel enterprise-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Plan Features</h2>
                  <p className="panel-subtitle">Control plan descriptions and feature allocation.</p>
                </div>
              </div>
              <PlanManager />
            </section>
          ) : null}

          {section === 'policies' ? (
            <section className="panel enterprise-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Policies</h2>
                  <p className="panel-subtitle">Update privacy and terms content shown on the website.</p>
                </div>
              </div>
              <PolicyManager />
            </section>
          ) : null}

          {section === 'leads' ? (
            <section className="panel enterprise-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Lead Inbox</h2>
                  <p className="panel-subtitle">Demo and support submissions captured from the website.</p>
                </div>
                <div className="panel-actions">
                  <span className="status-badge primary">Total: {leadRows.length}</span>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => leads.refresh().catch(() => {})}
                    disabled={leadsLoading}
                  >
                    {leadsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              </div>
              <div className="form-inline" style={{ marginBottom: '1rem' }}>
                <FormField label="Type">
                  <select
                    value={leadFilters.type}
                    onChange={(e) => setLeadFilters((prev) => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="all">All</option>
                    <option value="demo">Demo</option>
                    <option value="support">Support</option>
                  </select>
                </FormField>
                <FormField label="Status">
                  <select
                    value={leadFilters.status}
                    onChange={(e) => setLeadFilters((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="">All</option>
                    <option value="new">New</option>
                    <option value="in_progress">In progress</option>
                    <option value="closed">Closed</option>
                  </select>
                </FormField>
                <FormField label="From">
                  <input
                    type="date"
                    value={leadFilters.dateFrom}
                    onChange={(e) => setLeadFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
                  />
                </FormField>
                <FormField label="To">
                  <input
                    type="date"
                    value={leadFilters.dateTo}
                    onChange={(e) => setLeadFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
                  />
                </FormField>
                <FormField label="Search">
                  <input
                    value={leadFilters.query}
                    onChange={(e) => setLeadFilters((prev) => ({ ...prev, query: e.target.value }))}
                    placeholder="name, email, org, message"
                  />
                </FormField>
              </div>
              <DataTable
                title="Leads"
                rows={leadRows}
                emptyText="No leads yet."
                emptyActionLabel="Visit Support"
                emptyActionHref="/support"
                columns={[
                  { key: 'kind', label: 'Type' },
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'organization', label: 'Organization' },
                  { key: 'topic', label: 'Topic' },
                  { key: 'status', label: 'Status' },
                  {
                    key: 'created_at',
                    label: 'Created',
                    render: (row) => (row.created_at ? new Date(row.created_at * 1000).toLocaleString() : '--'),
                  },
                  {
                    key: 'message',
                    label: 'Message',
                    render: (row) => row.message || row.goals || '--',
                  },
                ]}
              />
            </section>
          ) : null}

          {section === 'settings' ? (
            <div className="panel-grid">
              <WorkspaceSettingsSection canManageAcademy canManagePlatform />
              <WorkspaceHelpSection canManage />
              <ProfileSection />
            </div>
          ) : null}

          <ConfirmDialog
            open={confirm.open}
            title="Confirm Deletion"
            message="This action cannot be undone."
            onCancel={() => setConfirm({ type: '', key: '', open: false })}
            onConfirm={handleConfirmDelete}
          />
        </>
      )}
    </PageShell>
  );
}
