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

const PLAN_ROWS = [
  ['Live posture tracking', 'Yes', 'Yes', 'Yes', 'Yes'],
  ['Session history + scoring', 'Yes', 'Yes', 'Yes', 'Yes'],
  ['AI coach chat', '-', 'Yes', '-', 'Yes'],
  ['Student + staff management', '-', '-', 'Yes', 'Yes'],
  ['Advanced analytics', '-', 'Yes', '-', 'Yes'],
];

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

      <section className="pricing-section">
        <div className="pricing-compare-card">
          <div className="section-head compact">
            <span className="section-kicker">Comparison</span>
            <h3>Choose the right level of capability</h3>
            <p>Use Pro tiers for AI-led workflows and organization tiers for team management.</p>
          </div>
          <div className="plan-compare-table">
            <div className="plan-compare-head">
              <span>Capability</span>
              <span>Personal Basic</span>
              <span>Personal Pro</span>
              <span>Org Basic</span>
              <span>Org Pro</span>
            </div>
            {PLAN_ROWS.map((row) => (
              <div key={row[0]} className="plan-compare-row">
                {row.map((cell, index) => (
                  <span key={`${row[0]}-${index}`}>{cell}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pricing-section pricing-assurance-grid">
        <article className="pricing-assurance-card">
          <h3>What buyers expect</h3>
          <ul>
            <li><CheckCircle2 size={16} />Clear role-based access for admins, staff, and athletes</li>
            <li><CheckCircle2 size={16} />Visible legal pages and support channels</li>
            <li><CheckCircle2 size={16} />A guided path from demo to rollout</li>
          </ul>
        </article>
        <article className="pricing-assurance-card">
          <h3>Best fit for INR 999+</h3>
          <p>Choose Pro when you want the platform to act like a daily coaching system, not just a tracking utility.</p>
          <div className="cta-actions">
            <Link className="primary-button" to="/book-demo">Book a Demo</Link>
            <Link className="ghost-button" to="/support">Talk to Support</Link>
          </div>
        </article>
      </section>
    </div>
  );
}

