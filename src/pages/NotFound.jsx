import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="legal-shell">
      <header className="legal-head">
        <div>
          <h2>Page not found</h2>
          <p>The page you requested does not exist or may have moved.</p>
        </div>
        <Link className="ghost-button" to="/">Back to Home</Link>
      </header>
      <section className="panel legal-card">
        <p>Try returning to the landing page, checking pricing, or signing in to your dashboard.</p>
        <div className="auth-actions">
          <Link className="primary-button" to="/">Go Home</Link>
          <Link className="ghost-button" to="/pricing">View Plans</Link>
          <Link className="ghost-button" to="/support">Get Support</Link>
        </div>
      </section>
    </div>
  );
}
