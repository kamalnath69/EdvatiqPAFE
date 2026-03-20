import { useMemo, useState } from 'react';
import { ArrowDownUp } from 'lucide-react';
import EmptyState from './EmptyState';

const PAGE_SIZE = 8;

function getCellValue(row, column) {
  if (column.sortValue) return column.sortValue(row);
  return row[column.key];
}

export default function DataTable({
  title,
  columns,
  rows,
  loading = false,
  emptyText,
  emptyActionLabel,
  emptyActionHref,
  onRowClick = null,
  selectedRowId = '',
  searchPlaceholder = 'Filter rows',
  bulkActions = [],
  initialSortKey = '',
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: initialSortKey || columns?.[0]?.key || '', direction: 'asc' });
  const [selectedIds, setSelectedIds] = useState([]);

  const filteredRows = useMemo(() => {
    const term = query.trim().toLowerCase();
    const nextRows = !term
      ? [...(rows || [])]
      : (rows || []).filter((row) =>
          columns.some((column) => {
            const value = getCellValue(row, column);
            return String(value ?? '')
              .toLowerCase()
              .includes(term);
          })
        );
    if (!sort.key) return nextRows;
    nextRows.sort((a, b) => {
      const left = getCellValue(a, columns.find((column) => column.key === sort.key) || { key: sort.key });
      const right = getCellValue(b, columns.find((column) => column.key === sort.key) || { key: sort.key });
      const leftText = String(left ?? '').toLowerCase();
      const rightText = String(right ?? '').toLowerCase();
      if (leftText === rightText) return 0;
      const comparison = leftText > rightText ? 1 : -1;
      return sort.direction === 'asc' ? comparison : -comparison;
    });
    return nextRows;
  }, [columns, query, rows, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasBulk = bulkActions.length > 0;

  function toggleSort(key) {
    setPage(1);
    setSort((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  }

  function toggleSelected(rowId) {
    setSelectedIds((prev) => (prev.includes(rowId) ? prev.filter((item) => item !== rowId) : [...prev, rowId]));
  }

  return (
    <section className="panel">
      {title ? <h2 className="panel-title">{title}</h2> : null}
      {loading ? (
        <div className="table-skeleton-wrap" aria-hidden="true">
          <div className="table-toolbar">
            <div className="table-skeleton-input shimmer-block" />
            <div className="table-toolbar-meta">
              <div className="table-skeleton-chip shimmer-block" />
            </div>
          </div>
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
                {Array.from({ length: 5 }).map((_, rowIdx) => (
                  <tr key={`skeleton-${rowIdx}`}>
                    {columns.map((column) => (
                      <td key={`${column.key}-${rowIdx}`}>
                        <div className="table-skeleton-cell shimmer-block" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : !rows?.length ? (
        <EmptyState
          title="No records yet"
          description={emptyText || 'Data will appear here.'}
          actionLabel={emptyActionLabel}
          actionHref={emptyActionHref}
        />
      ) : (
        <>
          <div className="table-toolbar">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
            />
            <div className="table-toolbar-meta">
              <span className="status-badge neutral">Rows: {filteredRows.length}</span>
              {hasBulk
                ? bulkActions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      className="ghost-button"
                      onClick={() => action.onClick(rows.filter((row) => selectedIds.includes(row.id)))}
                      disabled={!selectedIds.length}
                    >
                      {action.label}
                    </button>
                  ))
                : null}
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {hasBulk ? <th className="table-checkbox-cell" /> : null}
                  {columns.map((column) => (
                    <th key={column.key}>
                      <button type="button" className="table-sort-button" onClick={() => toggleSort(column.key)}>
                        <span>{column.label}</span>
                        <ArrowDownUp size={13} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, idx) => (
                  <tr
                    key={row.id || idx}
                    className={onRowClick ? `table-row-clickable ${selectedRowId === (row.id || idx) ? 'selected' : ''}` : ''}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                  >
                    {hasBulk ? (
                      <td
                        className="table-checkbox-cell"
                        onClick={(event) => {
                          event.stopPropagation();
                        }}
                      >
                        <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleSelected(row.id)} />
                      </td>
                    ) : null}
                    {columns.map((column) => (
                      <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-pagination">
            <button type="button" className="ghost-button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>
              Previous
            </button>
            <span className="status-badge neutral">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              className="ghost-button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}
