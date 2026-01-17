'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface PatientResult {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  insuranceName?: string;
  allergies?: string[];
}

interface PatientSearchProps {
  onSelect: (patient: PatientResult) => void;
  onSearch?: (query: string) => Promise<PatientResult[]>;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  mode?: '2+2+dob' | 'full';
}

// 2+2+DOB search helper
function parse22Dob(query: string): { firstName?: string; lastName?: string; dob?: string } {
  // Pattern: first 2 letters of last name + first 2 letters of first name + DOB
  // Example: "smjo01151990" = Smith, John, 01/15/1990
  const match = query.match(/^([a-zA-Z]{2})([a-zA-Z]{2})(\d{2})(\d{2})(\d{4})$/);
  if (match) {
    return {
      lastName: match[1],
      firstName: match[2],
      dob: `${match[3]}/${match[4]}/${match[5]}`,
    };
  }
  return {};
}

// Mock search function
const mockSearch = async (query: string): Promise<PatientResult[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  if (!query || query.length < 2) return [];

  const mockPatients: PatientResult[] = [
    {
      id: '1',
      mrn: 'MRN001234',
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: '1990-01-15',
      phone: '(555) 123-4567',
      address: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      insuranceName: 'Blue Cross Blue Shield',
      allergies: ['Penicillin', 'Sulfa'],
    },
    {
      id: '2',
      mrn: 'MRN001235',
      firstName: 'Jane',
      lastName: 'Smith',
      dateOfBirth: '1985-03-22',
      phone: '(555) 987-6543',
      insuranceName: 'Aetna',
      allergies: [],
    },
    {
      id: '3',
      mrn: 'MRN001236',
      firstName: 'Robert',
      lastName: 'Johnson',
      dateOfBirth: '1978-07-08',
      phone: '(555) 456-7890',
      insuranceName: 'United Healthcare',
      allergies: ['Aspirin'],
    },
  ];

  const searchLower = query.toLowerCase();

  // Check for 2+2+DOB format
  const parsed = parse22Dob(query);
  if (parsed.firstName && parsed.lastName) {
    return mockPatients.filter(
      p =>
        p.lastName.toLowerCase().startsWith(parsed.lastName!.toLowerCase()) &&
        p.firstName.toLowerCase().startsWith(parsed.firstName!.toLowerCase())
    );
  }

  // Regular search
  return mockPatients.filter(
    p =>
      p.firstName.toLowerCase().includes(searchLower) ||
      p.lastName.toLowerCase().includes(searchLower) ||
      p.mrn.toLowerCase().includes(searchLower) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchLower)
  );
};

export function PatientSearch({
  onSelect,
  onSearch = mockSearch,
  placeholder = 'Search by name, MRN, or 2+2+DOB...',
  autoFocus = false,
  disabled = false,
  mode = 'full',
}: PatientSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PatientResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    const minLength = mode === '2+2+dob' ? 6 : 2;
    if (searchQuery.length < minLength) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const searchResults = await onSearch(searchQuery);
      setResults(searchResults);
      setIsOpen(searchResults.length > 0);
      setSelectedIndex(0);
    } catch (error) {
      console.error('Patient search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [onSearch, mode]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      performSearch(query);
    }, 250);

    return () => clearTimeout(debounceTimer);
  }, [query, performSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        event.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (patient: PatientResult) => {
    setQuery(`${patient.firstName} ${patient.lastName}`);
    setIsOpen(false);
    onSelect(patient);
  };

  const formatDob = (dob: string) => {
    return new Date(dob).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const getInitials = (first: string, last: string) => {
    return `${first[0] || ''}${last[0] || ''}`.toUpperCase();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          disabled={disabled}
          className="w-full pl-10 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
        )}
        {query && !isLoading && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Hint for 2+2+DOB mode */}
      {mode === '2+2+dob' && (
        <p className="mt-1 text-xs text-slate-500">
          Format: First 2 letters of last name + first 2 letters of first name + DOB (MMDDYYYY)
        </p>
      )}

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-lg max-h-80 overflow-auto">
          {results.map((patient, index) => (
            <button
              key={patient.id}
              onClick={() => handleSelect(patient)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`
                w-full px-4 py-3 text-left transition-colors
                ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}
                ${index !== results.length - 1 ? 'border-b border-slate-100' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {getInitials(patient.firstName, patient.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-900">
                      {patient.firstName} {patient.lastName}
                    </span>
                    <span className="text-xs font-mono text-slate-500">{patient.mrn}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>DOB: {formatDob(patient.dateOfBirth)}</span>
                    {patient.phone && <span>{patient.phone}</span>}
                  </div>
                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="h-3 w-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-xs text-red-600 font-medium">
                        {patient.allergies.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
                {patient.insuranceName && (
                  <div className="text-right">
                    <span className="text-xs text-slate-500">{patient.insuranceName}</span>
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
