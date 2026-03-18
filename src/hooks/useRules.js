import { useCallback, useState } from 'react';
import { getRules, overrideRules } from '../services/rulesApi';
import { getErrorMessage } from '../services/httpError';

export function useRules() {
  const [rules, setRules] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRules = useCallback(async (username, sport) => {
    setLoading(true);
    setError('');
    try {
      const data = await getRules(username, sport);
      setRules(data);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to fetch rules.'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const saveOverride = useCallback(async (username, sport, payload) => {
    setLoading(true);
    setError('');
    try {
      const data = await overrideRules(username, sport, payload);
      setRules(data.rules || payload);
      return data;
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save override.'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { rules, loading, error, fetchRules, saveOverride, setRules };
}
