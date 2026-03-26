import React, { useState } from 'react';
import type { InvestmentData } from './types';
import DataInputView from './DataInputView';
import ReportView from './ReportView';

interface TermSheetsPageProps {
    sharedLetterhead?: string | null;
}

export const TermSheetsPage: React.FC<TermSheetsPageProps> = ({ sharedLetterhead }) => {
    const [investmentData, setInvestmentData] = useState<InvestmentData | null>(null);
    return investmentData ? (
        <ReportView data={investmentData} onBack={() => setInvestmentData(null)} />
    ) : (
        <DataInputView onSubmit={setInvestmentData} sharedLetterhead={sharedLetterhead} />
    );
};
