import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import type { InvestmentData, InputData, CustomField, PropertyData } from './types';
import { InputType } from './types';

interface DataInputViewProps {
    onSubmit: (data: InvestmentData) => void;
    sharedLetterhead?: string | null;
}

const defaultProperty: PropertyData = {
    id: '1',
    type: 'Multifamily Property',
    doors: '69',
    address: '1913-2025 W McNichols Rd',
    cityStateZip: 'Highland Park, MI, 48203',
    images: []
};

const initialFormData: InputData = {
    valorSubyacente: '3190000',
    valorCredito: '2073500',
    posicionInversionista: '658800',
    plazo: '12',
    extensionPlazo: '6',
    feeOriginacionPorcentaje: '1.00',
    interesesAnticipadosMeses: '3',
    tasaNominalInversionistaAnual: '10',

    scenario2Month: '10',
    scenario3Month: '11',

    mainDescription: 'Proveer un vehículo de inversión rentable y seguro, protegido con el respaldo de un bien inmueble, generando rendimientos e intereses mensuales en USD y bajo jurisdicción norteamericana',
    note1: '1. El cliente de crédito puede pre-pagar el crédito en cualquier momento, por lo tanto, se le informará al inversionista si desea la devolución de su capital o reasignar su posición a otro crédito.',
    note2: '2. El cliente tiene el derecho a solicitar extensión del crédito hasta 6 meses.',
    footerAddress: '1555 Bonaventure Blvd, Suite 2015, Weston, Fl 33326',

    properties: [defaultProperty],

    signer1Name: 'Diego Felipe Quesada',
    signer1Title: 'Manager',
    signer2Name: 'Lepal Investments INC',
    includeSignatures: true
};

const STORAGE_KEY = 'mykap_termsheet_formdata';
const STORAGE_LETTERHEAD_KEY = 'mykap_termsheet_letterhead';

const loadSavedFormData = (): InputData => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return { ...initialFormData, ...JSON.parse(saved) };
    } catch {}
    return initialFormData;
};

const loadSavedLetterhead = (): string | null => {
    try { return localStorage.getItem(STORAGE_LETTERHEAD_KEY); } catch {}
    return null;
};

