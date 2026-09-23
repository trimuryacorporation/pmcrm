import { Eye, Pencil, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge.jsx';

function renderValue(row, key) {
  const value = row[key];
  if (key.toLowerCase().includes('status') || key === 'priority') return <StatusBadge value={value} />;
  if (key === 'progress' || key === 'currentWorkload') {
    return (
      <div className="min-w-32">
        <div className="mb-1 flex justify-between text-xs">
          <span>{value || 0}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-indigo-600" style={{ width: `${value || 0}%` }} />
        </div>
      </div>
    );
  }
  if (Array.isArray(value)) return value.length;
  return value ?? '-';
}

export default function DataTable({ rows, columns, basePath, onEdit, onDelete, empty = 'No records found.' }) {
  if (!rows?.length) {
    return <div className="card grid min-h-64 place-items-center p-8 text-center text-slate-500">{empty}</div>;
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((col) => (
                <th key={col} className="whitespace-nowrap px-4 py-3 text-left font-semibold capitalize text-slate-600">
                  {col.replace(/([A-Z])/g, ' $1')}
                </th>
              ))}
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={row._id} className="hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col} className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {renderValue(row, col)}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link to={`${basePath}/${row._id}`} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white" title="View">
                      <Eye className="h-4 w-4" />
                    </Link>
                    {onEdit && <button onClick={() => onEdit(row)} className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white" title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>}
                    {onDelete && <button onClick={() => onDelete(row)} className="rounded-lg border border-slate-200 p-2 text-rose-600 hover:bg-rose-50" title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
