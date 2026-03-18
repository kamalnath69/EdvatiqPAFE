import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../services/authApi';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/httpError';
import FormField from '../components/ui/FormField';

export default function ForgotPassword() {
  const { pushToast } = useToast();
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { identity: '' } });

  const onSubmit = async (values) => {
    try {
      await requestPasswordReset(values.identity.trim());
      setSent(true);
      pushToast({ type: 'success', message: 'Verification code sent to your email.' });
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to send reset code.') });
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-brand">
        <p className="auth-chip">Account Recovery</p>
        <h1>Reset your Edvatiq password.</h1>
        <p>We will send a secure verification code to your registered email.</p>
      </section>

      <section className="auth-card entrance-rise">
        <h2>Forgot password</h2>
        <p className="auth-helper">
          Enter your username or email and we will send a reset code.
        </p>

        {sent ? (
          <div className="auth-success">
            <p>Check your inbox for the verification code.</p>
            <div className="auth-actions">
              <Link className="primary-button" to="/reset-password">Reset password</Link>
              <Link className="ghost-button" to="/login">Back to login</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
            <FormField label="Username or Email" error={errors.identity?.message}>
              <input
                {...register('identity', { required: 'Username or email is required' })}
                placeholder="name@domain.com"
              />
            </FormField>
            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        )}

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
          <Link to="/verify-email">Verify email</Link>
        </div>
      </section>
    </div>
  );
}
