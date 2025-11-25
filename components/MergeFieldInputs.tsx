import React from 'react';
import { MergeField, MergeFieldValues } from '../types';

interface MergeFieldInputsProps {
    fields: MergeField[];
    values: MergeFieldValues;
    onChange: (key: string, value: string) => void;
}

export const MergeFieldInputs: React.FC<MergeFieldInputsProps> = ({
    fields,
    values,
    onChange
}) => {
    if (fields.length === 0) return null;

    return (
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-5 mb-6">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                📝 Completar Datos del Documento
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fields.map(field => (
                    <div key={field.id}>
                        <label className="block text-xs font-medium text-blue-700 uppercase mb-1">
                            {field.label}
                        </label>
                        <input
                            type="text"
                            value={values[field.key] || ''}
                            onChange={(e) => onChange(field.key, e.target.value)}
                            placeholder={`Valor para ${field.label}`}
                            className="w-full rounded-md border-blue-200 bg-white p-2 text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
