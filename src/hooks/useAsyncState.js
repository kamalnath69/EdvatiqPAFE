import { useCallback, useState } from 'react';
import { getErrorMessage } from '../services/httpError';

export function useAsyncState(initialValue) {
  const [data, setData] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async (fn, options = {}) => {
    const { setPending = true } = options;
    if (setPending) setLoading(true);
    setError('');
    try {
      const result = await fn();
      setData(result);
      return result;
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      if (setPending) setLoading(false);
    }
  }, []);

  return { data, setData, loading, error, setError, run };
}
