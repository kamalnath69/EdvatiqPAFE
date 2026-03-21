import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { createOrder, listPlans, verifyPayment } from '../services/billingApi';
import {
  checkSignupAvailability,
  loginRequest,
  requestSignupVerification,
  verifySignupEmail,
} from '../services/authApi';
import { useDraftState } from '../hooks/useDraftState';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/httpError';
import FormField from '../components/ui/FormField';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Razorpay SDK failed to load.'));
    document.body.appendChild(script);
  });
}

export default function Signup() {
  const query = useQuery();
  const navigate = useNavigate();
  const { pushToast } = useToast();
  const [plans, setPlans] = useState([]);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availability, setAvailability] = useState({
    username_available: true,
    email_available: true,
  });
  const planCode = query.get('plan') || '';
  const defaultDraft = useMemo(
    () => ({
      form: {
        username: '',
        password: '',
        email: '',
        email_code: '',
        full_name: '',
        org_name: '',
        dob: '',
        accepted_terms: false,
      },
      sentEmail: '',
      verifiedEmail: '',
    }),
    []
  );
  const [signupDraft, setSignupDraft, clearSignupDraft] = useDraftState(
    `auth.signup.${planCode || 'default'}`,
    defaultDraft,
    { storage: 'session' }
  );
  const sentEmail = signupDraft.sentEmail || '';
  const verifiedEmail = signupDraft.verifiedEmail || '';
  const plan = plans.find((p) => p.code === planCode);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: signupDraft.form,
  });
  const watchedValues = useWatch({ control });
  const watchedEmail = useWatch({ control, name: 'email' });
  const watchedUsername = useWatch({ control, name: 'username' });
  const acceptedTerms = useWatch({ control, name: 'accepted_terms' });

  useEffect(() => {
    setSignupDraft((prev) => ({
      ...prev,
      form: {
        ...prev.form,
        ...watchedValues,
      },
    }));
  }, [setSignupDraft, watchedValues]);

  useEffect(() => {
    async function load() {
      try {
        const data = await listPlans();
        setPlans(data || []);
      } catch (err) {
        pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to load plans.') });
      }
    }
    load();
  }, [pushToast]);

  const normalizedEmail = (watchedEmail || '').trim().toLowerCase();
  const normalizedUsername = (watchedUsername || '').trim();
  const emailSent = normalizedEmail !== '' && sentEmail === normalizedEmail;
  const emailVerified = normalizedEmail !== '' && verifiedEmail === normalizedEmail;
  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const usernameLooksValid = normalizedUsername.length >= 3;
  const showVerificationStep = emailSent || emailVerified;

  useEffect(() => {
    if (showVerificationStep) return undefined;
    if (!normalizedUsername && !normalizedEmail) {
      setAvailability({ username_available: true, email_available: true });
      clearErrors(['username', 'email']);
      return undefined;
    }
    const shouldCheckUsername = usernameLooksValid;
    const shouldCheckEmail = emailLooksValid;
    if (!shouldCheckUsername && !shouldCheckEmail) return undefined;
    const timeoutId = window.setTimeout(async () => {
      setAvailabilityLoading(true);
      try {
        const result = await checkSignupAvailability({
          username: shouldCheckUsername ? normalizedUsername : '',
          email: shouldCheckEmail ? normalizedEmail : '',
        });
        setAvailability(result);
        if (shouldCheckUsername) {
          if (!result.username_available) {
            setError('username', { type: 'manual', message: 'Username already exists' });
          } else if (errors.username?.type === 'manual') {
            clearErrors('username');
          }
        }
        if (shouldCheckEmail) {
          if (!result.email_available) {
            setError('email', { type: 'manual', message: 'Email already exists' });
          } else if (errors.email?.type === 'manual') {
            clearErrors('email');
          }
        }
      } catch {
        // keep form usable if availability checks fail temporarily
      } finally {
        setAvailabilityLoading(false);
      }
    }, 320);
    return () => window.clearTimeout(timeoutId);
  }, [
    clearErrors,
    emailLooksValid,
    errors.email?.type,
    errors.username?.type,
    normalizedEmail,
    normalizedUsername,
    setError,
    showVerificationStep,
    usernameLooksValid,
  ]);

  const handleSendCode = async () => {
    const email = normalizedEmail;
    if (!email) {
      pushToast({ type: 'info', message: 'Enter your email to receive a code.' });
      return;
    }
    if (!availability.email_available) {
      pushToast({ type: 'info', message: 'This email is already registered.' });
      return;
    }
    if (!availability.username_available) {
      pushToast({ type: 'info', message: 'Choose a different username before continuing.' });
      return;
    }
    if (!emailLooksValid) {
      pushToast({ type: 'info', message: 'Enter a valid email address first.' });
      return;
    }
    setSendingCode(true);
    try {
      const result = await requestSignupVerification(email);
      setSignupDraft((prev) => ({
        ...prev,
        sentEmail: email,
        verifiedEmail:
          result?.detail === 'Email already verified for checkout.' ? email : prev.verifiedEmail === email ? prev.verifiedEmail : '',
        form: {
          ...prev.form,
          email,
          email_code: result?.detail === 'Email already verified for checkout.' ? '' : prev.form.email_code,
        },
      }));
      if (verifiedEmail && verifiedEmail !== email) {
        setValue('email_code', '');
      }
      pushToast({
        type: result?.detail === 'Email already verified for checkout.' ? 'success' : 'success',
        message:
          result?.detail === 'Email already verified for checkout.'
            ? 'This email is already verified. You can continue to checkout.'
            : 'Verification code sent to your email.',
      });
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to send verification code.') });
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    const email = normalizedEmail;
    const code = (getValues('email_code') || '').trim();
    if (!email || !code) {
      pushToast({ type: 'info', message: 'Enter email and verification code.' });
      return;
    }
    setVerifyingCode(true);
    try {
      await verifySignupEmail(email, code);
      setSignupDraft((prev) => ({
        ...prev,
        sentEmail: email,
        verifiedEmail: email,
        form: {
          ...prev.form,
          email,
          email_code: code,
        },
      }));
      pushToast({ type: 'success', message: 'Email verified. You can proceed to payment.' });
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Invalid or expired code.') });
    } finally {
      setVerifyingCode(false);
    }
  };

  const onSubmit = async (values) => {
    if (!plan) {
      pushToast({ type: 'error', message: 'Select a plan before checkout.' });
      return;
    }
    if (plan.plan_type === 'organization' && !values.org_name.trim()) {
      pushToast({ type: 'error', message: 'Organization name is required for organization plans.' });
      return;
    }
    if (!availability.username_available) {
      pushToast({ type: 'error', message: 'Username already exists.' });
      return;
    }
    if (!availability.email_available) {
      pushToast({ type: 'error', message: 'Email already exists.' });
      return;
    }
    if (!values.email.trim()) {
      pushToast({ type: 'error', message: 'Email is required to activate your plan.' });
      return;
    }
    if (!emailVerified) {
      pushToast({ type: 'info', message: 'Please verify your email before checkout.' });
      return;
    }
    try {
      await loadRazorpayScript();
      const order = await createOrder({
        plan_code: plan.code,
        username: values.username.trim(),
        password: values.password,
        email: values.email.trim() || null,
        full_name: values.full_name.trim() || null,
        org_name: values.org_name.trim() || null,
        dob: values.dob || null,
        accepted_terms: Boolean(values.accepted_terms),
      });

      const options = {
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: 'Edvatiq',
        description: plan.name,
        order_id: order.order_id,
        handler: async (response) => {
          try {
            await verifyPayment({
              plan_code: plan.code,
              username: values.username.trim(),
              password: values.password,
              email: values.email.trim() || null,
              full_name: values.full_name.trim() || null,
              org_name: values.org_name.trim() || null,
              dob: values.dob || null,
              accepted_terms: Boolean(values.accepted_terms),
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            clearSignupDraft();
            try {
              const token = await loginRequest(values.username.trim(), values.password);
              localStorage.setItem('token', token.access_token);
              navigate('/dashboard');
            } catch (loginErr) {
              pushToast({ type: 'error', message: getErrorMessage(loginErr, 'Unable to sign in after payment.') });
            }
          } catch (err) {
            pushToast({ type: 'error', message: getErrorMessage(err, 'Payment verification failed.') });
          }
        },
        theme: {
          color: '#f5c518',
        },
        prefill: {
          name: values.full_name || values.username,
          email: values.email || undefined,
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to start checkout.') });
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
        <p className="auth-chip">Plan Checkout</p>
        <h1>Set up your {plan?.name || 'plan'}.</h1>
        <p>
          {plan
            ? 'Complete payment to activate your workspace instantly.'
            : 'Choose a plan first, then finish signup and payment in one flow.'}
        </p>
        <div className="metrics-grid compact">
          <article className="metric-tile">
            <p>Plan</p>
            <strong>{plan?.name || 'Select plan'}</strong>
          </article>
          <article className="metric-tile">
            <p>Type</p>
            <strong>{plan?.plan_type || '--'}</strong>
          </article>
        </div>
        {!plan ? (
          <div className="panel" style={{ marginTop: '1rem' }}>
            <h3 className="panel-title">Available plans</h3>
            <div className="metrics-grid compact">
              {plans.map((item) => (
                <button
                  key={item.code}
                  type="button"
                  className="ghost-button"
                  onClick={() => navigate(`/signup?plan=${item.code}`)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <Link to="/pricing" className="ghost-button">Back to Pricing</Link>
      </section>

      <section className="auth-card entrance-rise">
        <div className="auth-card-mini-brand">
          <div className="auth-logo-mark">E</div>
          <div>
            <p className="auth-logo-kicker">Performance Intelligence</p>
            <strong>Edvatiq</strong>
          </div>
        </div>
        <h2>Create your account</h2>
        <p className="auth-helper">Create your account, verify your email, then activate your plan.</p>
        <div className="auth-flow-pills" aria-label="Signup steps">
          <span className={`auth-flow-pill ${showVerificationStep ? '' : 'active'}`}>Page 1</span>
          <span className={`auth-flow-pill ${showVerificationStep ? 'active' : ''}`}>Page 2</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
          {!showVerificationStep ? (
            <>
              <FormField label="Username" error={errors.username?.message}>
                <input
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'Username must be at least 3 characters' },
                  })}
                />
              </FormField>
              <FormField label="Password" error={errors.password?.message}>
                <input
                  type="password"
                  {...register('password', {
                    required: 'Password is required',
                    validate: {
                      hasLowercase: (value) => /[a-z]/.test(value) || 'Add at least one lowercase letter',
                      hasUppercase: (value) => /[A-Z]/.test(value) || 'Add at least one uppercase letter',
                      hasNumber: (value) => /\d/.test(value) || 'Add at least one number',
                      hasSymbol: (value) => /[^A-Za-z0-9]/.test(value) || 'Add at least one symbol',
                      minLength: (value) => value.length >= 8 || 'Use at least 8 characters',
                    },
                  })}
                />
              </FormField>
              <div className="auth-password-hint">
                Use 8+ characters with uppercase, lowercase, number, and symbol.
              </div>
              <FormField label="Full Name">
                <input {...register('full_name')} />
              </FormField>
              {plan?.plan_type === 'organization' ? (
                <FormField label="Organization Name" error={errors.org_name?.message}>
                  <input {...register('org_name', { required: 'Organization name is required' })} />
                </FormField>
              ) : null}
              <FormField label="Birthday">
                <input type="date" {...register('dob')} />
              </FormField>
              <FormField label="Email" error={errors.email?.message}>
                <div className="auth-inline-field">
                  <input type="email" {...register('email', { required: 'Email is required' })} />
                  <button
                    type="button"
                    className="ghost-button auth-inline-action"
                    onClick={handleSendCode}
                    disabled={
                      isSubmitting ||
                      sendingCode ||
                      availabilityLoading ||
                      !emailLooksValid ||
                      !availability.username_available ||
                      !availability.email_available
                    }
                  >
                    {sendingCode ? 'Sending...' : 'Verify Email'}
                  </button>
                </div>
              </FormField>
              {availabilityLoading ? <p className="auth-availability-note">Checking availability...</p> : null}
            </>
          ) : null}
          {showVerificationStep ? (
            sendingCode ? (
              <div className="auth-step-card auth-step-card-loading entrance-rise">
                <div className="auth-step-loader" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <p>Preparing verification...</p>
              </div>
            ) : (
              <div className="auth-step-card entrance-rise">
                <div className="auth-step-head">
                  <span>{emailVerified ? 'Verified email' : 'Enter verification code'}</span>
                  <button
                    type="button"
                    className="ghost-button auth-inline-edit"
                    onClick={() => {
                      setSignupDraft((prev) => ({
                        ...prev,
                        sentEmail: '',
                        verifiedEmail: '',
                        form: {
                          ...prev.form,
                          email_code: '',
                          accepted_terms: false,
                        },
                      }));
                      setValue('email_code', '');
                    }}
                  >
                    Edit details
                  </button>
                </div>
                <div className="auth-summary-row">
                  <span>{normalizedEmail}</span>
                  {emailVerified ? <span className="auth-inline-status verified">Verified</span> : null}
                </div>
                {!emailVerified ? (
                  <>
                    <FormField label="Verification Code">
                      <input className="code-input" {...register('email_code')} placeholder="123456" />
                    </FormField>
                    <div className="verify-actions">
                      <button type="button" className="ghost-button" onClick={handleSendCode} disabled={isSubmitting || sendingCode}>
                        Resend code
                      </button>
                      <button
                        type="button"
                        className="primary-button"
                        onClick={handleVerifyCode}
                        disabled={isSubmitting || emailVerified || verifyingCode}
                      >
                        {verifyingCode ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="check-field auth-terms-check">
                      <input
                        type="checkbox"
                        {...register('accepted_terms', {
                          validate: (value) => value || 'Please accept the terms and conditions',
                        })}
                      />
                      <span>
                        I accept the <Link to="/terms" target="_blank" rel="noreferrer">terms and conditions</Link>.
                      </span>
                    </label>
                    {errors.accepted_terms?.message ? (
                      <p className="field-error">{errors.accepted_terms.message}</p>
                    ) : null}
                    <button type="submit" className="primary-button" disabled={isSubmitting || !acceptedTerms}>
                      {isSubmitting ? 'Starting checkout...' : 'Pay & Activate'}
                    </button>
                  </>
                )}
              </div>
            )
          ) : null}
        </form>
        <div className="auth-links">
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
      </section>
    </div>
  );
}
