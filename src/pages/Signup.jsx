import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { createOrder, listPlans, verifyPayment } from '../services/billingApi';
import { loginRequest, requestSignupVerification, verifySignupEmail } from '../services/authApi';
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
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const planCode = query.get('plan') || '';
  const plan = plans.find((p) => p.code === planCode);
  const lastEmailRef = useRef('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      username: '',
      password: '',
      email: '',
      email_code: '',
      full_name: '',
      org_name: '',
    },
  });

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

  const watchedEmail = watch('email');
  useEffect(() => {
    if (lastEmailRef.current && lastEmailRef.current !== watchedEmail) {
      setEmailSent(false);
      setEmailVerified(false);
      setValue('email_code', '');
    }
    lastEmailRef.current = watchedEmail;
  }, [watchedEmail, setValue]);

  const handleSendCode = async () => {
    const email = (watchedEmail || '').trim();
    if (!email) {
      pushToast({ type: 'info', message: 'Enter your email to receive a code.' });
      return;
    }
    try {
      await requestSignupVerification(email);
      setEmailSent(true);
      pushToast({ type: 'success', message: 'Verification code sent to your email.' });
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to send verification code.') });
    }
  };

  const handleVerifyCode = async () => {
    const email = (watchedEmail || '').trim();
    const code = (watch('email_code') || '').trim();
    if (!email || !code) {
      pushToast({ type: 'info', message: 'Enter email and verification code.' });
      return;
    }
    try {
      await verifySignupEmail(email, code);
      setEmailVerified(true);
      pushToast({ type: 'success', message: 'Email verified. You can proceed to payment.' });
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Invalid or expired code.') });
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
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            try {
              const token = await loginRequest(values.username.trim(), values.password);
              localStorage.setItem('token', token.access_token);
              navigate('/dashboard');
            } catch (loginErr) {
              const detail = loginErr?.response?.data?.detail || '';
              if (typeof detail === 'string' && detail.toLowerCase().includes('email not verified')) {
                try {
                  await requestEmailVerification(values.username.trim());
                } catch {
                  // ignore resend failures
                }
                pushToast({ type: 'info', message: 'Email verification required. Code sent to your inbox.' });
                navigate(`/verify-email?identity=${encodeURIComponent(values.username.trim())}`);
                return;
              }
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
        <p className="auth-chip">Plan Checkout</p>
        <h1>Set up your {plan?.name || 'plan'}.</h1>
        <p>Complete payment to activate your workspace instantly.</p>
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
        <Link to="/pricing" className="ghost-button">Back to Pricing</Link>
      </section>

      <section className="auth-card entrance-rise">
        <h2>Create your account</h2>
        <p className="auth-helper">Purchaser becomes Academy Admin for organization plans.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="form-grid">
          <FormField label="Username" error={errors.username?.message}>
            <input {...register('username', { required: 'Username is required' })} />
          </FormField>
          <FormField label="Password" error={errors.password?.message}>
            <input type="password" {...register('password', { required: 'Password is required' })} />
          </FormField>
          <FormField label="Full Name">
            <input {...register('full_name')} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <input type="email" {...register('email', { required: 'Email is required' })} />
          </FormField>
          <div className="verify-row">
            <FormField label="Verification Code">
              <input className="code-input" {...register('email_code')} placeholder="123456" />
            </FormField>
            <div className="verify-actions">
              <button type="button" className="ghost-button" onClick={handleSendCode} disabled={isSubmitting}>
                {emailSent ? 'Resend Code' : 'Send Code'}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleVerifyCode}
                disabled={isSubmitting || emailVerified}
              >
                {emailVerified ? 'Verified' : 'Verify Email'}
              </button>
            </div>
          </div>
          {!emailVerified ? (
            <div className="info-banner">Verify your email to continue checkout.</div>
          ) : (
            <div className="success-banner">Email verified. You can proceed to payment.</div>
          )}
          {plan?.plan_type === 'organization' ? (
            <FormField label="Organization Name" error={errors.org_name?.message}>
              <input {...register('org_name', { required: 'Organization name is required' })} />
            </FormField>
          ) : null}
          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Starting checkout...' : 'Pay & Activate'}
          </button>
        </form>
        <div className="auth-links">
          <Link to="/login">Already have an account? Sign in</Link>
        </div>
      </section>
    </div>
  );
}
