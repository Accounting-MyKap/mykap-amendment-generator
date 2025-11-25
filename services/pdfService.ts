import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ExcelRow, ColumnConfig, Template, MergeFieldValues } from '../types';

interface PDFGeneratorProps {
  template: Template;
  data: ExcelRow[];
  columns: ColumnConfig[];
  highlightedRows: Set<number>;
  letterhead: string | null;
  mergeFieldValues?: MergeFieldValues;
}

// --- Formatting Helpers ---

export const formatCurrency = (value: any): string => {
  if (value === undefined || value === null || value === '') return '$0.00';
  const num = parseFloat(String(value).replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(num);
};

export const formatPercent = (value: any): string => {
  if (value === undefined || value === null || value === '') return '-';

  const strVal = String(value);
  // Remove non-numeric characters except dot and minus
  let num = parseFloat(strVal.replace(/[^0-9.-]+/g, ''));
  if (isNaN(num)) return '-';

  // Logic updated: We trust the Excel displayed value (because raw: false is used).
  // If Excel says "0.46%", we get that string, parse 0.46, and return "0.46%".
  // If Excel says "8.01" (meaning 8.01%), we return "8.01%".
  // We NO LONGER multiply by 100 based on magnitude.

  return num.toFixed(2) + '%';
};

export const formatDate = (value: any): string => {
  if (!value) return '-';

  // Excel serial date handling
  if (typeof value === 'number') {
    // Excel base date is Dec 30, 1899
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    const userOffset = date.getTimezoneOffset() * 60000;
    const adjustedDate = new Date(date.getTime() + userOffset);

    return adjustedDate.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  }

  // String parsing
  const date = new Date(value);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric'
    });
  }

  return String(value);
};

// --- Calculation Helpers ---

const cleanNumber = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.-]+/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// --- Merge Fields Helper ---

const replaceMergeFields = (text: string, values?: MergeFieldValues): string => {
  if (!values || !text) return text;
  let newText = text;
  Object.entries(values).forEach(([key, value]) => {
    // Replace all occurrences of the key (e.g. {{ClientName}})
    // We escape special regex characters in the key just in case
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escapedKey, 'g');
    newText = newText.replace(regex, value);
  });
  return newText;
};

// --- Main Generator ---

