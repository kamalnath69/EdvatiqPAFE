import clsx from 'clsx';

const roleTone = {
  admin: 'danger',
  academy_admin: 'primary',
  academyAdmin: 'primary',
  staff: 'success',
  student: 'neutral',
};

export default function StatusBadge({ value }) {
  const tone = roleTone[value] || 'neutral';
  return <span className={clsx('status-badge', tone)}>{String(value).replace('_', ' ')}</span>;
}
