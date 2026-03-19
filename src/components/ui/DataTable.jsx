import EmptyState from './EmptyState';

export default function DataTable({
  title,
  columns,
  rows,
  emptyText,
  emptyActionLabel,
  emptyActionHref,
  onRowClick = null,
  selectedRowId = '',
}) {
  return (
    <section className="panel">
      {title ? <h2 className="panel-title">{title}</h2> : null}
      {!rows?.length ? (
        <EmptyState
          title="No records yet"
          description={emptyText || 'Data will appear here.'}
          actionLabel={emptyActionLabel}
          actionHref={emptyActionHref}
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className={onRowClick ? `table-row-clickable ${selectedRowId === (row.id || idx) ? 'selected' : ''}` : ''}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
