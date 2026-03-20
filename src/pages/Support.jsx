import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { createSupportLead } from '../services/leadsApi';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/httpError';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80';

export default function Support() {
  const [submitted, setSubmitted] = useState(false);
  const { pushToast } = useToast();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { name: '', email: '', topic: '', urgency: '', preferred_contact: '', message: '' },
  });

  const onSubmit = async (values) => {
    try {
      await createSupportLead(values);
      setSubmitted(true);
      pushToast({ type: 'success', message: 'Support request submitted.' });
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to submit support request.') });
    }
  };

  const handleImageError = (event) => {
    if (event.currentTarget.dataset.fallback === '1') return;
    event.currentTarget.dataset.fallback = '1';
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <div className="public-page-shell lead-shell">
      <section className="public-page-section public-page-hero">
        <header className="lead-head">
          <div>
            <span className="section-kicker">Customer Support</span>
            <h2>Support</h2>
            <p>Tell us what you need help with and our team will respond.</p>
          </div>
          <Link className="ghost-button" to="/">Back to Home</Link>
        </header>
      </section>
      <section className="public-page-section">
        <div className="lead-grid">
          <section className="lead-info">
            <img
              src="https://images.unsplash.com/photo-1521790797524-b2497295b8a0?auto=format&fit=crop&w=1200&q=80"
              alt="Support team assistance"
              loading="lazy"
              onError={handleImageError}
            />
            <div className="lead-info-card">
              <h3>We can help with</h3>
              <ul>
                <li>Account setup and onboarding</li>
                <li>Billing and plan questions</li>
                <li>Live coaching troubleshooting</li>
              </ul>
            </div>
          </section>
          <section className="panel lead-card">
            {submitted ? (
              <div className="lead-success">
                <h3>Request received</h3>
                <p>We will get back to you shortly.</p>
                <Link className="primary-button" to="/">Return to Home</Link>
              </div>
            ) : (
              <form className="form-grid form-grid-xl" onSubmit={handleSubmit(onSubmit)}>
                <label className="field">
                  <span className="field-label">Name</span>
                  <input {...register('name', { required: true })} />
                </label>
                <label className="field">
                  <span className="field-label">Email</span>
                  <input type="email" {...register('email', { required: true })} />
                </label>
                <div className="form-inline">
                  <label className="field">
                    <span className="field-label">Topic</span>
                    <input {...register('topic')} placeholder="Billing, onboarding, usage..." />
                  </label>
                  <label className="field">
                    <span className="field-label">Urgency</span>
                    <select {...register('urgency')}>
                      <option value="">Select</option>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>
                <label className="field">
                  <span className="field-label">Preferred Contact</span>
                  <select {...register('preferred_contact')}>
                    <option value="">Select</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Message</span>
                  <textarea rows={5} {...register('message', { required: true })} />
                </label>
                <button type="submit" className="primary-button" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Submit'}
                </button>
              </form>
            )}
          </section>
        </div>
      </section>
    </div>
  );
}