export const generatePDF = ({
  template,
  data,
  columns,
  highlightedRows,
  letterhead,
  mergeFieldValues
}: PDFGeneratorProps) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter' // 215.9 x 279.4 mm
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // 1. Draw Letterhead
  if (letterhead) {
    doc.addImage(letterhead, 'JPEG', 0, 0, pageWidth, pageHeight);
  }

  // Position cursor for text (Adjust this value to move body text up/down)
  let currentY = 40;

  // 2. Document Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);

  const titleText = replaceMergeFields(template.title, mergeFieldValues);
  doc.text(titleText, pageWidth / 2, currentY, { align: 'center' });

  currentY += 10;

  // 3. Body Text
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const bodyText = replaceMergeFields(template.body, mergeFieldValues);
  const maxWidth = pageWidth - (margin * 2);

  // Manual Justification Logic
  // 1. Split into paragraphs (handling user-entered newlines)
  const paragraphs = bodyText.split('\n');

  paragraphs.forEach((paragraph) => {
    // 2. Split paragraph into lines that fit maxWidth
    const lines = doc.splitTextToSize(paragraph, maxWidth);

    lines.forEach((line: string, index: number) => {
      // 3. Justify all lines EXCEPT the last one of the paragraph
      const isLastLine = index === lines.length - 1;

      doc.text(line, margin, currentY, {
        maxWidth: maxWidth,
        align: isLastLine ? 'left' : 'justify'
      });

      // Move cursor down (approx 5 units per line based on font size 11)
      // precise height: doc.getTextDimensions(line).h is safer but slower? 
      // standard leading is usually 1.15 * fontSize. 11pt ~= 3.88mm. 
      // 5mm is a comfortable line height.
      currentY += 5;
    });

    // Add extra space between paragraphs? Optional.
    // currentY += 2; 
  });

  // Adjust currentY slightly back up if we added too much space after the last line
  // or just leave it as padding.
  currentY += 2;

  // Height already updated in the loop above

  // 4. Data Processing

  // Filter out existing "Totals" rows from Excel if they exist to prevent double counting
  const cleanData = data.filter(row => {
    const val = String(row['Loan Account'] || '').toLowerCase();
    return !val.includes('total');
  });

  // Calculate Footer Data
  let totalBalance = 0;
  let totalRegularPayment = 0;
  let weightedInterestSum = 0;

  cleanData.forEach(row => {
    const balance = cleanNumber(row['Loan Balance']);
    const payment = cleanNumber(row['Regular Payment']);

    // Handle percent logic for calculation
    const rateVal = row['Interest Rate'];
    const rate = cleanNumber(rateVal);

    // Logic updated: Trust exact value due to raw: false import
    // No more * 100 multiplication heuristic.

    totalBalance += balance;
    totalRegularPayment += payment;
    weightedInterestSum += (rate * balance);
  });

  const portfolioYield = totalBalance > 0 ? (weightedInterestSum / totalBalance) : 0;
  const loanCount = cleanData.length;

  const visibleColumns = columns.filter(c => c.visible);

  // Map data to formatted table rows
  const tableBody = cleanData.map(row => {
    return visibleColumns.map(col => {
      const val = row[col.key];

      if (col.key === 'Interest Rate' || col.key === 'Percent Owned') {
        return formatPercent(val);
      }
      if (col.key === 'Loan Balance' || col.key === 'Regular Payment') {
        return formatCurrency(val);
      }
      if (col.key === 'Maturity Date' || col.key === 'Next Payment Date' || col.key === 'Interest Paid To Date') {
        return formatDate(val);
      }
      return val !== undefined ? String(val) : '';
    });
  });

  // Create Footer Row
  const footerRow = visibleColumns.map((col, index) => {
    if (index === 0) return 'Totals';
    if (col.key === 'Borrower Name') {
      return `Portfolio Yield: ${portfolioYield.toFixed(4)}% (${loanCount} loans)`;
    }
    if (col.key === 'Loan Balance') return formatCurrency(totalBalance);
    if (col.key === 'Regular Payment') return formatCurrency(totalRegularPayment);
    return ''; // Empty for other columns
  });

  // 5. Generate Table
  autoTable(doc, {
    startY: currentY,
    head: [visibleColumns.map(c => c.label)],
    body: tableBody,
    foot: [footerRow],
    theme: 'striped',
    styles: {
      fontSize: 8,
      halign: 'center',
      cellPadding: 2,
      lineColor: [220, 220, 220],
      lineWidth: 0, // 0 removes borders
    },
    headStyles: {
      fillColor: [41, 75, 160], // MyKap Blue
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    footStyles: {
      fillColor: [240, 240, 240], // Light Gray
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center'
    },
    // Custom Hooks
    didParseCell: (data) => {
      // Highlight body rows
      if (data.section === 'body' && highlightedRows.has(data.row.index)) {
        data.cell.styles.fillColor = [255, 240, 100];
        data.cell.styles.textColor = [0, 0, 0];
      }

      // Footer alignment adjustments
      if (data.section === 'foot') {
        if (data.column.index === 0) { // 'Totals' label
          data.cell.styles.halign = 'left';
        }
        if (visibleColumns[data.column.index].key === 'Borrower Name') {
          data.cell.styles.halign = 'left';
        }
      }
    },
    margin: { left: margin, right: margin },
  });

  // 6. Signatures
  const finalY = (doc as any).lastAutoTable.finalY || currentY;

  // Logic to handle page overflow for signatures
  // We want 60 units of space before signatures.
  let signatureY = finalY + 30;

  // Check if signatures will fit on the page. 
  // We assume signatures need about 30 units of height (3 lines text + margin)
  // If (start position + required height) > page height
  if (signatureY + 30 > pageHeight) {
    doc.addPage();

    // Re-add letterhead on new page
    if (letterhead) {
      doc.addImage(letterhead, 'JPEG', 0, 0, pageWidth, pageHeight);
    }

    // Reset Y to top of new page (adjust based on header space if needed)
    signatureY = 60;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');

  // Left Signature (Centered in left half)
  const leftSigText = replaceMergeFields(template.signatureLeft, mergeFieldValues);
  const leftLines = leftSigText.split('\n');
  let leftY = signatureY;
  const leftCenterX = pageWidth / 4;

  leftLines.forEach(line => {
    doc.text(line, leftCenterX, leftY, { align: 'center' });
    leftY += 5;
  });

  // Right Signature (Centered in right half)
  const rightSigText = replaceMergeFields(template.signatureRight, mergeFieldValues);
  const rightLines = rightSigText.split('\n');
  let rightY = signatureY;
  const rightCenterX = (pageWidth / 4) * 3;

  rightLines.forEach(line => {
    doc.text(line, rightCenterX, rightY, { align: 'center' });
    rightY += 5;
  });

  doc.save(`${titleText.replace(/[\/\\?%*:|"<>]/g, '_')}.pdf`);
};