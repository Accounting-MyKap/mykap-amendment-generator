
import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { ExcelRow, ColumnConfig } from '../types';
import { formatCurrency, formatPercent, formatDate } from '../services/pdfService';

interface TablePreviewProps {
  data: ExcelRow[];
  columns: ColumnConfig[];
  highlightedRows: Set<number>;
  onToggleHighlight: (index: number) => void;
}

export const TablePreview: React.FC<TablePreviewProps> = ({ 
  data, 
  columns, 
  highlightedRows, 
  onToggleHighlight 
}) => {
  const visibleColumns = columns.filter(c => c.visible);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <FileSpreadsheet size={28} className="text-slate-400" />
        </div>
        <h4 className="text-sm font-semibold text-slate-700 mb-1">Sin datos cargados</h4>
        <p className="text-xs text-slate-400 max-w-xs">
          Sube un archivo Excel (.xlsx) usando el área de carga para ver la vista previa aquí.
        </p>
      </div>
    );
  }

  const getFormattedValue = (key: string, value: any) => {
    if (key === 'Interest Rate' || key === 'Percent Owned') {
      return formatPercent(value);
    }
    if (key === 'Loan Balance' || key === 'Regular Payment') {
      return formatCurrency(value);
    }
    if (key === 'Maturity Date' || key === 'Next Payment Date' || key === 'Interest Paid To Date') {
      return formatDate(value);
    }
    return value !== undefined ? String(value) : '-';
  };

  return (
    <div className="overflow-x-auto rounded-md bg-white">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-white uppercase bg-blue-700">
          <tr>
            <th className="px-4 py-3 w-10">#</th>
            {visibleColumns.map((col) => (
              <th key={col.key} className="px-4 py-3 whitespace-nowrap">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr
              key={index}
              className={`border-b border-slate-100 cursor-pointer transition-colors border-l-2
                ${highlightedRows.has(index)
                  ? 'bg-amber-50 border-l-amber-400'
                  : 'hover:bg-slate-50 border-l-transparent'}`}
              onClick={() => onToggleHighlight(index)}
            >
              <td className="px-4 py-3 text-center">
                <input
                  type="checkbox"
                  checked={highlightedRows.has(index)}
                  onChange={() => onToggleHighlight(index)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </td>
              {visibleColumns.map((col) => (
                <td key={`${index}-${col.key}`} className="px-4 py-3 whitespace-nowrap text-slate-700">
                  {getFormattedValue(col.key, row[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
