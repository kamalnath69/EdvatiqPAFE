import { useEffect, useState } from 'react';
import FormField from './ui/FormField';
import { usePolicy } from '../hooks/usePolicy';
import { updatePolicy } from '../services/policyApi';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../services/httpError';

function PolicyCard({ policyKey, fallbackTitle }) {
  const { data, loading, error, refresh } = usePolicy(policyKey);
  const { pushToast } = useToast();
  const [values, setValues] = useState({ title: fallbackTitle, body: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setValues({
        title: data.title || fallbackTitle,
        body: data.body || '',
      });
    }
  }, [data, fallbackTitle]);

  useEffect(() => {
    if (!error) return;
    pushToast({ type: 'error', message: error });
  }, [error, pushToast]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updatePolicy(policyKey, values);
      pushToast({ type: 'success', message: 'Policy updated.' });
      await refresh();
    } catch (err) {
      pushToast({ type: 'error', message: getErrorMessage(err, 'Unable to update policy.') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h3 className="panel-title">{fallbackTitle}</h3>
          <p className="panel-subtitle">
            {data?.updated_at ? `Updated ${new Date(data.updated_at * 1000).toLocaleString()}` : 'Update policy content'}
          </p>
        </div>
      </div>
      <form className="form-grid" onSubmit={handleSave}>
        <FormField label="Title">
          <input value={values.title} onChange={handleChange('title')} />
        </FormField>
        <FormField label="Body">
          <textarea rows={8} value={values.body} onChange={handleChange('body')} />
        </FormField>
        <button type="submit" className="primary-button" disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save Policy'}
        </button>
      </form>
    </section>
  );
}

export default function PolicyManager() {
  return (
    <div className="panel-grid">
      <PolicyCard policyKey="privacy" fallbackTitle="Privacy Policy" />
      <PolicyCard policyKey="terms" fallbackTitle="Terms & Conditions" />
    </div>
  );
}
