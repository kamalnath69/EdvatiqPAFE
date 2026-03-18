import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resetPassword } from '../services/authApi';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/httpError';
import FormField from '../components/ui/FormField';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function ResetPassword() {
  const query = useQuery();
  const identityFromQuery = query.get('identity') || '';
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { identity: identityFromQuery, code: '', new_password: '' } });

  const onSubmit = async (values) => {
    try {
      await resetPassword(values.identity.trim(), values.code.trim(), values.new_password);
      pushToast({ type: 'success', message: 'Password updated. Please sign in.' });
      navigate('/login');
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to reset password.') });
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-brand">
        <p className="auth-chip">Password Reset</p>
        <h1>Create a new password securely.</h1>
        <p>Use the verification code from your email to complete the reset.</p>
      </section>

      <section className="auth-card entrance-rise">
        <h2>Reset password</h2>
        <p className="auth-helper">Enter the verification code and your new password.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
          <FormField label="Username or Email" error={errors.identity?.message}>
            <input
              {...register('identity', { required: 'Username or email is required' })}
              placeholder="name@domain.com"
            />
          </FormField>
          <FormField label="Verification Code" error={errors.code?.message}>
            <input
              className="code-input"
              {...register('code', { required: 'Verification code is required' })}
              placeholder="123456"
            />
          </FormField>
          <FormField label="New Password" error={errors.new_password?.message}>
            <input
              type="password"
              {...register('new_password', { required: 'New password is required' })}
            />
          </FormField>
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Updating...' : 'Update password'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
          <Link to="/forgot-password">Resend reset code</Link>
        </div>
      </section>
    </div>
  );
}
