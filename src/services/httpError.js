export function getErrorMessage(err, fallback = 'Request failed. Please try again.') {
  const detail = err?.response?.data?.detail;
  if (typeof detail === 'string' && detail.trim()) return detail;
  if (Array.isArray(detail) && detail.length) {
    const first = detail[0];
    if (typeof first?.msg === 'string') return first.msg;
  }
  const status = err?.response?.status;
  if (status === 401) return 'Session expired or unauthorized access. Please sign in again.';
  if (status === 403) return 'You do not have permission for this action.';
  if (status === 404) return 'Requested resource was not found.';
  if (status && status >= 500) return 'Server error. Please retry in a moment.';
  return err?.message || fallback;
}

