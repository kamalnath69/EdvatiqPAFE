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
            if (column.searchable === false || column.key === 'actions') return false;
            const value = getCellValue(row, column);
            return String(value ?? '')
              .toLowerCase()
              .includes(term);
          })
        );
    if (!sort.key) return nextRows;
    const sortColumn = columns.find((column) => column.key === sort.key) || { key: sort.key };
    if (sortColumn.sortable === false || sortColumn.key === 'actions') return nextRows;
    nextRows.sort((a, b) => {
      const left = getCellValue(a, sortColumn);
      const right = getCellValue(b, sortColumn);
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
  const visibleColumns = hasBulk ? columns.length + 1 : columns.length;
  const hasRows = Boolean(rows?.length);
  const hasFilteredRows = Boolean(filteredRows.length);

  function toggleSort(key) {
    const sortColumn = columns.find((column) => column.key === key);
    if (!sortColumn || sortColumn.sortable === false || key === 'actions') return;
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
    <section className="panel data-table-panel">
      {(title || hasRows) ? (
        <div className="panel-header table-panel-header">
          <div>
            {title ? <h2 className="panel-title">{title}</h2> : null}
            <p className="panel-subtitle">
              {hasRows
                ? `${filteredRows.length} record${filteredRows.length === 1 ? '' : 's'} ready for review.`
                : 'Data will appear here once records are created.'}
            </p>
          </div>
          {hasRows ? (
            <div className="table-summary-pills">
              <span className="status-badge neutral">Rows {filteredRows.length}</span>
              <span className="status-badge neutral">Page {Math.min(page, totalPages)} of {totalPages}</span>
            </div>
          ) : null}
        </div>
      ) : null}
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
      ) : !hasRows ? (
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
              className="table-toolbar-input"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder={searchPlaceholder}
            />
            <div className="table-toolbar-meta">
              <span className="status-badge neutral">Filtered {filteredRows.length}</span>
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
                      {column.sortable === false || column.key === 'actions' ? (
                        <span className="table-column-label">{column.label}</span>
                      ) : (
                        <button type="button" className="table-sort-button" onClick={() => toggleSort(column.key)}>
                          <span>{column.label}</span>
                          <ArrowDownUp size={13} />
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hasFilteredRows ? (
                  pageRows.map((row, idx) => (
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={visibleColumns} className="table-empty-cell">
                      No rows match the current filters.
                    </td>
                  </tr>
                )}
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
