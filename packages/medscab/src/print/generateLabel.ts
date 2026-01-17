interface LabelData {
  rxNumber: string;
  patientName: string;
  drugName: string;
  strength: string;
  directions: string;
  quantity: number;
  refills: number;
  fillDate: Date;
  prescriber: string;
  pharmacyName: string;
  pharmacyPhone: string;
  pharmacyAddress?: string;
  ndc?: string;
  lotNumber?: string;
  expirationDate?: Date;
  auxiliaryLabels?: string[];
  isControlled?: boolean;
}

export function generateLabel(data: LabelData): string {
  const fillDateStr = data.fillDate.toLocaleDateString();
  const expDateStr = data.expirationDate?.toLocaleDateString() || 'N/A';
  
  // Generate ZPL (Zebra Programming Language) format
  const zpl = `
^XA
^FO50,50^A0N,30,30^FDRx #${data.rxNumber}^FS
^FO50,100^A0N,25,25^FD${data.patientName}^FS
^FO50,150^A0N,20,20^FD${data.drugName} ${data.strength}^FS
^FO50,200^A0N,18,18^FD${data.directions}^FS
^FO50,250^A0N,18,18^FDQty: ${data.quantity}  Refills: ${data.refills}^FS
^FO50,300^A0N,18,18^FDFilled: ${fillDateStr}  Exp: ${expDateStr}^FS
${data.lotNumber ? `^FO50,330^A0N,16,16^FDLot: ${data.lotNumber}^FS` : ''}
${data.ndc ? `^FO50,360^A0N,16,16^FDNDC: ${data.ndc}^FS` : ''}
^FO50,400^A0N,16,16^FDPrescriber: ${data.prescriber}^FS
^FO50,430^A0N,16,16^FD${data.pharmacyName}^FS
^FO50,460^A0N,16,16^FD${data.pharmacyPhone}^FS
${data.isControlled ? '^FO50,500^A0N,20,20^FDCONTROLLED SUBSTANCE^FS' : ''}
^XZ
`.trim();

  return zpl;
}

export function generatePDFLabel(data: LabelData): string {
  // Generate HTML for PDF conversion
  return `
    <div style="width: 4in; padding: 0.25in; font-family: Arial, sans-serif;">
      <div style="font-size: 18px; font-weight: bold; margin-bottom: 8px;">Rx #${data.rxNumber}</div>
      <div style="font-size: 16px; font-weight: bold; margin-bottom: 12px;">${data.patientName}</div>
      <div style="font-size: 14px; margin-bottom: 8px;">${data.drugName} ${data.strength}</div>
      <div style="font-size: 12px; margin-bottom: 12px; border: 1px solid #000; padding: 8px;">
        ${data.directions}
      </div>
      <div style="font-size: 11px; margin-bottom: 4px;">Qty: ${data.quantity} &nbsp; Refills: ${data.refills}</div>
      <div style="font-size: 11px; margin-bottom: 4px;">Filled: ${data.fillDate.toLocaleDateString()}</div>
      ${data.expirationDate ? `<div style="font-size: 11px; margin-bottom: 4px;">Exp: ${data.expirationDate.toLocaleDateString()}</div>` : ''}
      ${data.lotNumber ? `<div style="font-size: 10px; margin-bottom: 4px;">Lot: ${data.lotNumber}</div>` : ''}
      ${data.ndc ? `<div style="font-size: 10px; margin-bottom: 8px;">NDC: ${data.ndc}</div>` : ''}
      ${data.auxiliaryLabels?.length ? `
        <div style="margin: 8px 0;">
          ${data.auxiliaryLabels.map(label => `
            <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 4px; margin: 2px 0; font-size: 10px;">
              ${label}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${data.isControlled ? '<div style="background: #fee; border: 2px solid #f00; padding: 6px; margin: 8px 0; font-weight: bold; text-align: center;">CONTROLLED SUBSTANCE</div>' : ''}
      <div style="font-size: 10px; margin-top: 12px; border-top: 1px solid #ccc; padding-top: 8px;">
        <div>Prescriber: ${data.prescriber}</div>
        <div>${data.pharmacyName}</div>
        <div>${data.pharmacyPhone}</div>
        ${data.pharmacyAddress ? `<div>${data.pharmacyAddress}</div>` : ''}
      </div>
    </div>
  `;
}

export function printLabel(zpl: string, printerName?: string): void {
  // In production, send to printer service or local print queue
  console.log('Printing label to:', printerName || 'default printer');
  console.log('ZPL:', zpl);
  
  // Example: Send to local print server
  // fetch('/api/print', { method: 'POST', body: JSON.stringify({ zpl, printer: printerName }) });
}

export function previewLabel(data: LabelData): string {
  return generatePDFLabel(data);
}
