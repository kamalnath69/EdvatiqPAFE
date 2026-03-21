import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router-dom';
import { requestEmailVerification, verifyEmail } from '../services/authApi';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/httpError';
import FormField from '../components/ui/FormField';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function VerifyEmail() {
  const query = useQuery();
  const identityFromQuery = query.get('identity') || '';
  const { pushToast } = useToast();
  const [sent, setSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const autoSentRef = useRef(false);
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { identity: identityFromQuery, code: '' } });

  useEffect(() => {
    if (identityFromQuery && !autoSentRef.current) {
      autoSentRef.current = true;
      requestEmailVerification(identityFromQuery)
        .then(() => {
          setSent(true);
          pushToast({ type: 'success', message: 'Verification code sent to your email.' });
        })
        .catch(() => {});
    }
  }, [identityFromQuery, pushToast]);

  const onSend = async () => {
    const identity = getValues('identity');
    if (!identity?.trim()) {
      pushToast({ type: 'info', message: 'Enter your username or email first.' });
      return;
    }
    try {
      await requestEmailVerification(identity.trim());
      setSent(true);
      pushToast({ type: 'success', message: 'Verification code sent.' });
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to send code.') });
    }
  };

  const onSubmit = async (values) => {
    try {
      await verifyEmail(values.identity.trim(), values.code.trim());
      pushToast({ type: 'success', message: 'Email verified successfully.' });
      setValue('code', '');
      setVerified(true);
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to verify email.') });
    }
  };

  return (
    <div className="auth-layout">
      <section className="auth-brand">
        <div className="auth-logo-lockup">
          <div className="auth-logo-mark">E</div>
          <div>
            <p className="auth-logo-kicker">Performance Intelligence</p>
            <strong>Edvatiq</strong>
          </div>
        </div>
        <p className="auth-chip">Email Verification</p>
        <h1>Confirm your email to activate access.</h1>
        <p>We will send a verification code to complete registration.</p>
      </section>

      <section className="auth-card entrance-rise">
        <div className="auth-card-mini-brand">
          <div className="auth-logo-mark">E</div>
          <div>
            <p className="auth-logo-kicker">Performance Intelligence</p>
            <strong>Edvatiq</strong>
          </div>
        </div>
        <h2>Verify your email</h2>
        <p className="auth-helper">Enter your username or email, then add the code from your inbox.</p>

        {verified ? (
          <div className="auth-success">
            <p>Your email is verified. You can sign in now.</p>
            <div className="auth-actions">
              <Link className="primary-button" to="/login">Go to login</Link>
              <Link className="ghost-button" to="/forgot-password">Forgot password</Link>
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
            <FormField label="Verification Code" error={errors.code?.message}>
              <input
                className="code-input"
                {...register('code', { required: 'Verification code is required' })}
                placeholder="123456"
              />
            </FormField>
            <div className="auth-actions">
              <button type="button" className="ghost-button" onClick={onSend} disabled={isSubmitting}>
                {sent ? 'Resend code' : 'Send code'}
              </button>
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify email'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-links">
          <Link to="/login">Back to login</Link>
          <Link to="/forgot-password">Forgot password</Link>
        </div>
      </section>
    </div>
  );
}
