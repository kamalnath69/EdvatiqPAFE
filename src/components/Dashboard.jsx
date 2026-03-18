import { useEffect, useState } from 'react';
import api from '../api';

export default function Dashboard() {
  const [academies, setAcademies] = useState([]);

  useEffect(() => {
    async function fetch() {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const resp = await api.get('/academies/', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAcademies(resp.data);
      } catch (err) {
        console.error(err);
      }
    }
    fetch();
  }, []);

  return (
    <div className="dashboard">
      <h2>Academies</h2>
      <ul>
        {academies.map((a) => (
          <li key={a.academy_id || a.name}>{a.name}</li>
        ))}
      </ul>
    </div>
  );
}
