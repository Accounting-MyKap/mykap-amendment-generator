import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { Button } from './Button';
import { MergeField, Template } from '../types';

interface MergeFieldManagerProps {
    fields: MergeField[];
    currentTemplate?: Template;
    onAddField: (label: string) => void;
    onRemoveField: (id: string) => void;
    onToggleFieldForTemplate?: (fieldId: string) => void;
}

export const MergeFieldManager: React.FC<MergeFieldManagerProps> = ({
    fields,
    currentTemplate,
    onAddField,
    onRemoveField,
    onToggleFieldForTemplate
}) => {
    const [newLabel, setNewLabel] = useState('');

    const handleAdd = () => {
        if (!newLabel.trim()) return;
        onAddField(newLabel);
        setNewLabel('');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        // Could add a toast here, but for now simple is fine
    };

    return (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-500">
                Campos Personalizados (Merge Fields)
            </h2>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Nuevo campo (ej: Nombre Cliente)"
                    className="flex-1 rounded-md border-transparent bg-slate-100 p-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd} size="sm" disabled={!newLabel.trim()}>
                    <Plus size={16} />
                </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
                {fields.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-2">
                        No hay campos creados.
                    </p>
                )}
                {fields.map(field => {
                    const isAllowed = currentTemplate?.allowedMergeFieldIds?.includes(field.id) ?? true;

                    return (
                        <div key={field.id} className="flex items-center justify-between bg-slate-50 p-2 rounded-md border border-slate-100 group">
                            <div className="flex items-center gap-2">
                                {onToggleFieldForTemplate && (
                                    <input
                                        type="checkbox"
                                        checked={isAllowed}
                                        onChange={() => onToggleFieldForTemplate(field.id)}
                                        className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        title="Mostrar en esta plantilla"
                                    />
                                )}
                                <div className="flex flex-col">
                                    <span className={`text-sm font-medium ${isAllowed ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {field.label}
                                    </span>
                                    <code className="text-xs text-blue-600 font-mono bg-blue-50 px-1 rounded w-fit mt-0.5">
                                        {field.key}
                                    </code>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => copyToClipboard(field.key)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                    title="Copiar código"
                                >
                                    <Copy size={14} />
                                </button>
                                <button
                                    onClick={() => onRemoveField(field.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Eliminar campo"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};
