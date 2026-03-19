import { Link } from 'react-router-dom';

export default function EmptyState({ title, description, actionLabel, actionHref }) {
  return (
    <div className="empty-state">
      <p>{title}</p>
      <small>{description}</small>
      {actionLabel && actionHref ? (
        <div className="empty-state-actions">
          <Link className="ghost-button" to={actionHref}>
            {actionLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
