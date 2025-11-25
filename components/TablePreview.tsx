
import React from 'react';
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
      <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50 text-slate-500">
        No data to display. Please upload an Excel file.
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
        <thead className="text-xs text-white uppercase bg-blue-600">
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
              className={`border-b border-slate-100 hover:bg-slate-50 ${highlightedRows.has(index) ? 'bg-yellow-50' : ''}`}
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
