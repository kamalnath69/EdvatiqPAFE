export default function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <p>{title}</p>
      <small>{description}</small>
    </div>
  );
}
