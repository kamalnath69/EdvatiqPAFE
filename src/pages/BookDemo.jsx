import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { createDemoLead } from '../services/leadsApi';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/httpError';

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?auto=format&fit=crop&w=1200&q=80';

export default function BookDemo() {
  const [submitted, setSubmitted] = useState(false);
  const { pushToast } = useToast();
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      email: '',
      organization: '',
      role: '',
      team_size: '',
      timeline: '',
      goals: '',
      preferred_contact: '',
    },
  });

  const onSubmit = async (values) => {
    try {
      await createDemoLead(values);
      setSubmitted(true);
      pushToast({ type: 'success', message: 'Demo request submitted successfully.' });
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to submit demo request.') });
    }
  };

  const handleImageError = (event) => {
    if (event.currentTarget.dataset.fallback === '1') return;
    event.currentTarget.dataset.fallback = '1';
    event.currentTarget.src = FALLBACK_IMAGE;
  };

  return (
    <div className="lead-shell">
      <header className="lead-head">
        <div>
          <h2>Book a Demo</h2>
          <p>Tell us about your team and we will schedule a tailored walkthrough.</p>
        </div>
        <Link className="ghost-button" to="/">Back to Home</Link>
      </header>
      <div className="lead-grid">
        <section className="lead-info">
          <img
            src="https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&w=1200&q=80"
            alt="Coach reviewing athlete performance"
            loading="lazy"
            onError={handleImageError}
          />
          <div className="lead-info-card">
            <h3>What you will see</h3>
            <ul>
              <li>Live posture tracking and corrections</li>
              <li>Session intelligence and best-rep insights</li>
              <li>Admin workflows for teams and academies</li>
            </ul>
          </div>
        </section>
        <section className="panel lead-card">
          {submitted ? (
            <div className="lead-success">
              <h3>Request received</h3>
              <p>Our team will reach out within 24 hours to schedule your demo.</p>
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
              <label className="field">
                <span className="field-label">Organization</span>
                <input {...register('organization')} />
              </label>
              <div className="form-inline">
                <label className="field">
                  <span className="field-label">Role</span>
                  <input {...register('role')} placeholder="Coach, owner, manager" />
                </label>
                <label className="field">
                  <span className="field-label">Team Size</span>
                  <input {...register('team_size')} placeholder="10-20" />
                </label>
              </div>
              <div className="form-inline">
                <label className="field">
                  <span className="field-label">Timeline</span>
                  <select {...register('timeline')}>
                    <option value="">Select timeline</option>
                    <option value="this_month">This month</option>
                    <option value="next_month">Next month</option>
                    <option value="this_quarter">This quarter</option>
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Preferred Contact</span>
                  <select {...register('preferred_contact')}>
                    <option value="">Select</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </label>
              </div>
              <label className="field">
                <span className="field-label">Goals</span>
                <textarea rows={4} {...register('goals')} placeholder="Tell us what you want to improve." />
              </label>
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Request Demo'}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
