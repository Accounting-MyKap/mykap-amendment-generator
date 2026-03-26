import React, { useState } from 'react';
import { Plus, Trash2, Copy } from 'lucide-react';
import { Button } from './Button';
import { MergeField, Template } from '../types';
import { useToast } from './Toast';

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
    const { showToast } = useToast();

    const handleAdd = () => {
        if (!newLabel.trim()) return;
        onAddField(newLabel);
        setNewLabel('');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast({ type: 'info', title: 'Copiado', message: `${text} copiado al portapapeles.`, duration: 2000 });
    };

    return (
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 mb-4">
                Campos Personalizados (Merge Fields)
            </h2>

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="Nuevo campo (ej: Nombre Cliente)"
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors placeholder:text-slate-400"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <Button onClick={handleAdd} size="sm" disabled={!newLabel.trim()}>
                    <Plus size={16} />
                </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
                {fields.length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-4">
                        No hay campos creados aún.
                    </p>
                )}
                {fields.map(field => {
                    const isAllowed = currentTemplate?.allowedMergeFieldIds?.includes(field.id) ?? true;

                    return (
                        <div key={field.id} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-md border border-slate-100 group">
                            <div className="flex items-center gap-2.5">
                                {onToggleFieldForTemplate && (
                                    <input
                                        type="checkbox"
                                        checked={isAllowed}
                                        onChange={() => onToggleFieldForTemplate(field.id)}
                                        className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                                        title="Mostrar en esta plantilla"
                                    />
                                )}
                                <div className="flex flex-col">
                                    <span className={`text-sm font-medium ${isAllowed ? 'text-slate-700' : 'text-slate-400'}`}>
                                        {field.label}
                                    </span>
                                    <code className="text-xs text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-0.5">
                                        {field.key}
                                    </code>
                                </div>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => copyToClipboard(field.key)}
                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                    title="Copiar código"
                                >
                                    <Copy size={14} />
                                </button>
                                <button
                                    onClick={() => onRemoveField(field.id)}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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
