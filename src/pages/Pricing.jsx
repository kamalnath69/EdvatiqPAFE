import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { listPlans } from '../services/billingApi';
import { getErrorMessage } from '../services/httpError';
import { useToast } from '../hooks/useToast';

function formatPrice(amount) {
  if (!Number.isFinite(amount)) return '--';
  return `INR ${amount.toLocaleString('en-IN')}/mo`;
}

const FALLBACK_FEATURES = {
  personal_basic: ['Live posture tracking', 'Session history + scores', 'Core training analytics'],
  personal_pro: ['All Basic features', 'AI coach chat', 'AI session intelligence'],
  org_basic: ['Academy admin workspace', 'Staff + student management', 'Shared dashboards'],
  org_pro: ['All Org Basic features', 'AI coach chat', 'AI analytics suite'],
};

function getPlanFeatures(plan) {
  if (plan?.features?.length) return plan.features;
  return FALLBACK_FEATURES[plan?.code] || [];
}

export default function Pricing() {
  const [plans, setPlans] = useState([]);
  const { pushToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const data = await listPlans();
        setPlans(data || []);
      } catch (err) {
        pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to load plans.') });
        setPlans([]);
      }
    }
    load();
  }, [pushToast]);

  const grouped = {
    personal: plans.filter((p) => p.plan_type === 'personal'),
    organization: plans.filter((p) => p.plan_type === 'organization'),
  };

  return (
    <div className="pricing-shell">
      <header className="pricing-head">
        <Link to="/" className="ghost-button">Back to Home</Link>
        <div>
          <h2>Plans built for performance</h2>
          <p>Choose a personal plan or scale an academy with organization tiers.</p>
        </div>
        <Link to="/login" className="primary-button">Sign In</Link>
      </header>

      <section className="pricing-section">
        <h3>Personal Plans</h3>
        <div className="pricing-grid">
          {grouped.personal.map((plan) => (
            <article key={plan.code} className="pricing-card">
              <div>
                <p className="plan-tier">{plan.name}</p>
                <h4>{formatPrice(plan.amount_inr)}</h4>
                <p className="plan-subtitle">{plan.description || 'For individual athletes.'}</p>
              </div>
              <ul>
                {getPlanFeatures(plan).map((item) => (
                  <li key={item}><CheckCircle2 size={16} />{item}</li>
                ))}
              </ul>
              <Link className="primary-button" to={`/signup?plan=${plan.code}`}>Get Started</Link>
            </article>
          ))}
        </div>
      </section>

      <section className="pricing-section">
        <h3>Organization Plans</h3>
        <div className="pricing-grid">
          {grouped.organization.map((plan) => (
            <article key={plan.code} className="pricing-card">
              <div>
                <p className="plan-tier">{plan.name}</p>
                <h4>{formatPrice(plan.amount_inr)}</h4>
                <p className="plan-subtitle">{plan.description || 'For academies, studios, and teams.'}</p>
              </div>
              <ul>
                {getPlanFeatures(plan).map((item) => (
                  <li key={item}><CheckCircle2 size={16} />{item}</li>
                ))}
              </ul>
              <Link className="primary-button" to={`/signup?plan=${plan.code}`}>Start Organization</Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

