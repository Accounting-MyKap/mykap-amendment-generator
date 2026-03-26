export interface CustomField {
  id: string;
  label: string;
  value: string;
}

export interface PropertyData {
  id: string;
  type: string;
  doors: string;
  address: string;
  cityStateZip: string;
  images: string[]; // Array of base64 strings
}

export interface InvestmentData {
  valorSubyacente: number;
  valorCredito: number;
  ltv: number;
  posicionInversionista: number;
  posicionInversionistaPorcentaje: number;
  plazo: number;
  extensionPlazo: number;
  retornoMensualInversionista: number;
  feeOriginacionPorcentaje: number;
  feeOriginacionMonto: number;
  interesesAnticipadosMeses: number;
  interesesAnticipadosMonto: number;
  tasaNominalInversionistaAnual: number;
  totalGiroInversionista: number;

  // Scenarios
  scenario1Month: number;
  scenario2Month: number;
  scenario3Month: number;
  flowsScenario1: number[];
  flowsScenario2: number[];
  flowsScenario3: number[];
  tirScenario1: number;
  tirScenario2: number;
  tirScenario3: number;

  // Content
  customFields: CustomField[];
  mainDescription: string;
  note1: string;
  note2: string;
  footerAddress: string;
  pageNumber: string;

  // Properties
  properties: PropertyData[];

  // Signatures
  signer1Name: string;
  signer1Title: string;
  signer2Name: string;
  includeSignatures: boolean;

  letterheadImage?: string | null;
}

export type InputData = {
  valorSubyacente: string;
  valorCredito: string;
  posicionInversionista: string;
  plazo: string;
  extensionPlazo: string;
  feeOriginacionPorcentaje: string;
  interesesAnticipadosMeses: string;
  tasaNominalInversionistaAnual: string;

  // Scenarios inputs
  scenario2Month: string;
  scenario3Month: string;

  // Content
  mainDescription: string;
  note1: string;
  note2: string;
  footerAddress: string;

  // Properties
  properties: PropertyData[];

  // Signers
  signer1Name: string;
  signer1Title: string;
  signer2Name: string;
  includeSignatures: boolean;
}

export enum InputType {
  FORM = 'form',
  FILE = 'file'
}
