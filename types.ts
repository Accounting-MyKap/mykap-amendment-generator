
export interface Template {
  id: string;
  name: string;
  title: string;
  body: string;
  signatureLeft: string;
  signatureRight: string;
  allowedMergeFieldIds?: string[];
}

export interface MergeField {
  id: string;
  label: string;
  key: string;
}

export type MergeFieldValues = Record<string, string>;

export interface ExcelRow {
  [key: string]: any;
}

export interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
}

export const DEFAULT_COLUMNS = [
  "Loan Account",
  "Borrower Name",
  "Interest Rate",
  "Maturity Date",
  "Term Left",
  "Regular Payment",
  "Loan Balance"
];

export const DEFAULT_TEMPLATES: Template[] = [
  {
    id: '1',
    name: 'Amendment - New Co-investor',
    title: 'Amendment – Jul 10, 2025',
    body: 'The Co-Investor JOHANNA ANDREA CUELLAR is entering with $50,000 to participate as the beneficiary of the mortgages that are list below.\n\nHere is a summary of the composition of your portfolio:',
    signatureLeft: 'Diego Felipe Quesada\nManager',
    signatureRight: 'JOHANNA ANDREA CUELLAR\nCo-Investor'
  },
  {
    id: '2',
    name: 'Amendment - Addition',
    title: 'Amendment – Nov 12, 2025',
    body: 'The Co-Investor VANESSA GARCIA has increased its value by $6,600.00 leaving its total investment to date at $135,750.00.\n\nBelow is a summary of the composition of your portfolio:',
    signatureLeft: 'Diego Felipe Quesada\nManager',
    signatureRight: 'VANESSA GARCIA\nCo-Investor'
  },
  {
    id: '3',
    name: 'Amendment - Extension',
    title: 'Amendment – Jul 10, 2025',
    body: 'Due to the loan ML-023 from Projects and Services LLC has requested a 3-month extension, by mutual agreement, co-investor MAURICIO CHARRY and MYKAP have decided to maintain the position at a rate of 8.80%, leaving his total portfolio as shown below.',
    signatureLeft: 'Diego Felipe Quesada\nManager',
    signatureRight: 'MAURICIO CHARRY\nCo-Investor'
  },
  {
    id: '4',
    name: 'Amendment - Funds Return',
    title: 'Amendment – Jul 10, 2025',
    body: 'Since GERARDO CHIRINOS loan ML-087, in which INVERSIONES TRES VELAS SAS held a participation, has made a payoff, the co-investor has been decided to request the return of his funds, which will be deposited into his bank account. This table provides a summary of your portfolio terms as of today.',
    signatureLeft: 'Diego Felipe Quesada\nManager',
    signatureRight: 'MAURICIO CHARRY\nCo-Investor'
  }
];
