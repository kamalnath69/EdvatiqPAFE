export default function SessionHistory({ sessions }) {
  return (
    <div className="mt-4">
      <h2 className="text-xl font-semibold mb-2">Session History</h2>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Student
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Sport
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Feedback
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sessions?.map((s, idx) => (
            <tr key={s._id || `${s.student}-${s.sport}-${idx}`}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {new Date(s.timestamp * 1000).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {s.student}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {s.sport}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {s.feedback?.join(', ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
