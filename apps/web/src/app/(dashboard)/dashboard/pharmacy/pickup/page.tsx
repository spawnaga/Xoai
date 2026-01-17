'use client';

import { useState } from 'react';
import { api } from '@/lib/trpc';

export default function PickupPage() {
  const [search, setSearch] = useState({ first: '', last: '', dob: '' });
  const [signature, setSignature] = useState('');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Pickup / Dispense</h1>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4">Patient Search (2+2+DOB)</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">First Name (2+ chars)</label>
                <input
                  value={search.first}
                  onChange={(e) => setSearch({ ...search, first: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Jo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Last Name (2+ chars)</label>
                <input
                  value={search.last}
                  onChange={(e) => setSearch({ ...search, last: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date of Birth</label>
              <input
                type="date"
                value={search.dob}
                onChange={(e) => setSearch({ ...search, dob: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            <button className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
              Search Patient
            </button>
          </div>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="text-lg font-bold mb-4">Ready for Pickup</h2>
          <div className="text-center text-gray-500 py-8">Search for patient to view prescriptions</div>
        </div>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-lg font-bold mb-4">Signature Capture</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg h-40 flex items-center justify-center mb-4">
          <span className="text-gray-400">Signature pad area</span>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">HIPAA acknowledgment received</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="text-sm">Counseling offered</span>
          </label>
        </div>

        <button className="mt-4 w-full bg-green-600 text-white py-2 rounded hover:bg-green-700">
          Complete Pickup
        </button>
      </div>
    </div>
  );
}
