'use client';

import { useState } from 'react';

export default function PDMPPage() {
  const [query, setQuery] = useState({ firstName: '', lastName: '', dob: '', state: '' });
  const [result, setResult] = useState<any>(null);

  const handleQuery = () => {
    // Mock PDMP result
    setResult({
      riskLevel: 'moderate',
      prescriberCount: 2,
      pharmacyCount: 1,
      totalMME: 45,
      alerts: [
        { type: 'early_refill', severity: 'warning', title: 'Early Refill Detected' },
      ],
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">PDMP Review</h1>
      
      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Query PDMP</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              value={query.firstName}
              onChange={(e) => setQuery({ ...query, firstName: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              value={query.lastName}
              onChange={(e) => setQuery({ ...query, lastName: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input
              type="date"
              value={query.dob}
              onChange={(e) => setQuery({ ...query, dob: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">State</label>
            <input
              value={query.state}
              onChange={(e) => setQuery({ ...query, state: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="CA"
              maxLength={2}
            />
          </div>
        </div>

        <button
          onClick={handleQuery}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Query PDMP
        </button>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4">PDMP Results</h2>
            
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Risk Level</div>
                <div className="text-xl font-bold text-yellow-600">{result.riskLevel}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Prescribers</div>
                <div className="text-xl font-bold">{result.prescriberCount}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Pharmacies</div>
                <div className="text-xl font-bold">{result.pharmacyCount}</div>
              </div>
              <div className="p-4 bg-gray-50 rounded">
                <div className="text-sm text-gray-600">Total MME</div>
                <div className="text-xl font-bold">{result.totalMME}</div>
              </div>
            </div>

            <div className="space-y-2">
              {result.alerts.map((alert: any, i: number) => (
                <div key={i} className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <div className="font-medium text-yellow-900">{alert.title}</div>
                  <div className="text-sm text-yellow-700">Severity: {alert.severity}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 bg-white rounded-lg shadow">
            <h2 className="text-lg font-bold mb-4">Pharmacist Review</h2>
            
            <div>
              <label className="block text-sm font-medium mb-1">Justification / Notes</label>
              <textarea
                className="w-full border rounded px-3 py-2"
                rows={4}
                placeholder="Document clinical justification for dispensing..."
              />
            </div>

            <button className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
              Approve & Log Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
