import React, { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useToast } from '../../components/Toast';
import type { InvestmentData } from './types';

interface ReportViewProps {
    data: InvestmentData;
    onBack: () => void;
}

const ReportView: React.FC<ReportViewProps> = ({ data, onBack }) => {
    const [isDownloading, setIsDownloading] = useState(false);
    const { showToast } = useToast();

    const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
    const formatPercent = (value: number) => `${(value).toFixed(2)}%`;

    const handleDownloadPdf = async () => {
        setIsDownloading(true);
        const reportElement = document.getElementById('report-content');
        if (!reportElement) {
            setIsDownloading(false);
            return;
        }

        try {
            // Letter size dimensions in mm
            const imgWidth = 215.9;
            const pageHeight = 279.4;

            const canvas = await html2canvas(reportElement, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            const imgData = canvas.toDataURL('image/png');
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Initialize PDF with 'letter' format
            const pdf = new jsPDF('p', 'mm', 'letter');

            let heightLeft = imgHeight;
            let position = 0;

            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Prevent extra blank page by ensuring significant content remains (buffer of 1mm)
            while (heightLeft >= 1) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            pdf.save('informe-inversion.pdf');

        } catch (error) {
            console.error("Error PDF:", error);
            showToast({ type: 'error', title: 'Error al generar PDF', message: 'No se pudo crear el archivo.' });
        } finally {
            setIsDownloading(false);
        }
    };

    // --- Components ---

    const TermSheetRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <tr>
            <td className="p-3 font-bold text-black text-sm w-1/2 border border-black bg-transparent align-top">{label}</td>
            <td className="p-3 text-black text-sm font-medium w-1/2 border border-black bg-transparent align-top">{value}</td>
        </tr>
    );

    const SecurityRingItem: React.FC<{ number: number; text: string }> = ({ number, text }) => (
        <div className="flex items-baseline mb-3">
            <span className="font-bold text-black text-sm mr-2">{number}.</span>
            <span className="text-black text-sm font-medium">{text}</span>
        </div>
    );

    // Calculate maximum rows needed across all scenarios to ensure alignment
    const maxFlowRows = Math.max(data.flowsScenario1.length, data.flowsScenario2.length, data.flowsScenario3.length);

    const renderFlowTableBody = (flows: number[]) => {
        const rows = [];
        for (let i = 0; i < maxFlowRows; i++) {
            if (i < flows.length) {
                rows.push(
                    <div key={i} className="flex justify-between text-xs mb-1 px-2 h-4 items-center">
                        <span className="font-bold text-blue-900">{i}</span>
                        <span className="font-bold text-blue-900">
                            {formatCurrency(flows[i])}
                        </span>
                    </div>
                );
            } else {
                rows.push(
                    <div key={i} className="flex justify-between text-xs mb-1 px-2 h-4 items-center">
                        <span className="invisible">0</span>
                        <span className="invisible">$0.00</span>
                    </div>
                );
            }
        }
        return rows;
    };

    const totalPages = 2 + data.properties.length;

    // Letter size height style for pages
    const pageStyle = { height: '279.4mm', width: '215.9mm' };

    return (
        <div className="max-w-5xl mx-auto my-8 pb-20 bg-gray-100 min-h-screen">
             <div className="flex justify-between items-center mb-6 px-4 print:hidden">
                <button onClick={onBack} className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded shadow-sm hover:bg-gray-50">
                    &larr; Editar Datos
                </button>
                <button
                    onClick={handleDownloadPdf}
                    disabled={isDownloading}
                    className="bg-blue-900 text-white px-6 py-2 rounded shadow-sm hover:bg-blue-800 font-bold disabled:opacity-60"
                >
                    {isDownloading ? 'Generando PDF...' : 'Descargar PDF'}
                </button>
            </div>

            {/* Container for PDF Generation - Width set to Letter width */}
            <div id="report-content" className="mx-auto bg-white shadow-none" style={{ width: '215.9mm' }}>

                {/* --- PAGE 1: TERM SHEET --- */}
                <div className="relative overflow-hidden flex flex-col" style={pageStyle}>
                     {/* Background Image */}
                     {data.letterheadImage && (
                        <img src={data.letterheadImage} className="absolute inset-0 w-full h-full z-0" alt="" />
                    )}

                    {/* Content Overlay */}
                    <div className="relative z-10 p-12 h-full flex flex-col pt-28">
                        <div className="text-center mb-8">
                            <h1 className="font-bold text-xl text-black uppercase mb-4">ESQUEMA DE CO-INVERSION</h1>
                            <p className="text-center text-black text-sm px-8 leading-relaxed font-medium">
                                {data.mainDescription}
                            </p>
                        </div>

                        {/* Main Table */}
                        <div className="mb-6">
                            <table className="w-full border-collapse border border-black">
                                <tbody>
                                    <TermSheetRow label="Valor Subyacente:" value={formatCurrency(data.valorSubyacente)} />
                                    <TermSheetRow label="Valor Crédito:" value={formatCurrency(data.valorCredito)} />
                                    <TermSheetRow label="LTV:" value={formatPercent(data.ltv)} />

                                    <TermSheetRow label="Posición Inversionista:" value={`${formatCurrency(data.posicionInversionista)} (${formatPercent(data.posicionInversionistaPorcentaje)})`} />

                                    <TermSheetRow label="Plazo:" value={`${data.plazo} Meses (Posibilidad de extensión ${data.extensionPlazo} meses)`} />

                                    <TermSheetRow label="Tasa Nominal Inversionista (Anual):" value={formatPercent(data.tasaNominalInversionistaAnual)} />

                                    {data.feeOriginacionMonto > 0 && (
                                        <TermSheetRow label="Fee de Originación:" value={`${formatPercent(data.feeOriginacionPorcentaje)} (${formatCurrency(data.feeOriginacionMonto)}) (Una sola vez al inicio)`} />
                                    )}

                                    <TermSheetRow label="Retorno Mensual Inversionista:" value={formatCurrency(data.retornoMensualInversionista)} />

                                    {data.interesesAnticipadosMonto > 0 && (
                                        <TermSheetRow label="Intereses Anticipados:" value={`${formatCurrency(data.interesesAnticipadosMonto)} (${data.interesesAnticipadosMeses} Meses)`} />
                                    )}

                                    {(data.feeOriginacionMonto > 0 || data.interesesAnticipadosMonto > 0) && (
                                        <TermSheetRow label="Total Giro Inversionista:" value={<span className="font-bold">{formatCurrency(data.totalGiroInversionista)}</span>} />
                                    )}

                                    {/* Security Rings */}
                                    <tr>
                                        <td colSpan={2} className="border border-black p-4">
                                            <h3 className="font-bold text-black mb-4 text-sm">Anillos de Seguridad:</h3>
                                            <div className="grid grid-cols-2 gap-x-4">
                                                <div>
                                                    <SecurityRingItem number={1} text={`LTV ≤ ${formatPercent(data.ltv)}`} />
                                                    <SecurityRingItem number={2} text="Avalúo Certificado" />
                                                    <SecurityRingItem number={3} text="Hipoteca" />
                                                    <SecurityRingItem number={4} text="Pagaré con recurso." />
                                                </div>
                                                <div>
                                                    <SecurityRingItem number={5} text="Acuerdo de Garantía" />
                                                    <SecurityRingItem number={6} text="Seguro Todo Riesgo" />
                                                    <SecurityRingItem number={7} text="Proceso de KYC/BSA-AM" />
                                                    <SecurityRingItem number={8} text="Asignación Rentas" />
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Notes */}
                        <div className="text-[10px] text-black leading-tight mt-2 space-y-2">
                            <p><span className="font-bold">Nota:</span> {data.note1}</p>
                            <p>{data.note2}</p>
                        </div>

                        {!data.letterheadImage && (
                             <div className="mt-auto text-xs text-gray-500 text-center pb-4">{data.footerAddress}</div>
                        )}
                        <div className="absolute bottom-12 right-12 text-xs font-bold">Page 1 of {totalPages}</div>
                    </div>
                </div>

                {/* --- PAGE 2: CASH FLOW (SENSIBILIDAD) --- */}
                <div className="relative overflow-hidden flex flex-col" style={pageStyle}>
                    {data.letterheadImage && (
                        <img src={data.letterheadImage} className="absolute inset-0 w-full h-full z-0" alt="" />
                    )}

                    <div className="relative z-10 p-12 h-full flex flex-col pt-28">
                        <h2 className="text-center font-bold text-lg text-black mb-10">Sensibilidad al Momento de Pago</h2>

                        {/* Flow Tables */}
                        <div className="flex justify-center gap-4 mb-12">
                            {/* Scenario 1 */}
                            <div className="w-1/3 border-2 border-black flex flex-col">
                                <div className="bg-gray-200 border-b-2 border-black p-2 text-center">
                                    <p className="font-bold text-xs text-blue-900">Flujo Inv.</p>
                                    <p className="font-bold text-xs text-blue-900">({data.scenario1Month} Meses)</p>
                                </div>
                                <div className="p-2 flex-grow">
                                    {renderFlowTableBody(data.flowsScenario1)}
                                </div>
                                <div className="border-t-2 border-black p-2 flex justify-between items-center bg-white mt-auto">
                                    <span className="font-bold text-xs text-blue-900 uppercase">TIR</span>
                                    <span className="font-bold text-xs text-blue-900">{formatPercent(data.tirScenario1 * 100)}</span>
                                </div>
                            </div>

                            {/* Scenario 2 */}
                            <div className="w-1/3 border-2 border-black flex flex-col">
                                <div className="bg-gray-200 border-b-2 border-black p-2 text-center">
                                    <p className="font-bold text-xs text-blue-900">Flujo Inv.</p>
                                    <p className="font-bold text-xs text-blue-900">({data.scenario2Month} Meses)</p>
                                </div>
                                <div className="p-2 flex-grow">
                                    {renderFlowTableBody(data.flowsScenario2)}
                                </div>
                                <div className="border-t-2 border-black p-2 flex justify-between items-center bg-white mt-auto">
                                    <span className="font-bold text-xs text-blue-900 uppercase">TIR</span>
                                    <span className="font-bold text-xs text-blue-900">{formatPercent(data.tirScenario2 * 100)}</span>
                                </div>
                            </div>

                            {/* Scenario 3 (Full) */}
                            <div className="w-1/3 border-2 border-black flex flex-col">
                                <div className="bg-gray-200 border-b-2 border-black p-2 text-center">
                                    <p className="font-bold text-xs text-blue-900">Flujo Inv.</p>
                                    <p className="font-bold text-xs text-blue-900">({data.scenario3Month} Meses)</p>
                                </div>
                                <div className="p-2 flex-grow">
                                    {renderFlowTableBody(data.flowsScenario3)}
                                </div>
                                <div className="border-t-2 border-black p-2 flex justify-between items-center bg-white mt-auto">
                                    <span className="font-bold text-xs text-blue-900 uppercase">TIR</span>
                                    <span className="font-bold text-xs text-blue-900">{formatPercent(data.tirScenario3 * 100)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Signatures */}
                        {data.includeSignatures && (
                            <div className="mt-auto mb-20 px-8 flex justify-between items-end">
                                <div className="w-5/12">
                                    <div className="h-16 mb-2"></div>
                                    <div className="border-t-2 border-black pt-2">
                                        <p className="text-base font-normal text-black">{data.signer1Name}</p>
                                        <p className="text-base font-normal text-black mt-1">{data.signer1Title}</p>
                                    </div>
                                </div>
                                <div className="w-5/12">
                                    <div className="h-16 mb-2"></div>
                                    <div className="border-t-2 border-black pt-2">
                                        <div className="h-6"></div>
                                        <p className="text-base font-normal text-black">{data.signer2Name}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="absolute bottom-12 right-12 text-xs font-bold">Page 2 of {totalPages}</div>
                    </div>
                </div>

                {/* --- PAGE 3+: PROPERTY INFO (Dynamic) --- */}
                {data.properties.map((property, index) => (
                    <div key={property.id} className="relative overflow-hidden flex flex-col" style={pageStyle}>
                        {data.letterheadImage && (
                            <img src={data.letterheadImage} className="absolute inset-0 w-full h-full z-0" alt="" />
                        )}

                        <div className="relative z-10 p-12 h-full flex flex-col pt-28">
                            <div className="mb-8 pl-4">
                                <h2 className="font-bold text-xl text-black mb-6">Información de la Propiedad {data.properties.length > 1 ? `(${index + 1})` : ''}</h2>
                                <div className="space-y-4 text-black font-medium text-sm">
                                    <div className="flex">
                                        <span className="font-bold w-48">Tipo:</span>
                                        <span>{property.type}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-48">Número de Puertas:</span>
                                        <span>{property.doors}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-48">Dirección:</span>
                                        <span>{property.address}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="font-bold w-48"></span>
                                        <span>{property.cityStateZip}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Image Grid */}
                            <div className="grid grid-cols-2 gap-2 mt-4 h-[500px]">
                                {property.images.map((img, idx) => (
                                    <div key={idx} className="w-full h-full overflow-hidden border border-gray-300 bg-gray-100">
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>

                            <div className="absolute bottom-12 right-12 text-xs font-bold">Page {3 + index} of {totalPages}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ReportView;
