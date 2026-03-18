export default function StatCard({ label, value, hint, icon }) {
  return (
    <article className="stat-card entrance-rise">
      <div className="stat-head">
        <p>{label}</p>
        <span>{icon}</span>
      </div>
      <h3>{value}</h3>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}
