import { useEffect, useState } from 'react';
import api from '../api';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export default function AcademyList() {
  const [academies, setAcademies] = useState([]);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    if (!token) return;
    api.get('/academies/', { headers: { Authorization: `Bearer ${token}` } })
      .then((resp) => setAcademies(resp.data))
      .catch(console.error);
  }, [token]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Academies</h2>
      <ul className="list-disc list-inside">
        {academies.map((a) => (
          <li key={a.academy_id || a.name}>{a.name}</li>
        ))}
      </ul>
    </div>
  );
}
