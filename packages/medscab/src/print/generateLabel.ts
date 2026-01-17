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
}

export function generateLabel(data: LabelData): string {
  const fillDateStr = data.fillDate.toLocaleDateString();
  
  // Generate ZPL (Zebra Programming Language) format
  const zpl = `
^XA
^FO50,50^A0N,30,30^FDRx #${data.rxNumber}^FS
^FO50,100^A0N,25,25^FD${data.patientName}^FS
^FO50,150^A0N,20,20^FD${data.drugName} ${data.strength}^FS
^FO50,200^A0N,18,18^FD${data.directions}^FS
^FO50,250^A0N,18,18^FDQty: ${data.quantity}  Refills: ${data.refills}^FS
^FO50,300^A0N,18,18^FDFilled: ${fillDateStr}^FS
^FO50,350^A0N,16,16^FDPrescriber: ${data.prescriber}^FS
^FO50,400^A0N,16,16^FD${data.pharmacyName}^FS
^FO50,430^A0N,16,16^FD${data.pharmacyPhone}^FS
^XZ
`.trim();

  return zpl;
}

export function printLabel(zpl: string): void {
  // In production, send to printer service
  console.log('Printing label:', zpl);
}
