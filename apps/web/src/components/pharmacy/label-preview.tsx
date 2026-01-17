'use client';

interface LabelPreviewProps {
  prescription: {
    rxNumber: string;
    patientName: string;
    patientAddress?: string;
    dateOfBirth?: string;
    drugName: string;
    drugStrength: string;
    drugForm: string;
    quantity: number;
    daysSupply: number;
    sig: string;
    refillsRemaining: number;
    refillsTotal: number;
    prescriberName: string;
    prescriberAddress?: string;
    pharmacyName?: string;
    pharmacyAddress?: string;
    pharmacyPhone?: string;
    dispensedDate?: string;
    expirationDate?: string;
    lotNumber?: string;
    ndc?: string;
    isControlled?: boolean;
    scheduleClass?: string;
    auxiliaryLabels?: string[];
    warnings?: string[];
  };
  onPrint?: () => void;
  showAuxiliary?: boolean;
  compact?: boolean;
}

const defaultPharmacy = {
  name: 'Xoai Pharmacy',
  address: '123 Healthcare Blvd, Springfield, IL 62701',
  phone: '(555) 123-4567',
};

export function LabelPreview({
  prescription,
  onPrint,
  showAuxiliary = true,
  compact = false,
}: LabelPreviewProps) {
  const pharmacyName = prescription.pharmacyName || defaultPharmacy.name;
  const pharmacyAddress = prescription.pharmacyAddress || defaultPharmacy.address;
  const pharmacyPhone = prescription.pharmacyPhone || defaultPharmacy.phone;
  const dispensedDate = prescription.dispensedDate || new Date().toLocaleDateString();

  if (compact) {
    return (
      <div className="bg-white border-2 border-slate-300 rounded-lg p-3 font-mono text-xs">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-bold">{pharmacyName}</p>
            <p className="text-slate-600">{pharmacyPhone}</p>
          </div>
          <p className="font-bold">Rx# {prescription.rxNumber}</p>
        </div>
        <div className="border-t border-slate-200 pt-2">
          <p className="font-bold text-sm">{prescription.patientName}</p>
          <p className="font-bold mt-1">
            {prescription.drugName} {prescription.drugStrength} {prescription.drugForm}
          </p>
          <p className="mt-1">{prescription.sig}</p>
          <div className="flex justify-between mt-2 text-slate-600">
            <span>Qty: {prescription.quantity}</span>
            <span>{prescription.daysSupply} days</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Label */}
      <div className="bg-white border-2 border-slate-800 rounded-lg overflow-hidden">
        {/* Pharmacy Header */}
        <div className="bg-slate-800 text-white px-4 py-2 text-center">
          <p className="font-bold text-lg">{pharmacyName}</p>
          <p className="text-sm text-slate-300">{pharmacyAddress}</p>
          <p className="text-sm text-slate-300">{pharmacyPhone}</p>
        </div>

        {/* Prescription Content */}
        <div className="p-4 font-mono">
          {/* Rx Number and Date */}
          <div className="flex justify-between items-start mb-3 pb-2 border-b border-slate-200">
            <div>
              <p className="text-lg font-bold">Rx# {prescription.rxNumber}</p>
              <p className="text-sm text-slate-600">Date: {dispensedDate}</p>
            </div>
            <div className="text-right">
              {prescription.isControlled && (
                <span className="inline-block px-2 py-1 text-xs font-bold bg-red-100 text-red-700 rounded mb-1">
                  {prescription.scheduleClass || 'C-II'}
                </span>
              )}
              <p className="text-sm text-slate-600">
                Refills: {prescription.refillsRemaining}/{prescription.refillsTotal}
              </p>
            </div>
          </div>

          {/* Patient Info */}
          <div className="mb-3">
            <p className="font-bold text-lg">{prescription.patientName}</p>
            {prescription.patientAddress && (
              <p className="text-sm text-slate-600">{prescription.patientAddress}</p>
            )}
            {prescription.dateOfBirth && (
              <p className="text-sm text-slate-600">DOB: {prescription.dateOfBirth}</p>
            )}
          </div>

          {/* Drug Info */}
          <div className="bg-slate-100 rounded-lg p-3 mb-3">
            <p className="text-xl font-bold">
              {prescription.drugName} {prescription.drugStrength}
            </p>
            <p className="text-sm text-slate-600">{prescription.drugForm}</p>
            {prescription.ndc && (
              <p className="text-xs text-slate-500 font-mono mt-1">NDC: {prescription.ndc}</p>
            )}
          </div>

          {/* Directions */}
          <div className="mb-3">
            <p className="text-sm font-semibold text-slate-600 mb-1">DIRECTIONS:</p>
            <p className="text-lg font-bold leading-tight">{prescription.sig}</p>
          </div>

          {/* Quantity and Supply */}
          <div className="flex justify-between items-center mb-3 py-2 border-y border-slate-200">
            <div>
              <span className="text-sm text-slate-600">Qty: </span>
              <span className="font-bold text-lg">{prescription.quantity}</span>
            </div>
            <div>
              <span className="text-sm text-slate-600">Days Supply: </span>
              <span className="font-bold text-lg">{prescription.daysSupply}</span>
            </div>
          </div>

          {/* Prescriber */}
          <div className="mb-3">
            <p className="text-sm text-slate-600">Prescriber:</p>
            <p className="font-semibold">{prescription.prescriberName}</p>
            {prescription.prescriberAddress && (
              <p className="text-xs text-slate-500">{prescription.prescriberAddress}</p>
            )}
          </div>

          {/* Lot and Expiration */}
          {(prescription.lotNumber || prescription.expirationDate) && (
            <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
              {prescription.lotNumber && <span>Lot: {prescription.lotNumber}</span>}
              {prescription.expirationDate && <span>Exp: {prescription.expirationDate}</span>}
            </div>
          )}

          {/* Warnings */}
          {prescription.warnings && prescription.warnings.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-200">
              {prescription.warnings.map((warning, index) => (
                <p key={index} className="text-xs text-red-700 font-bold flex items-center gap-1">
                  <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {warning}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Barcode Area (simulated) */}
        <div className="bg-slate-50 px-4 py-2 text-center border-t border-slate-200">
          <div className="inline-block bg-white px-3 py-1">
            <div className="flex items-center justify-center gap-0.5 h-8">
              {Array.from({ length: 30 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-slate-800"
                  style={{
                    width: Math.random() > 0.5 ? '2px' : '1px',
                    height: '100%',
                  }}
                />
              ))}
            </div>
            <p className="text-xs font-mono mt-1">{prescription.rxNumber}</p>
          </div>
        </div>
      </div>

      {/* Auxiliary Labels */}
      {showAuxiliary && prescription.auxiliaryLabels && prescription.auxiliaryLabels.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-700">Auxiliary Labels:</p>
          <div className="flex flex-wrap gap-2">
            {prescription.auxiliaryLabels.map((label, index) => (
              <div
                key={index}
                className="px-3 py-2 bg-amber-100 border border-amber-300 rounded-lg text-sm font-bold text-amber-900"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print Button */}
      {onPrint && (
        <button
          onClick={onPrint}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print Label (F8)
        </button>
      )}
    </div>
  );
}
