'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface DrugResult {
  id: string;
  ndc: string;
  name: string;
  strength: string;
  form: string;
  manufacturer: string;
  isControlled: boolean;
  scheduleClass?: string;
  packageSize?: string;
  awpPrice?: number;
  inStock?: boolean;
  stockQuantity?: number;
}

interface DrugSearchProps {
  onSelect: (drug: DrugResult) => void;
  onSearch?: (query: string) => Promise<DrugResult[]>;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  initialValue?: string;
  showStock?: boolean;
}

// Mock search function for development
const mockSearch = async (query: string): Promise<DrugResult[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));

  if (!query || query.length < 2) return [];

  // Mock data
  const mockDrugs: DrugResult[] = [
    {
      id: '1',
      ndc: '00069-0150-01',
      name: 'Lisinopril',
      strength: '10 mg',
      form: 'Tablet',
      manufacturer: 'Pfizer',
      isControlled: false,
      packageSize: '100 tablets',
      awpPrice: 45.99,
      inStock: true,
      stockQuantity: 500,
    },
    {
      id: '2',
      ndc: '00069-0151-01',
      name: 'Lisinopril',
      strength: '20 mg',
      form: 'Tablet',
      manufacturer: 'Pfizer',
      isControlled: false,
      packageSize: '100 tablets',
      awpPrice: 52.99,
      inStock: true,
      stockQuantity: 350,
    },
    {
      id: '3',
      ndc: '00078-0369-15',
      name: 'Oxycodone HCl',
      strength: '5 mg',
      form: 'Tablet',
      manufacturer: 'Novartis',
      isControlled: true,
      scheduleClass: 'C-II',
      packageSize: '100 tablets',
      awpPrice: 125.00,
      inStock: true,
      stockQuantity: 50,
    },
  ];

  return mockDrugs.filter(
    drug =>
      drug.name.toLowerCase().includes(query.toLowerCase()) ||
      drug.ndc.replace(/-/g, '').includes(query.replace(/-/g, ''))
  );
};

export function DrugSearch({
  onSelect,
  onSearch = mockSearch,
  placeholder = 'Search by drug name or NDC...',
  autoFocus = false,
  disabled = false,
  initialValue = '',
  showStock = true,
}: DrugSearchProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<DrugResult[]>([]);
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
      console.error('Drug search error:', error);
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

  const handleSelect = (drug: DrugResult) => {
    setQuery(`${drug.name} ${drug.strength}`);
    setIsOpen(false);
    onSelect(drug);
  };

  const formatNdc = (ndc: string) => {
    // Format as 5-4-2
    const clean = ndc.replace(/-/g, '');
    if (clean.length === 11) {
      return `${clean.slice(0, 5)}-${clean.slice(5, 9)}-${clean.slice(9)}`;
    }
    return ndc;
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
          {results.map((drug, index) => (
            <button
              key={drug.id}
              onClick={() => handleSelect(drug)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`
                w-full px-4 py-3 text-left transition-colors
                ${index === selectedIndex ? 'bg-blue-50' : 'hover:bg-slate-50'}
                ${index !== results.length - 1 ? 'border-b border-slate-100' : ''}
              `}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-slate-900">
                      {drug.name} {drug.strength}
                    </span>
                    {drug.isControlled && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">
                        {drug.scheduleClass}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-mono">{formatNdc(drug.ndc)}</span>
                    <span>{drug.form}</span>
                    <span>{drug.manufacturer}</span>
                  </div>
                </div>
                {showStock && (
                  <div className="text-right">
                    {drug.inStock ? (
                      <span className="text-xs font-medium text-emerald-600">
                        {drug.stockQuantity} in stock
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-red-600">Out of stock</span>
                    )}
                    {drug.awpPrice && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        AWP: ${drug.awpPrice.toFixed(2)}
                      </p>
                    )}
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
