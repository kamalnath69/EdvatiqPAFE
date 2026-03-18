import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { usePolicy } from '../hooks/usePolicy';

export default function Terms() {
  const { data, loading } = usePolicy('terms');
  const title = data?.title || 'Terms & Conditions';
  const updatedLabel = data?.updated_at
    ? `Updated ${new Date(data.updated_at * 1000).toLocaleDateString()}`
    : 'Updated March 17, 2026';
  const paragraphs = useMemo(() => {
    if (data?.body) {
      return data.body.split(/\n\n+/g);
    }
    return [
      "By using Edvatiq, you agree to follow your organization's training guidelines and to use the platform responsibly.",
      'Subscription plans are billed monthly. You may cancel at any time. Data remains accessible to your organization administrators per plan policy.',
      'Edvatiq provides coaching insights but does not replace professional medical advice.',
    ];
  }, [data]);

  return (
    <div className="legal-shell">
      <header className="legal-head">
        <div>
          <h2>{title}</h2>
          <p>{updatedLabel}</p>
        </div>
        <Link className="ghost-button" to="/">Back to Home</Link>
      </header>
      <section className="panel legal-card">
        {loading && !data ? <p>Loading policy...</p> : null}
        {!loading && paragraphs.map((text) => (
          <p key={text}>{text}</p>
        ))}
      </section>
    </div>
  );
}
