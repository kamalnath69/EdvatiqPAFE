import { useContext } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import { loginRequest, requestEmailVerification } from '../services/authApi';
import FormField from './ui/FormField';
import { getErrorMessage } from '../services/httpError';
import { useToast } from '../hooks/useToast';

export default function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      const resp = await loginRequest(values.username, values.password);
      login(resp.access_token);
      navigate('/dashboard');
    } catch (err) {
      const detail = err?.response?.data?.detail || '';
      if (typeof detail === 'string' && detail.toLowerCase().includes('email not verified')) {
        try {
          await requestEmailVerification(values.username);
        } catch {
          // ignore resend failure, user can request again
        }
        pushToast({ type: 'info', message: 'Email not verified. We sent a verification code.' });
        navigate(`/verify-email?identity=${encodeURIComponent(values.username)}`);
        return;
      }
      pushToast({ type: 'error', message: getErrorMessage(err, 'Invalid username or password.') });
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-brand">
        <p className="auth-chip">Athletic Intelligence</p>
        <h1>Precision posture training for elite progress.</h1>
        <p>
          Monitor sessions, role-based workflows, and feedback loops for every athlete in one
          command center.
        </p>
        <div className="metrics-grid compact">
          <article className="metric-tile">
            <p>Session Visibility</p>
            <strong>Role scoped</strong>
          </article>
          <article className="metric-tile">
            <p>Live Coaching</p>
            <strong>Real-time</strong>
          </article>
          <article className="metric-tile">
            <p>Rule Governance</p>
            <strong>Per sport</strong>
          </article>
        </div>
      </section>

      <section className="auth-card entrance-rise">
        <h2>Welcome back</h2>
        <p className="auth-helper">Sign in to access your training workspace.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
          <FormField label="Username" error={errors.username?.message}>
            <input
              {...register('username', { required: 'Username is required' })}
              autoComplete="username"
              placeholder="Enter username"
            />
          </FormField>
          <FormField label="Password" error={errors.password?.message}>
            <input
              type="password"
              {...register('password', { required: 'Password is required' })}
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </FormField>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div className="auth-actions">
          <Link className="ghost-button" to="/pricing">View Plans</Link>
          <Link className="ghost-button" to="/forgot-password">Forgot Password</Link>
        </div>
      </section>
    </div>
  );
}
