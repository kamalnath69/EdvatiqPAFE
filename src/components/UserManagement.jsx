import { useEffect, useState } from 'react';
import api from '../api';
import { useAuthUser } from '../hooks/useAuthUser';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const { token } = useAuthUser();

  useEffect(() => {
    if (!token) return;
    api.get('/users', { headers: { Authorization: `Bearer ${token}` } })
      .then((resp) => setUsers(resp.data))
      .catch(console.error);
  }, [token]);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Users</h2>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((u) => (
            <tr key={u.username}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {u.username}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {u.role}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
