import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FileUp, FileSpreadsheet, Printer, Plus, Settings, Save, Trash2, CheckCircle, FileText } from 'lucide-react';
import { TermSheetsPage } from './modules/term-sheets';
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
import { useToast } from './components/Toast';
import { LoadingScreen } from './components/LoadingScreen';
import { ConfirmDialog } from './components/ConfirmDialog';

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

const inputClass = 'w-full mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors placeholder:text-slate-400';

interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  variant: 'danger' | 'warning';
  confirmLabel?: string;
  onConfirm: () => void;
}

const App: React.FC = () => {
  const { showToast } = useToast();

  // --- State ---
  const [activeModule, setActiveModule] = useState<'amendments' | 'term-sheets'>('amendments');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingLetterhead, setIsUploadingLetterhead] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmState | null>(null);

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

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const loadedTemplates = await fetchTemplates();
        if (loadedTemplates.length > 0) {
          setTemplates(loadedTemplates);
          setSelectedTemplateId(loadedTemplates[0].id);
          setFormState(loadedTemplates[0]);
        } else {
          setTemplates(DEFAULT_TEMPLATES);
          setSelectedTemplateId(DEFAULT_TEMPLATES[0].id);
          setFormState(DEFAULT_TEMPLATES[0]);
        }

        const loadedFields = await fetchMergeFields();
        setMergeFields(loadedFields);

        const url = await fetchLetterheadUrl();
        if (url) setLetterhead(url);

      } catch (error) {
        console.error("Failed to load initial data", error);
        showToast({ type: 'error', title: 'Error al cargar', message: 'No se pudieron cargar los datos. Revisa la consola.' });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!templates.length) return;
    const found = templates.find(t => t.id === selectedTemplateId);
    if (found) setFormState({ ...found });
  }, [selectedTemplateId, templates]);

  // --- Helpers ---
  const processExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      if (!data) return;

      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(ws, {
        defval: '',
        raw: false,
        dateNF: 'mm/dd/yyyy'
      });

      setExcelData(jsonData);

      if (jsonData.length > 0) {
        const keys = Object.keys(jsonData[0]);
        setColumns(keys.map(k => ({ key: k, label: k, visible: DEFAULT_COLUMNS.includes(k) })));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // --- Handlers ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processExcelFile(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        processExcelFile(file);
      } else {
        showToast({ type: 'warning', title: 'Archivo inválido', message: 'Por favor sube un archivo .xlsx o .xls' });
      }
    }
  };

  const handleLetterheadUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Optimistic preview
    const reader = new FileReader();
    reader.onload = (evt) => { setLetterhead(evt.target?.result as string); };
    reader.readAsDataURL(file);

    setIsUploadingLetterhead(true);
    try {
      const publicUrl = await uploadLetterhead(file);
      if (publicUrl) {
        setLetterhead(publicUrl);
        showToast({ type: 'success', title: 'Membrete actualizado', message: 'La imagen se subió correctamente.' });
      }
    } catch (error) {
      console.error("Error uploading letterhead", error);
      showToast({ type: 'error', title: 'Error al subir membrete', message: 'No se pudo guardar en la nube.' });
    } finally {
      setIsUploadingLetterhead(false);
    }
  };

  const handleColumnToggle = (key: string) => {
    setColumns(prev => prev.map(col => col.key === key ? { ...col, visible: !col.visible } : col));
  };

  const handleRowHighlight = (index: number) => {
    const newSet = new Set(highlightedRows);
    if (newSet.has(index)) { newSet.delete(index); } else { newSet.add(index); }
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
        return exists ? prev.map(t => t.id === formState.id ? formState : t) : [...prev, formState];
      });
      showToast({ type: 'success', title: 'Plantilla guardada', message: 'Los cambios se guardaron en la base de datos.' });
    } catch (error) {
      console.error("Error saving template", error);
      showToast({ type: 'error', title: 'Error al guardar', message: 'No se pudo guardar la plantilla.' });
    }
  };

  const handleCreateTemplate = () => {
    const newTemplate: Template = {
      id: crypto.randomUUID(),
      name: 'Nueva Plantilla',
      title: 'Título del Documento',
      body: 'Escriba aquí el cuerpo del documento...',
      signatureLeft: 'Firma Izquierda\nCargo',
      signatureRight: 'Firma Derecha\nCargo'
    };
    setTemplates([...templates, newTemplate]);
    setSelectedTemplateId(newTemplate.id);
    setFormState(newTemplate);
  };

  const handleDeleteTemplate = () => {
    if (templates.length <= 1) {
      showToast({ type: 'warning', title: 'No se puede eliminar', message: 'Debe existir al menos una plantilla.' });
      return;
    }
    setConfirmDialog({
      isOpen: true,
      title: 'Eliminar plantilla',
      message: `¿Estás seguro de que deseas eliminar "${formState.name}"? Esta acción no se puede deshacer.`,
      variant: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await deleteTemplate(selectedTemplateId);
          const remaining = templates.filter(t => t.id !== selectedTemplateId);
          setTemplates(remaining);
          setSelectedTemplateId(remaining[0].id);
          showToast({ type: 'success', title: 'Plantilla eliminada' });
        } catch (error) {
          console.error("Error deleting template", error);
          showToast({ type: 'error', title: 'Error al eliminar', message: 'No se pudo eliminar la plantilla.' });
        }
      }
    });
  };

  const handleAddMergeField = async (label: string) => {
    const key = `{{${label.replace(/[^a-zA-Z0-9]/g, '')}}}`;
    const newField: MergeField = { id: crypto.randomUUID(), label, key };
    try {
      await saveMergeField(newField);
      setMergeFields([...mergeFields, newField]);
    } catch (error) {
      console.error("Error saving merge field", error);
      showToast({ type: 'error', title: 'Error al guardar campo' });
    }
  };

  const handleRemoveMergeField = async (id: string) => {
    try {
      await deleteMergeField(id);
      setMergeFields(mergeFields.filter(f => f.id !== id));
    } catch (error) {
      console.error("Error deleting merge field", error);
      showToast({ type: 'error', title: 'Error al eliminar campo' });
    }
  };

  const handleToggleMergeField = (fieldId: string) => {
    const currentIds = formState.allowedMergeFieldIds || [];
    const newIds = currentIds.includes(fieldId)
      ? currentIds.filter(id => id !== fieldId)
      : [...currentIds, fieldId];
    setFormState(prev => ({ ...prev, allowedMergeFieldIds: newIds }));
  };

  const handleMergeValueChange = (key: string, value: string) => {
    setMergeFieldValues(prev => ({ ...prev, [key]: value }));
  };

  const handleGeneratePDF = () => {
    if (excelData.length === 0) {
      showToast({ type: 'warning', title: 'Sin datos', message: 'Carga un archivo Excel antes de generar el PDF.' });
      return;
    }
    if (!letterhead) {
      setConfirmDialog({
        isOpen: true,
        title: 'Sin membrete',
        message: 'No has cargado un membrete. ¿Deseas generar el PDF sin él?',
        variant: 'warning',
        confirmLabel: 'Continuar sin membrete',
        onConfirm: () => {
          generatePDF({ template: formState, data: excelData, columns, highlightedRows, letterhead, mergeFieldValues });
        }
      });
      return;
    }
    generatePDF({ template: formState, data: excelData, columns, highlightedRows, letterhead, mergeFieldValues });
  };

  // --- Render ---

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">

      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-700 text-white p-2 rounded-lg shadow-sm">
              <Printer size={22} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-none">MyKap PDF Generator</h1>
              <p className="text-xs text-slate-500 mt-0.5">Generador de Documentos</p>
            </div>

            {/* Module Tabs */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-4 ml-1">
              <button
                onClick={() => setActiveModule('amendments')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeModule === 'amendments' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <Printer size={13} className="inline mr-1.5 -mt-0.5" />
                Amendments
              </button>
              <button
                onClick={() => setActiveModule('term-sheets')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeModule === 'term-sheets' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
              >
                <FileText size={13} className="inline mr-1.5 -mt-0.5" />
                Term Sheets
              </button>
            </div>
          </div>

          {activeModule === 'amendments' && (
            <div className="flex items-center gap-3">
              {letterhead ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                  <CheckCircle size={12} />
                  Membrete cargado
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium">
                  Sin membrete
                </span>
              )}

              <input type="file" ref={imageInputRef} accept="image/*" className="hidden" onChange={handleLetterheadUpload} />
              <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()} disabled={isUploadingLetterhead}>
                <FileUp size={15} className="mr-1.5" />
                {isUploadingLetterhead ? 'Subiendo...' : letterhead ? 'Cambiar' : 'Subir Membrete'}
              </Button>

              <Button size="sm" onClick={handleGeneratePDF} className="bg-blue-700 hover:bg-blue-800 text-white shadow-sm">
                <Printer size={15} className="mr-1.5" />
                Generar PDF
              </Button>
            </div>
          )}
        </div>
      </header>

      {activeModule === 'term-sheets' && <TermSheetsPage sharedLetterhead={letterhead} />}

      <main className={`flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 ${activeModule !== 'amendments' ? 'hidden' : ''}`}>

        {/* LEFT COLUMN */}
        <div className="lg:col-span-4 flex flex-col gap-6">

          {/* Template Configuration */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-4">
              <Settings size={16} className="text-slate-500" />
              Configuración de Plantilla
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Seleccionar Plantilla</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-colors"
                    value={selectedTemplateId}
                    onChange={(e) => setSelectedTemplateId(e.target.value)}
                  >
                    {templates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <Button variant="outline" size="sm" onClick={handleCreateTemplate} title="Crear nueva plantilla">
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              <hr className="border-slate-100" />

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Nombre de Plantilla</label>
                  <input type="text" className={inputClass} value={formState.name} onChange={(e) => handleFormChange('name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Título del Documento</label>
                  <input type="text" className={inputClass} value={formState.title} onChange={(e) => handleFormChange('title', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Cuerpo del Texto</label>
                  <textarea rows={6} className={inputClass} value={formState.body} onChange={(e) => handleFormChange('body', e.target.value)} />
                  <p className="text-xs text-slate-400 mt-1">Puedes editar este texto antes de imprimir.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Firma Izquierda</label>
                    <textarea rows={3} className={inputClass} value={formState.signatureLeft} onChange={(e) => handleFormChange('signatureLeft', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 uppercase tracking-wide">Firma Derecha</label>
                    <textarea rows={3} className={inputClass} value={formState.signatureRight} onChange={(e) => handleFormChange('signatureRight', e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveTemplate} className="flex-1" size="sm">
                  <Save size={14} className="mr-2" /> Guardar Cambios
                </Button>
                <Button onClick={handleDeleteTemplate} variant="danger" size="sm" title="Eliminar plantilla">
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
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Columnas Visibles</h2>
              <div className="max-h-60 overflow-y-auto space-y-1 pr-2">
                {columns.map(col => (
                  <label key={col.key} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      onChange={() => handleColumnToggle(col.key)}
                      className="h-4 w-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-slate-700 truncate">{col.label}</span>
                  </label>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-8 flex flex-col gap-6">

          <MergeFieldInputs
            fields={mergeFields.filter(f =>
              !formState.allowedMergeFieldIds ||
              formState.allowedMergeFieldIds.length === 0 ||
              formState.allowedMergeFieldIds.includes(f.id)
            )}
            values={mergeFieldValues}
            onChange={handleMergeValueChange}
          />

          {/* File Upload Drop Zone */}
          <div
            className={`p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-200 cursor-pointer
              ${isDragging ? 'border-blue-500 bg-blue-50 scale-[1.02]' : 'border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400'}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input type="file" ref={fileInputRef} accept=".xlsx, .xls" onChange={handleFileUpload} className="hidden" />
            <div className={`p-3 rounded-full mb-3 transition-colors ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              <FileSpreadsheet size={30} />
            </div>
            <h3 className="text-base font-semibold text-slate-800">
              {isDragging ? 'Suelta el archivo aquí' : 'Cargar Archivo Excel'}
            </h3>
            <p className="text-slate-500 text-sm mt-1 mb-4 max-w-md">
              Arrastra y suelta tu archivo .xlsx aquí, o haz clic para seleccionarlo.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" className="pointer-events-none">
                Seleccionar Archivo
              </Button>
              {excelData.length > 0 && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-700">
                  <CheckCircle size={12} />
                  {excelData.length} filas cargadas
                </span>
              )}
            </div>
          </div>

          {/* Table Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-800">Vista Previa de Datos</h3>
              <span className="text-xs text-slate-400">Selecciona las filas a resaltar en el PDF</span>
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

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmLabel={confirmDialog.confirmLabel}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};

export default App;
