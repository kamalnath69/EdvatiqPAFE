import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { usePolicy } from '../hooks/usePolicy';

export default function Privacy() {
  const { data, loading } = usePolicy('privacy');
  const title = data?.title || 'Privacy Policy';
  const updatedLabel = data?.updated_at
    ? `Updated ${new Date(data.updated_at * 1000).toLocaleDateString()}`
    : 'Updated March 17, 2026';
  const paragraphs = useMemo(() => {
    if (data?.body) {
      return data.body.split(/\n\n+/g);
    }
    return [
      'Edvatiq collects only the data needed to provide performance tracking, including account details, session metrics, and usage analytics.',
      'We do not sell personal information. Data is stored securely and only shared with authorized staff within your organization.',
      'You can request data export or deletion by contacting support.',
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
