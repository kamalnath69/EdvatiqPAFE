import { useEffect, useState } from 'react';
import { listPlans, updatePlanFeatures } from '../services/billingApi';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/httpError';
import FormField from './ui/FormField';

function normalizePlan(plan) {
  return {
    ...plan,
    featuresText: (plan.features || []).join('\n'),
  };
}

export default function PlanManager() {
  const [plans, setPlans] = useState([]);
  const [savingCode, setSavingCode] = useState('');
  const { pushToast } = useToast();

  useEffect(() => {
    async function load() {
      try {
        const data = await listPlans();
        setPlans((data || []).map(normalizePlan));
      } catch (err) {
        pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to load plan settings.') });
      }
    }
    load();
  }, [pushToast]);

  const updatePlan = (code, updates) => {
    setPlans((prev) =>
      prev.map((plan) => (plan.code === code ? { ...plan, ...updates } : plan))
    );
  };

  const handleSave = async (plan) => {
    setSavingCode(plan.code);
    try {
      const features = (plan.featuresText || '')
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
      const payload = {
        description: plan.description || '',
        features,
        ai_chat: Boolean(plan.ai_chat),
        ai_analytics: Boolean(plan.ai_analytics),
      };
      const saved = await updatePlanFeatures(plan.code, payload);
      updatePlan(plan.code, normalizePlan(saved));
      pushToast({ type: 'success', message: `${plan.name} updated.` });
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to update plan features.') });
    } finally {
      setSavingCode('');
    }
  };

  if (!plans.length) {
    return <p className="help-text">Loading plan configuration...</p>;
  }

  return (
    <div className="panel-grid">
      {plans.map((plan) => (
        <section key={plan.code} className="panel">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">{plan.name}</h3>
              <p className="panel-subtitle">
                {plan.plan_type} · {plan.tier} · INR {plan.amount_inr?.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <div className="form-grid">
            <FormField label="Description">
              <input
                value={plan.description || ''}
                onChange={(event) => updatePlan(plan.code, { description: event.target.value })}
              />
            </FormField>
            <FormField label="Feature List (one per line)">
              <textarea
                rows={6}
                value={plan.featuresText || ''}
                onChange={(event) => updatePlan(plan.code, { featuresText: event.target.value })}
              />
            </FormField>
            <div className="form-inline">
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={Boolean(plan.ai_chat)}
                  onChange={(event) => updatePlan(plan.code, { ai_chat: event.target.checked })}
                />
                <span>Enable AI Coach (chat)</span>
              </label>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={Boolean(plan.ai_analytics)}
                  onChange={(event) => updatePlan(plan.code, { ai_analytics: event.target.checked })}
                />
                <span>Enable AI Analytics (session intelligence)</span>
              </label>
            </div>
            <button
              type="button"
              className="primary-button"
              onClick={() => handleSave(plan)}
              disabled={savingCode === plan.code}
            >
              {savingCode === plan.code ? 'Saving...' : 'Save Plan'}
            </button>
          </div>
        </section>
      ))}
    </div>
  );
}
