'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface PrescriberResult {
  id: string;
  npi: string;
  firstName: string;
  lastName: string;
  suffix?: string;
  specialty?: string;
  deaNumber?: string;
  stateLicense?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  phone?: string;
  fax?: string;
}

interface PrescriberSearchProps {
  onSelect: (prescriber: PrescriberResult) => void;
  onSearch?: (query: string) => Promise<PrescriberResult[]>;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  initialValue?: string;
}

// Mock search function
const mockSearch = async (query: string): Promise<PrescriberResult[]> => {
  await new Promise(resolve => setTimeout(resolve, 300));

  if (!query || query.length < 2) return [];

  const mockPrescribers: PrescriberResult[] = [
    {
      id: '1',
      npi: '1234567890',
      firstName: 'Sarah',
      lastName: 'Johnson',
      suffix: 'MD',
      specialty: 'Family Medicine',
      deaNumber: 'BJ1234563',
      stateLicense: 'IL-123456',
      address: '100 Medical Center Dr',
      city: 'Springfield',
      state: 'IL',
      zipCode: '62701',
      phone: '(555) 111-2222',
      fax: '(555) 111-2223',
    },
    {
      id: '2',
      npi: '2345678901',
      firstName: 'Michael',
      lastName: 'Chen',
      suffix: 'DO',
      specialty: 'Internal Medicine',
      deaNumber: 'BC2345674',
      stateLicense: 'IL-234567',
      phone: '(555) 333-4444',
    },
    {
      id: '3',
      npi: '3456789012',
      firstName: 'Emily',
      lastName: 'Williams',
      suffix: 'PA-C',
      specialty: 'Physician Assistant',
      address: '200 Health Plaza',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      phone: '(555) 555-6666',
    },
  ];

  const searchLower = query.toLowerCase();

  // Check if searching by NPI
  if (/^\d+$/.test(query)) {
    return mockPrescribers.filter(p => p.npi.includes(query));
  }

  return mockPrescribers.filter(
    p =>
      p.firstName.toLowerCase().includes(searchLower) ||
      p.lastName.toLowerCase().includes(searchLower) ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(searchLower) ||
      p.npi.includes(query)
  );
};

export function PrescriberSearch({
  onSelect,
  onSearch = mockSearch,
  placeholder = 'Search by name or NPI...',
  autoFocus = false,
  disabled = false,
  initialValue = '',
}: PrescriberSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<PrescriberResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
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
      console.error('Prescriber search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [onSearch]);

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

  const handleSelect = (prescriber: PrescriberResult) => {
    const displayName = prescriber.suffix
      ? `${prescriber.firstName} ${prescriber.lastName}, ${prescriber.suffix}`
      : `${prescriber.firstName} ${prescriber.lastName}`;
    setQuery(displayName);
    setIsOpen(false);
    onSelect(prescriber);
  };

  const formatNpi = (npi: string) => {
    return npi.replace(/(\d{4})(\d{3})(\d{3})/, '$1-$2-$3');
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-slate-200 shadow-lg max-h-80 overflow-auto">
          {results.map((prescriber, index) => (
            <button
              key={prescriber.id}
              onClick={() => handleSelect(prescriber)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`
                w-full px-4 py-3 text-left transition-colors
                ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}
                ${index !== results.length - 1 ? 'border-b border-slate-100' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                  {prescriber.firstName[0]}{prescriber.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-900">
                      {prescriber.firstName} {prescriber.lastName}
                      {prescriber.suffix && <span className="text-slate-500">, {prescriber.suffix}</span>}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono">NPI: {formatNpi(prescriber.npi)}</span>
                    {prescriber.specialty && <span>{prescriber.specialty}</span>}
                  </div>
                  {prescriber.deaNumber && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        DEA: {prescriber.deaNumber}
                      </span>
                      {prescriber.stateLicense && (
                        <span className="text-xs text-slate-500">
                          License: {prescriber.stateLicense}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {prescriber.phone && (
                  <div className="text-right text-xs text-slate-500">
                    <p>{prescriber.phone}</p>
                    {prescriber.fax && <p>Fax: {prescriber.fax}</p>}
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
