import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FileUp, FileSpreadsheet, Printer, Plus, Settings, Save, Trash2 } from 'lucide-react';
import { Button } from './components/Button';
import { TablePreview } from './components/TablePreview';
import { generatePDF } from './services/pdfService';
import {
  Template,
  ExcelRow,
  ColumnConfig,
  DEFAULT_TEMPLATES,
  DEFAULT_COLUMNS,
  MergeField,
  MergeFieldValues
} from './types';
import { MergeFieldManager } from './components/MergeFieldManager';
import { MergeFieldInputs } from './components/MergeFieldInputs';

import {
  fetchTemplates,
  saveTemplate,
  deleteTemplate,
  fetchMergeFields,
  saveMergeField,
  deleteMergeField,
  uploadLetterhead,
  fetchLetterheadUrl
} from './services/dataService';

const App: React.FC = () => {
  // --- State ---
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [highlightedRows, setHighlightedRows] = useState<Set<number>>(new Set());
  const [letterhead, setLetterhead] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Form State
  const [formState, setFormState] = useState<Template>(DEFAULT_TEMPLATES[0]);

  // Merge Fields State
  const [mergeFields, setMergeFields] = useState<MergeField[]>([]);
  const [mergeFieldValues, setMergeFieldValues] = useState<MergeFieldValues>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  // --- Effects ---

  // Initial Data Load
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load Templates
        const loadedTemplates = await fetchTemplates();
        if (loadedTemplates.length > 0) {
          setTemplates(loadedTemplates);
          setSelectedTemplateId(loadedTemplates[0].id);
          setFormState(loadedTemplates[0]);
        } else {
          // Fallback if DB is empty, maybe save defaults?
          setTemplates(DEFAULT_TEMPLATES);
          setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
          setFormState(DEFAULT_TEMPLATES[0]);
        }

        // Load Merge Fields
        const loadedFields = await fetchMergeFields();
        setMergeFields(loadedFields);

        // Load Letterhead
        const url = await fetchLetterheadUrl();
        if (url) setLetterhead(url);

      } catch (error) {
        console.error("Failed to load initial data", error);
        alert("Error cargando datos. Revisa la consola.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Sync Form when selection changes
  useEffect(() => {
    if (!templates.length) return;
    const found = templates.find(t => t.id === selectedTemplateId);
    if (found) {
      setFormState({ ...found });
    }
  }, [selectedTemplateId, templates]);

  // --- Helpers ---
  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const wb = XLSX.read(data, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];

      // Get data using displayed values (raw: false) to respect Excel formatting (e.g. percentages)
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(ws, {
        defval: '',
        raw: false,
        dateNF: 'mm/dd/yyyy' // Force US date format for date cells
      });

      setExcelData(jsonData);

      if (jsonData.length > 0) {
        // Generate column config
        const keys = Object.keys(jsonData[0]);
        const newCols: ColumnConfig[] = keys.map(k => ({
          key: k,
          label: k,
          visible: DEFAULT_COLUMNS.includes(k)
        }));

        setColumns(newCols);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processExcelFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        processExcelFile(file);
      } else {
        alert("Por favor sube un archivo Excel válido (.xlsx o .xls)");
      }
    }
  };

  const handleLetterheadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic UI update
    const reader = new FileReader();
    reader.onload = (evt) => {
      setLetterhead(evt.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Supabase
    try {
      const publicUrl = await uploadLetterhead(file);
      if (publicUrl) {
        setLetterhead(publicUrl);
      }
    } catch (error) {
      console.error("Error uploading letterhead", error);
      alert("Error subiendo el membrete a la nube.");
    }
  };

  const handleColumnToggle = (key: string) => {
    setColumns(prev => prev.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleRowHighlight = (index: number) => {
    const newSet = new Set(highlightedRows);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setHighlightedRows(newSet);
  };

  const handleFormChange = (field: keyof Template, value: string) => {
    setFormState(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveTemplate = async () => {
    try {
      await saveTemplate(formState);
      setTemplates(prev => {
        const exists = prev.find(t => t.id === formState.id);
        if (exists) {
          return prev.map(t => t.id === formState.id ? formState : t);
        } else {
          return [...prev, formState];
        }
      });
      setIsEditingTemplate(false);
      alert('Cambios guardados en la base de datos.');
    } catch (error) {
      console.error("Error saving template", error);
      alert("Error guardando la plantilla.");
    }
  };

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: crypto.randomUUID(), // Use UUID for DB compatibility
      name: 'Nueva Plantilla',
      title: 'Título del Documento',
      body: 'Escriba aquí el cuerpo del documento...',
      signatureLeft: 'Firma Izquierda\nCargo',
      signatureRight: 'Firma Derecha\nCargo'
    };
    // We don't save immediately, wait for user to click Save
    setTemplates([...templates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setFormState(newTemplate);
  };

  const handleDeleteTemplate = async () => {
    if (templates.length <= 1) {
      alert("No puedes eliminar la última plantilla.");
      return;
    }
    if (window.confirm("¿Estás seguro de que quieres eliminar esta plantilla?")) {
      try {
        await deleteTemplate(selectedTemplateId);
        const remaining = templates.filter(t => t.id !== selectedTemplateId);
        setTemplates(remaining);
        setSelectedTemplateId(remaining[0].id);
      } catch (error) {
        console.error("Error deleting template", error);
        alert("Error eliminando la plantilla.");
      }
    }
  };

  const handleAddMergeField = async (label: string) => {
    const key = `{{${label.replace(/[^a-zA-Z0-9]/g, '')}}}`;
    const newField: MergeField = {
      id: crypto.randomUUID(),
      label,
      key
    };

    try {
      await saveMergeField(newField);
      setMergeFields([...mergeFields, newField]);
    } catch (error) {
      console.error("Error saving merge field", error);
      alert("Error guardando el campo.");
    }
  };

  const handleRemoveMergeField = async (id: string) => {
    try {
      await deleteMergeField(id);
      setMergeFields(mergeFields.filter(f => f.id !== id));
    } catch (error) {
      console.error("Error deleting merge field", error);
      alert("Error eliminando el campo.");
    }
  };

  const handleToggleMergeField = (fieldId: string) => {
    const currentIds = formState.allowedMergeFieldIds || [];
    let newIds: string[];

    if (currentIds.includes(fieldId)) {
      newIds = currentIds.filter(id => id !== fieldId);
    } else {
      newIds = [...currentIds, fieldId];
    }

    setFormState(prev => ({ ...prev, allowedMergeFieldIds: newIds }));
  };

  const handleMergeValueChange = (key: string, value: string) => {
    setMergeFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const handleGeneratePDF = () => {
    if (excelData.length === 0) {
      alert("Por favor carga un archivo Excel primero.");
      return;
    }
    if (!letterhead) {
      if (!window.confirm("No has cargado un membrete. ¿Deseas continuar sin él?")) {
        return;
      }
    }

    generatePDF({
      template: formState,
      data: excelData,
      columns: columns,
      highlightedRows: highlightedRows,
      letterhead: letterhead,
      mergeFieldValues: mergeFieldValues
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 text-white p-2 rounded-lg">
            <Printer size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">MyKap Amendments Generator</h1>
            <p className="text-xs text-slate-500">Generador de Enmiendas y Documentos</p>
          </div>
        </div>
        <div className="flex gap-3">
          <input
            type="file"
            ref={imageInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleLetterheadUpload}
          />
          <Button variant="outline" onClick={() => imageInputRef.current?.click()}>
            <FileUp size={16} className="mr-2" />
            {letterhead ? 'Cambiar Membrete' : 'Subir Membrete'}
          </Button>

          <Button onClick={handleGeneratePDF} className="bg-green-600 hover:bg-green-700">
            <Printer size={16} className="mr-2" />
            Generar PDF
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Controls & Editor */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Template Selection */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold flex items-center gap-2">
                <Settings size={18} /> Configuración de Plantilla
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Seleccionar Plantilla</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-md border-transparent bg-slate-100 p-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" onClick={handleCreateTemplate} title="Crear nueva">
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase">Nombre de Plantilla</label>
                  <input
                    type="text"
                    className="w-full mt-1 rounded-md border-transparent bg-slate-100 p-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    value={formState.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase">Título del Documento</label>
                  <input
                    type="text"
                    className="w-full mt-1 rounded-md border-transparent bg-slate-100 p-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    value={formState.title}
                    onChange={(e) => handleFormChange('title', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase">Cuerpo del Texto</label>
                  <textarea
                    rows={6}
                    className="w-full mt-1 rounded-md border-transparent bg-slate-100 p-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                    value={formState.body}
                    onChange={(e) => handleFormChange('body', e.target.value)}
                  />
                  <p className="text-xs text-slate-400 mt-1">Puedes editar este texto antes de imprimir.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase">Firma Izquierda</label>
                    <textarea
                      rows={3}
                      className="w-full mt-1 rounded-md border-transparent bg-slate-100 p-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                      value={formState.signatureLeft}
                      onChange={(e) => handleFormChange('signatureLeft', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase">Firma Derecha</label>
                    <textarea
                      rows={3}
                      className="w-full mt-1 rounded-md border-transparent bg-slate-100 p-2 text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-colors"
                      value={formState.signatureRight}
                      onChange={(e) => handleFormChange('signatureRight', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveTemplate} className="flex-1" size="sm">
                  <Save size={14} className="mr-2" /> Guardar Cambios
                </Button>
                <Button onClick={handleDeleteTemplate} variant="danger" size="sm" title="Eliminar Plantilla">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </section>

          {/* Merge Fields Manager */}
          <MergeFieldManager
            fields={mergeFields}
            currentTemplate={formState}
            onAddField={handleAddMergeField}
            onRemoveField={handleRemoveMergeField}
            onToggleFieldForTemplate={handleToggleMergeField}
          />

          {/* Column Configuration */}
          {excelData.length > 0 && (
            <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
              <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-slate-500">Columnas Visibles</h2>
              <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                {columns.map(col => (
                  <label key={col.key} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded cursor-pointer border border-transparent hover:border-slate-100">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => handleColumnToggle(col.key)}
                      className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 truncate">{col.label}</span>
                  </label>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN: Data Preview */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          {/* Merge Field Inputs */}
          <MergeFieldInputs
            fields={mergeFields.filter(f =>
              !formState.allowedMergeFieldIds ||
              formState.allowedMergeFieldIds.length === 0 ||
              formState.allowedMergeFieldIds.includes(f.id)
            )}
            values={mergeFieldValues}
            onChange={handleMergeValueChange}
          />

          {/* File Upload Area with Drop Zone */}
          <div
            className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-200 ease-in-out cursor-pointer
              ${isDragging
                ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                : 'border-slate-300 bg-white hover:bg-slate-50'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className={`p-3 rounded-full mb-3 transition-colors ${isDragging ? 'bg-blue-200 text-blue-700' : 'bg-green-100 text-green-600'}`}>
              <FileSpreadsheet size={32} />
            </div>
            <h3 className="text-lg font-medium text-slate-800">
              {isDragging ? 'Suelta el archivo aquí' : 'Cargar Archivo Excel'}
            </h3>
            <p className="text-slate-500 text-sm mb-4 max-w-md">
              Arrastra y suelta tu archivo .xlsx aquí o haz clic para seleccionarlo.
            </p>
            <div className="flex gap-3">
              <Button variant="secondary" className="pointer-events-none">
                Seleccionar Archivo
              </Button>
              {excelData.length > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {excelData.length} filas cargadas
                </span>
              )}
            </div>
          </div>

          {/* Table Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Vista Previa de Datos</h3>
              <div className="text-xs text-slate-500">
                Selecciona las filas que desees resaltar en el PDF
              </div>
            </div>

            <div className="flex-1">
              <TablePreview
                data={excelData}
                columns={columns}
                highlightedRows={highlightedRows}
                onToggleHighlight={handleRowHighlight}
              />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;