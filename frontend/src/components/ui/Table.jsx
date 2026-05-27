import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import './Table.css';

export default function Table({ columns, data, renderRow, sortBy, sortOrder, onSort }) {
  return (
    <div className="table-wrapper">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => {
              const sortKey = col.sortKey || col.key;
              const isSortable = onSort && col.sortable !== false && col.key !== 'actions';
              const isActive = isSortable && sortBy === sortKey;
              const SortIcon = !isActive ? ArrowUpDown : sortOrder === 'asc' ? ArrowUp : ArrowDown;

              return (
                <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {isSortable ? (
                    <button
                      type="button"
                      className={`table__sort ${isActive ? 'table__sort--active' : ''}`}
                      onClick={() => onSort(sortKey)}
                      aria-label={`Sort by ${col.label}`}
                    >
                      <span>{col.label}</span>
                      <SortIcon size={14} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table__empty">
                No data found
              </td>
            </tr>
          ) : (
            data.map((item, idx) => renderRow(item, idx))
          )}
        </tbody>
      </table>
    </div>
  );
}