const formatUSD = (val: string): string => {
    const num = parseFloat(String(val).replace(/,/g, ''));
    if (isNaN(num)) return '';
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Helper function to calculate IRR (Internal Rate of Return)
function calculateIRR(values: number[], guess: number = 0.1): number {
    const maxIterations = 100;
    const tolerance = 0.00001;
    let x0 = guess;

    for (let i = 0; i < maxIterations; i++) {
        let fValue = 0;
        let fDerivative = 0;

        for (let j = 0; j < values.length; j++) {
            fValue += values[j] / Math.pow(1 + x0, j);
            fDerivative -= (j * values[j]) / Math.pow(1 + x0, j + 1);
        }

        const x1 = x0 - fValue / fDerivative;

        if (Math.abs(x1 - x0) <= tolerance) {
            return x1 * 12; // Convert monthly IRR to Annual
        }
        x0 = x1;
    }
    return 0;
}

const DataInputView: React.FC<DataInputViewProps> = ({ onSubmit, sharedLetterhead }) => {
    const [inputType, setInputType] = useState<InputType>(InputType.FORM);
    const [formData, setFormData] = useState<InputData>(loadSavedFormData);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [letterheadImage, setLetterheadImage] = useState<string | null>(
        () => loadSavedLetterhead() ?? sharedLetterhead ?? null
    );
    const [activePropertyIndex, setActivePropertyIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const [currencyDisplay, setCurrencyDisplay] = useState<Record<string, string>>(() => ({
        valorSubyacente: formatUSD(formData.valorSubyacente),
        valorCredito: formatUSD(formData.valorCredito),
        posicionInversionista: formatUSD(formData.posicionInversionista),
    }));

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setCurrencyDisplay(prev => ({ ...prev, [name]: value }));
        setFormData(prev => ({ ...prev, [name]: value.replace(/[^0-9.]/g, '') }));
    };
    const handleCurrencyFocus = (name: string) => {
        setCurrencyDisplay(prev => ({ ...prev, [name]: formData[name as keyof InputData] as string }));
    };
    const handleCurrencyBlur = (name: string) => {
        setCurrencyDisplay(prev => ({ ...prev, [name]: formatUSD(formData[name as keyof InputData] as string) }));
    };

    const renderCurrencyInput = (name: 'valorSubyacente' | 'valorCredito' | 'posicionInversionista', label: string) => (
        <div className="relative">
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
            <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                    <span className="text-slate-400 text-sm font-medium">$</span>
                </div>
                <input
                    type="text"
                    inputMode="decimal"
                    name={name}
                    id={name}
                    value={currencyDisplay[name] ?? ''}
                    onChange={handleCurrencyChange}
                    onFocus={() => handleCurrencyFocus(name)}
                    onBlur={() => handleCurrencyBlur(name)}
                    className="block w-full rounded-lg border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 shadow-sm text-slate-900 placeholder-slate-300 transition-all duration-200 pl-8 pr-3"
                    placeholder="0.00"
                    required
                />
            </div>
        </div>
    );

    const calculateValues = useCallback(() => {
        const valorSubyacente = parseFloat(formData.valorSubyacente) || 0;
        const valorCredito = parseFloat(formData.valorCredito) || 0;
        const posicionInversionista = parseFloat(formData.posicionInversionista) || 0;
        const tasaNominalAnual = parseFloat(formData.tasaNominalInversionistaAnual) / 100 || 0;
        const feePorcentaje = parseFloat(formData.feeOriginacionPorcentaje) / 100 || 0;
        const interesesMeses = parseInt(formData.interesesAnticipadosMeses, 10) || 0;
        const plazo = parseInt(formData.plazo, 10) || 12;

        if (!valorSubyacente || !valorCredito || !posicionInversionista || !tasaNominalAnual) {
            return null;
        }

        const ltv = (valorCredito / valorSubyacente);
        const posicionInversionistaPorcentaje = (posicionInversionista / valorCredito);
        const retornoMensualInversionista = (posicionInversionista * tasaNominalAnual) / 12;
        const feeOriginacionMonto = posicionInversionista * feePorcentaje;
        const interesesAnticipadosMonto = retornoMensualInversionista * interesesMeses;
        const totalGiroInversionista = posicionInversionista - feeOriginacionMonto - interesesAnticipadosMonto;

        const s2Month = parseInt(formData.scenario2Month) || (plazo - 2);
        const s3Month = parseInt(formData.scenario3Month) || (plazo - 1);

        const generateFlow = (exitMonth: number) => {
            const flow = [];
            flow.push(-totalGiroInversionista);

            for (let m = 1; m <= exitMonth; m++) {
                if (m === exitMonth) {
                    // Principal always returned at exit, regardless of prepaid period
                    flow.push(retornoMensualInversionista + posicionInversionista);
                } else if (m <= interesesMeses) {
                    // Prepaid interest months: cash flow is $0 (already collected upfront)
                    flow.push(0);
                } else {
                    flow.push(retornoMensualInversionista);
                }
            }
            return flow;
        };

        const f1 = generateFlow(s2Month);
        const f2 = generateFlow(s3Month);
        const f3 = generateFlow(plazo);

        const tir1 = calculateIRR(f1);
        const tir2 = calculateIRR(f2);
        const tir3 = calculateIRR(f3);

        return {
            ltv,
            posicionInversionistaPorcentaje,
            retornoMensualInversionista,
            feeOriginacionMonto,
            interesesAnticipadosMonto,
            totalGiroInversionista,
            flowsScenario1: f1,
            flowsScenario2: f2,
            flowsScenario3: f3,
            tirScenario1: tir1,
            tirScenario2: tir2,
            tirScenario3: tir3,
            s1Month: s2Month,
            s2Month: s3Month,
            s3Month: plazo
        };
    }, [formData]);

    const [calculated, setCalculated] = useState(calculateValues());

    useEffect(() => {
        setCalculated(calculateValues());
    }, [formData, calculateValues]);

    // Persist formData to localStorage on every change
    useEffect(() => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(formData)); } catch {}
    }, [formData]);

    // Sync when shared letterhead becomes available and no local override exists
    useEffect(() => {
        if (!loadSavedLetterhead() && sharedLetterhead) {
            setLetterheadImage(sharedLetterhead);
        }
    }, [sharedLetterhead]);

    // Persist letterhead to localStorage only for local custom overrides (not shared URL)
    useEffect(() => {
        try {
            if (letterheadImage && letterheadImage !== sharedLetterhead) {
                localStorage.setItem(STORAGE_LETTERHEAD_KEY, letterheadImage);
            } else {
                localStorage.removeItem(STORAGE_LETTERHEAD_KEY);
            }
        } catch {}
    }, [letterheadImage, sharedLetterhead]);

    const handleClearData = () => {
        try {
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_LETTERHEAD_KEY);
        } catch {}
        setFormData(initialFormData);
        setCurrencyDisplay({
            valorSubyacente: formatUSD(initialFormData.valorSubyacente),
            valorCredito: formatUSD(initialFormData.valorCredito),
            posicionInversionista: formatUSD(initialFormData.posicionInversionista),
        });
        setLetterheadImage(null);
        setInputType(InputType.FORM);
        setError(null);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target;
        const value = target.type === 'checkbox' ? (target as HTMLInputElement).checked : target.value;
        const name = target.name;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Property Management ---

    const handlePropertyChange = (field: keyof PropertyData, value: string) => {
        setFormData(prev => {
            const newProperties = [...prev.properties];
            newProperties[activePropertyIndex] = {
                ...newProperties[activePropertyIndex],
                [field]: value
            };
            return { ...prev, properties: newProperties };
        });
    };

    const addProperty = () => {
        setFormData(prev => ({
            ...prev,
            properties: [...prev.properties, {
                id: Date.now().toString(),
                type: 'Tipo Propiedad',
                doors: '0',
                address: '',
                cityStateZip: '',
                images: []
            }]
        }));
        setActivePropertyIndex(formData.properties.length);
    };

    const removeProperty = (index: number) => {
        if (formData.properties.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            properties: prev.properties.filter((_, i) => i !== index)
        }));
        setActivePropertyIndex(0);
    };

    const handlePropertyImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files) {
            const newImages: string[] = [];
            let processedCount = 0;

            Array.from(files).forEach(file => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    newImages.push(reader.result as string);
                    processedCount++;
                    if (processedCount === files.length) {
                         setFormData(prev => {
                            const newProperties = [...prev.properties];
                            const currentImages = newProperties[activePropertyIndex].images || [];
                            newProperties[activePropertyIndex].images = [...currentImages, ...newImages].slice(0, 4);
                            return { ...prev, properties: newProperties };
                        });
                    }
                };
                reader.readAsDataURL(file as Blob);
            });
        }
    };

    const removePropertyImage = (imgIndex: number) => {
         setFormData(prev => {
            const newProperties = [...prev.properties];
            newProperties[activePropertyIndex].images = newProperties[activePropertyIndex].images.filter((_, i) => i !== imgIndex);
            return { ...prev, properties: newProperties };
        });
    };

    // --- End Property Management ---

    const handleLetterheadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLetterheadImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeLetterhead = () => {
        setLetterheadImage(sharedLetterhead ?? null);
        const fileInput = document.getElementById('letterhead-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const calcs = calculateValues();
        if (!calcs) {
            setError("Faltan datos para realizar los cálculos.");
            return;
        }

        const finalData: InvestmentData = {
            valorSubyacente: parseFloat(formData.valorSubyacente),
            valorCredito: parseFloat(formData.valorCredito),
            posicionInversionista: parseFloat(formData.posicionInversionista),
            plazo: parseInt(formData.plazo),
            extensionPlazo: parseInt(formData.extensionPlazo),
            feeOriginacionPorcentaje: parseFloat(formData.feeOriginacionPorcentaje),
            interesesAnticipadosMeses: parseInt(formData.interesesAnticipadosMeses),
            tasaNominalInversionistaAnual: parseFloat(formData.tasaNominalInversionistaAnual),

            ltv: calcs.ltv * 100,
            posicionInversionistaPorcentaje: calcs.posicionInversionistaPorcentaje * 100,
            retornoMensualInversionista: calcs.retornoMensualInversionista,
            feeOriginacionMonto: calcs.feeOriginacionMonto,
            interesesAnticipadosMonto: calcs.interesesAnticipadosMonto,
            totalGiroInversionista: calcs.totalGiroInversionista,

            scenario1Month: calcs.s1Month,
            scenario2Month: calcs.s2Month,
            scenario3Month: calcs.s3Month,
            flowsScenario1: calcs.flowsScenario1,
            flowsScenario2: calcs.flowsScenario2,
            flowsScenario3: calcs.flowsScenario3,
            tirScenario1: calcs.tirScenario1,
            tirScenario2: calcs.tirScenario2,
            tirScenario3: calcs.tirScenario3,

            customFields: customFields,
            mainDescription: formData.mainDescription,
            note1: formData.note1,
            note2: formData.note2,
            footerAddress: formData.footerAddress,
            pageNumber: 'Page 1 of 3',
            letterheadImage: letterheadImage,

            properties: formData.properties,

            signer1Name: formData.signer1Name,
            signer1Title: formData.signer1Title,
            signer2Name: formData.signer2Name,
            includeSignatures: formData.includeSignatures
        };

        onSubmit(finalData);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: ['key', 'value'] });

                const dataMap = new Map<string, string>();
                (json as {key: string, value: any}[]).forEach(row => {
                    if (row.key && row.value !== undefined) {
                        dataMap.set(row.key.trim(), row.value.toString());
                    }
                });

                const requiredKeys: Record<string, keyof Omit<InputData, 'properties' | 'includeSignatures'>> = {
                    'Valor Subyacente': 'valorSubyacente',
                    'Valor Crédito': 'valorCredito',
                    'Posición Inversionista': 'posicionInversionista',
                    'Plazo': 'plazo',
                    'Posibilidad de extensión': 'extensionPlazo',
                    'Fee de Originación': 'feeOriginacionPorcentaje',
                    'Intereses Anticipados': 'interesesAnticipadosMeses',
                    'Tasa Nominal Inversionista (Anual)': 'tasaNominalInversionistaAnual'
                };

                const newFormData: Partial<InputData> = {};
                for (const [excelKey, formKey] of Object.entries(requiredKeys)) {
                    if (dataMap.has(excelKey)) {
                         newFormData[formKey] = dataMap.get(excelKey)!.match(/[\d.]+/)?.[0] || '0';
                    }
                }

                setFormData(prev => ({...prev, ...newFormData}));
                setCurrencyDisplay(prev => ({
                    valorSubyacente: formatUSD(newFormData.valorSubyacente ?? prev.valorSubyacente),
                    valorCredito: formatUSD(newFormData.valorCredito ?? prev.valorCredito),
                    posicionInversionista: formatUSD(newFormData.posicionInversionista ?? prev.posicionInversionista),
                }));
                setInputType(InputType.FORM);

            } catch (err) {
                setError('Error al leer el archivo Excel.');
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const formatCurrency = (value: number | undefined) => value !== undefined ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value) : '...';
    const formatPercent = (value: number | undefined) => value !== undefined ? `${(value * 100).toFixed(2)}%` : '...';

    const renderInput = (name: keyof InputData, label: string, type: string = "number", addon?: string, optional: boolean = false) => (
        <div className="relative">
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1.5">
                {label} {optional && <span className="text-slate-400 font-normal text-xs">(Opcional)</span>}
            </label>
            <div className="relative rounded-md shadow-sm">
                 {addon === 'USD' && <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center"><span className="text-slate-400 text-sm font-medium">$</span></div>}
                <input
                    type={type}
                    name={name}
                    id={name}
                    value={formData[name] as string}
                    onChange={handleInputChange}
                    className={`block w-full rounded-lg border-slate-300 bg-white focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2.5 shadow-sm text-slate-900 placeholder-slate-300 transition-all duration-200
                    ${addon === 'USD' ? 'pl-8' : 'pl-3'} ${addon === '%' ? 'pr-8' : 'pr-3'}`}
                    placeholder={optional ? "0" : "0.00"}
                    step={type === 'number' ? 'any' : undefined}
                    required={!optional}
                />
                {addon === '%' && <div className="pointer-events-none absolute inset-y-0 right-0 pr-3 flex items-center"><span className="text-slate-400 text-sm font-bold">%</span></div>}
            </div>
        </div>
    );

    const renderTextarea = (name: keyof InputData, label: string, rows: number = 3) => (
        <div className="col-span-full">
            <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
            <textarea
                id={name}
                name={name}
                rows={rows}
                value={formData[name] as string}
                onChange={handleInputChange}
                className="block w-full rounded-lg border-slate-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm py-2 px-3 text-slate-900 placeholder-slate-300 transition-all duration-200"
            />
        </div>
    );

    const SummaryRow: React.FC<{ label: string; value: string; isTotal?: boolean }> = ({ label, value, isTotal }) => (
        <div className={`flex justify-between items-center py-3 ${isTotal ? 'border-t-2 border-slate-100 mt-2 pt-4' : 'border-b border-slate-50'}`}>
            <span className={`text-sm ${isTotal ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>{label}</span>
            <span className={`font-mono ${isTotal ? 'text-xl font-bold text-blue-600' : 'text-slate-700 font-semibold'}`}>{value}</span>
        </div>
    );

    return (
        <div className="container mx-auto p-4 lg:p-8 max-w-7xl pb-24">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Nuevo Term Sheet</h1>
                    <p className="text-slate-500 mt-1">Configure los datos para generar el PDF.</p>
                </div>

                <div className="flex items-center gap-3 self-start md:self-auto">
                    <button
                        type="button"
                        onClick={handleClearData}
                        className="text-sm font-medium text-slate-400 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg border border-slate-200 hover:border-red-200 transition-colors"
                        title="Limpiar todos los datos"
                    >
                        Limpiar datos
                    </button>

                    <div className="bg-slate-200/60 p-1 rounded-xl inline-flex">
                        <button
                            onClick={() => setInputType(InputType.FORM)}
                            className={`${inputType === InputType.FORM ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'} flex items-center px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200`}
                        >
                            Manual
                        </button>
                        <button
                            onClick={() => setInputType(InputType.FILE)}
                            className={`${inputType === InputType.FILE ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'} flex items-center px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200`}
                        >
                            Importar Excel
                        </button>
                    </div>
                </div>
            </header>

            {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r shadow-sm" role="alert">
                    <span className="block sm:inline font-medium">{error}</span>
                </div>
            )}

            {inputType === InputType.FORM ? (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    <div className="lg:col-span-8 space-y-6">

                        {/* Section 1: Financials */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800">
                                Datos Financieros
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                                {renderCurrencyInput('valorSubyacente', 'Valor Subyacente')}
                                {renderCurrencyInput('valorCredito', 'Valor Crédito')}
                                {renderCurrencyInput('posicionInversionista', 'Posición Inversionista')}
                                {renderInput('tasaNominalInversionistaAnual', 'Tasa Nominal (Anual)', 'number', '%')}
                                {renderInput('plazo', 'Plazo Total (Meses)', 'number')}
                                {renderInput('extensionPlazo', 'Extensión (+ Meses)', 'number')}
                                {renderInput('feeOriginacionPorcentaje', 'Fee Originación', 'number', '%', true)}
                                {renderInput('interesesAnticipadosMeses', 'Intereses Anticipados', 'number', undefined, true)}

                                <div className="col-span-full my-4 border-t border-slate-100 pt-4">
                                    <h4 className="text-sm font-bold text-slate-900 mb-3">Escenarios de Salida Anticipada (Pag. 2)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {renderInput('scenario2Month', 'Salida Escenario 1 (Mes)', 'number')}
                                        {renderInput('scenario3Month', 'Salida Escenario 2 (Mes)', 'number')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Signatures & Text */}
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800">
                                Firmas y Textos
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="flex items-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                                    <input
                                        id="includeSignatures"
                                        name="includeSignatures"
                                        type="checkbox"
                                        checked={formData.includeSignatures}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="includeSignatures" className="ml-2 block text-sm text-slate-900 font-medium cursor-pointer">
                                        Incluir sección de firmas en el reporte
                                    </label>
                                </div>

                                {formData.includeSignatures && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {renderInput('signer1Name', 'Nombre Firmante 1 (Manager)', 'text')}
                                        {renderInput('signer1Title', 'Cargo Firmante 1', 'text')}
                                        {renderInput('signer2Name', 'Nombre Firmante 2 (Entidad)', 'text')}
                                    </div>
                                )}

                                <hr className="my-4 border-slate-100"/>
                                {renderTextarea('mainDescription', 'Descripción Principal')}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    {renderTextarea('note1', 'Nota 1', 2)}
                                    {renderTextarea('note2', 'Nota 2', 2)}
                                </div>
                                {renderInput('footerAddress', 'Dirección Pie de Página', 'text')}
                            </div>
                        </div>

                         {/* Section 3: Property Info */}
                         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 flex justify-between items-center">
                                <span>Propiedades (Pag. 3+)</span>
                                <button type="button" onClick={addProperty} className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 font-semibold transition-colors">
                                    + Agregar Propiedad
                                </button>
                            </div>

                            {/* Property Tabs */}
                            <div className="flex overflow-x-auto border-b border-slate-100 px-6 pt-4 gap-2">
                                {formData.properties.map((prop, idx) => (
                                    <button
                                        key={prop.id}
                                        type="button"
                                        onClick={() => setActivePropertyIndex(idx)}
                                        className={`whitespace-nowrap px-4 py-2 rounded-t-lg text-sm font-medium border-b-2 transition-colors
                                            ${idx === activePropertyIndex
                                                ? 'border-blue-500 text-blue-700 bg-blue-50/50'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                                    >
                                        {prop.address || `Propiedad ${idx + 1}`}
                                    </button>
                                ))}
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="text-sm font-bold text-slate-400 uppercase">Detalles de Propiedad {activePropertyIndex + 1}</h4>
                                    {formData.properties.length > 1 && (
                                        <button type="button" onClick={() => removeProperty(activePropertyIndex)} className="text-xs text-red-500 hover:text-red-700 font-medium">
                                            Eliminar esta propiedad
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Propiedad</label>
                                        <input type="text" value={formData.properties[activePropertyIndex].type} onChange={(e) => handlePropertyChange('type', e.target.value)} className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3" />
                                    </div>
                                    <div className="relative">
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Número de Puertas</label>
                                        <input type="text" value={formData.properties[activePropertyIndex].doors} onChange={(e) => handlePropertyChange('doors', e.target.value)} className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3" />
                                    </div>
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Dirección</label>
                                    <input type="text" value={formData.properties[activePropertyIndex].address} onChange={(e) => handlePropertyChange('address', e.target.value)} className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3" />
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Ciudad, Estado, Zip</label>
                                    <input type="text" value={formData.properties[activePropertyIndex].cityStateZip} onChange={(e) => handlePropertyChange('cityStateZip', e.target.value)} className="block w-full rounded-lg border-slate-300 bg-white text-slate-900 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm py-2.5 px-3" />
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Fotos de Propiedad {activePropertyIndex + 1} (Max 4)</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {formData.properties[activePropertyIndex].images.map((img, idx) => (
                                            <div key={idx} className="relative aspect-square group">
                                                <img src={img} alt={`Prop ${activePropertyIndex} Img ${idx}`} className="w-full h-full object-cover rounded-lg border border-slate-200" />
                                                <button type="button" onClick={() => removePropertyImage(idx)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                        {formData.properties[activePropertyIndex].images.length < 4 && (
                                            <label className="flex flex-col items-center justify-center w-full h-full aspect-square border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                                                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                <span className="text-xs text-slate-500 mt-1">Subir</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={handlePropertyImagesChange} multiple />
                                            </label>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                         {/* Section 4: Letterhead */}
                         <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 font-bold text-slate-800 flex items-center justify-between">
                                <span>Membrete (Fondo)</span>
                                {letterheadImage && letterheadImage === sharedLetterhead && (
                                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                        Compartido con Amendments
                                    </span>
                                )}
                            </div>
                            <div className="p-6">
                                {letterheadImage ? (
                                    <div className="text-center">
                                        <img src={letterheadImage} alt="Preview" className="max-h-32 mx-auto rounded shadow-sm mb-3" />
                                        <div className="flex items-center justify-center gap-4">
                                            <label htmlFor="letterhead-upload" className="text-xs text-blue-600 font-medium hover:underline cursor-pointer">
                                                Cambiar
                                                <input id="letterhead-upload" name="letterhead-upload" type="file" className="sr-only" onChange={handleLetterheadChange} accept="image/png, image/jpeg" />
                                            </label>
                                            {letterheadImage !== sharedLetterhead && (
                                                <button type="button" onClick={removeLetterhead} className="text-xs text-red-600 font-medium hover:underline">
                                                    {sharedLetterhead ? 'Usar compartido' : 'Eliminar'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg hover:bg-slate-50 transition-colors">
                                        <div className="text-center">
                                            <label htmlFor="letterhead-upload" className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-500">
                                                <span>Subir imagen de membrete (Letter)</span>
                                                <input id="letterhead-upload" name="letterhead-upload" type="file" className="sr-only" onChange={handleLetterheadChange} accept="image/png, image/jpeg" />
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sticky Summary */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-2xl shadow-lg border border-blue-100 lg:sticky lg:top-24 overflow-hidden">
                             <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                                <h3 className="text-white font-bold text-lg">
                                    Resumen en Vivo
                                </h3>
                            </div>

                            <div className="p-6 space-y-1">
                                <SummaryRow label="LTV" value={formatPercent(calculated?.ltv)} />
                                <SummaryRow label="Participación" value={formatPercent(calculated?.posicionInversionistaPorcentaje)} />
                                <SummaryRow label="Retorno Mensual" value={formatCurrency(calculated?.retornoMensualInversionista)} />
                                <SummaryRow label="Giro Total Inv." value={formatCurrency(calculated?.totalGiroInversionista)} isTotal={true} />

                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Estimación TIR (Escenarios)</h4>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Mes {calculated?.s1Month}</span>
                                        <span className="font-mono font-bold text-slate-800">{formatPercent(calculated?.tirScenario1 !== undefined ? calculated.tirScenario1 / 100 : undefined)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-1">
                                        <span className="text-slate-600">Mes {calculated?.s2Month}</span>
                                        <span className="font-mono font-bold text-slate-800">{formatPercent(calculated?.tirScenario2 !== undefined ? calculated.tirScenario2 / 100 : undefined)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mt-1">
                                        <span className="text-slate-600">Full ({calculated?.s3Month}m)</span>
                                        <span className="font-mono font-bold text-slate-800">{formatPercent(calculated?.tirScenario3 !== undefined ? calculated.tirScenario3 / 100 : undefined)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 bg-slate-50 border-t border-slate-100">
                                <button type="submit" className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all">
                                    Generar Informe
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            ) : (
                <div className="max-w-xl mx-auto mt-10 bg-white p-8 rounded-2xl shadow-xl text-center">
                     <label htmlFor="file-upload" className="block w-full border-2 border-dashed border-blue-200 rounded-xl p-10 cursor-pointer hover:bg-blue-50 transition-colors">
                        <span className="text-blue-600 font-bold">Subir Excel (.xlsx)</span>
                        <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".xlsx, .xls" />
                     </label>
                     {isProcessing && <p className="mt-4 text-sm text-slate-500">Procesando archivo...</p>}
                </div>
            )}
        </div>
    );
};

export default DataInputView;
