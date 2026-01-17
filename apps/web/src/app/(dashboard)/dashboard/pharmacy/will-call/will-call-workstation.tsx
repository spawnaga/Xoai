'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';

interface WillCallBin {
  id: string;
  binLocation: string;
  patientName: string;
  patientPhone?: string;
  rxCount: number;
  rxNumbers: string[];
  totalCopay: number;
  readyDate: Date;
  daysInBin: number;
  status: 'ready' | 'notified' | 'picked_up' | 'return_pending';
  hasControlled: boolean;
  notificationSent: boolean;
}

interface WillCallStats {
  ready: number;
  notified: number;
  expiringSoon: number;
  returnPending: number;
}

interface WillCallWorkstationProps {
  bins: WillCallBin[];
  stats: WillCallStats;
  userId: string;
}

const statusConfig = {
  ready: { label: 'Ready', color: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  notified: { label: 'Notified', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  picked_up: { label: 'Picked Up', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  return_pending: { label: 'Return Pending', color: 'text-amber-700', bgColor: 'bg-amber-100' },
};

export function WillCallWorkstation({ bins: initialBins, stats, userId: _userId }: WillCallWorkstationProps) {
  const router = useRouter();
  const [bins, setBins] = useState(initialBins);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBinId, setSelectedBinId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'ready' | 'expiring' | 'return_pending'>('all');

  const selectedBin = bins.find((b) => b.id === selectedBinId);

  // tRPC mutations
  const utils = trpc.useUtils();

  const returnToStockMutation = trpc.pharmacyWorkflow.dispense.returnToStock.useMutation({
    onSuccess: () => {
      utils.pharmacyWorkflow.dispense.invalidate();
      router.refresh();
    },
  });

  const extendHoldMutation = trpc.pharmacyWorkflow.dispense.extendHold.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const sendNotificationMutation = trpc.pharmacyWorkflow.dispense.sendNotification.useMutation({
    onSuccess: () => {
      router.refresh();
    },
  });

  const isLoading = returnToStockMutation.isPending ||
                    extendHoldMutation.isPending ||
                    sendNotificationMutation.isPending;

  // Filter bins based on search and status filter
  const filteredBins = bins.filter((bin) => {
    const matchesSearch = searchQuery === '' ||
      bin.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bin.binLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bin.rxNumbers.some((rx) => rx.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'ready' && bin.status === 'ready') ||
      (statusFilter === 'expiring' && bin.daysInBin >= 7) ||
      (statusFilter === 'return_pending' && bin.daysInBin >= 10);

    return matchesSearch && matchesStatus;
  });

  const handleReturnToStock = useCallback(async (binId: string) => {
    try {
      await returnToStockMutation.mutateAsync({ fillId: binId });
      setBins((prev) => prev.filter((b) => b.id !== binId));
      setSelectedBinId(null);
    } catch (error) {
      console.error('Failed to return to stock:', error);
    }
  }, [returnToStockMutation]);

  const handleExtendHold = useCallback(async (binId: string, days: number) => {
    try {
      await extendHoldMutation.mutateAsync({ fillId: binId, days });
      setBins((prev) =>
        prev.map((b) =>
          b.id === binId ? { ...b, daysInBin: Math.max(0, b.daysInBin - days) } : b
        )
      );
    } catch (error) {
      console.error('Failed to extend hold:', error);
    }
  }, [extendHoldMutation]);

  const handleSendNotification = useCallback(async (binId: string, method: 'sms' | 'call') => {
    try {
      await sendNotificationMutation.mutateAsync({ fillId: binId, method });
      setBins((prev) =>
        prev.map((b) =>
          b.id === binId ? { ...b, notificationSent: true, status: 'notified' as const } : b
        )
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }, [sendNotificationMutation]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Ready for Pickup</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.ready}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Notified</div>
          <div className="text-2xl font-bold text-blue-600">{stats.notified}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Expiring Soon (7+ days)</div>
          <div className="text-2xl font-bold text-amber-600">{stats.expiringSoon}</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-sm text-slate-500">Return Pending (10+ days)</div>
          <div className="text-2xl font-bold text-red-600">{stats.returnPending}</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by patient name, bin location, or Rx number..."
            className="w-full px-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'ready', 'expiring', 'return_pending'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === filter
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'all' && 'All'}
              {filter === 'ready' && 'Ready'}
              {filter === 'expiring' && 'Expiring'}
              {filter === 'return_pending' && 'Return Pending'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bins List */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900">
                Will-Call Bins ({filteredBins.length})
              </h3>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {filteredBins.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No bins match your search criteria
                </div>
              ) : (
                filteredBins.map((bin) => {
                  const status = statusConfig[bin.status];
                  const isSelected = selectedBinId === bin.id;
                  const isExpiring = bin.daysInBin >= 7;
                  const isOverdue = bin.daysInBin >= 10;

                  return (
                    <button
                      key={bin.id}
                      onClick={() => setSelectedBinId(bin.id)}
                      className={`w-full text-left px-4 py-3 transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 text-sm font-bold bg-slate-800 text-white rounded">
                            {bin.binLocation}
                          </span>
                          <span className="text-sm font-medium text-slate-900">{bin.patientName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {bin.hasControlled && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-100 text-red-700 rounded">
                              CS
                            </span>
                          )}
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          {bin.rxCount} Rx • ${bin.totalCopay.toFixed(2)} copay
                        </span>
                        <span className={isOverdue ? 'text-red-600 font-semibold' : isExpiring ? 'text-amber-600' : 'text-slate-500'}>
                          {bin.daysInBin} days in bin
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedBin ? (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden sticky top-4">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-semibold text-slate-900">Bin Details</h3>
              </div>
              <div className="p-4 space-y-4">
                {/* Bin Info */}
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-slate-800 text-white rounded-xl flex items-center justify-center">
                    <span className="text-xl font-bold">{selectedBin.binLocation}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{selectedBin.patientName}</p>
                    {selectedBin.patientPhone && (
                      <p className="text-sm text-slate-500">{selectedBin.patientPhone}</p>
                    )}
                  </div>
                </div>

                {/* Prescriptions */}
                <div>
                  <p className="text-xs text-slate-500 mb-2">Prescriptions</p>
                  <div className="space-y-1">
                    {selectedBin.rxNumbers.map((rx) => (
                      <div key={rx} className="px-3 py-2 bg-slate-50 rounded-lg">
                        <span className="font-mono text-sm">{rx}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Total Copay</p>
                    <p className="text-lg font-bold text-slate-900">${selectedBin.totalCopay.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Days in Bin</p>
                    <p className={`text-lg font-bold ${
                      selectedBin.daysInBin >= 10 ? 'text-red-600' :
                      selectedBin.daysInBin >= 7 ? 'text-amber-600' : 'text-slate-900'
                    }`}>
                      {selectedBin.daysInBin}
                    </p>
                  </div>
                </div>

                {/* Ready Date */}
                <div>
                  <p className="text-xs text-slate-500">Ready Since</p>
                  <p className="text-sm text-slate-700">
                    {new Date(selectedBin.readyDate).toLocaleString()}
                  </p>
                </div>

                {/* Warning for Expiring */}
                {selectedBin.daysInBin >= 7 && (
                  <div className={`p-3 rounded-xl ${
                    selectedBin.daysInBin >= 10 ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'
                  }`}>
                    <p className={`text-sm font-semibold ${
                      selectedBin.daysInBin >= 10 ? 'text-red-900' : 'text-amber-900'
                    }`}>
                      {selectedBin.daysInBin >= 10 ? 'Return to Stock Required' : 'Expiring Soon'}
                    </p>
                    <p className={`text-xs ${
                      selectedBin.daysInBin >= 10 ? 'text-red-700' : 'text-amber-700'
                    }`}>
                      {selectedBin.daysInBin >= 10
                        ? 'This prescription should be returned to stock per policy.'
                        : 'Contact patient to arrange pickup.'}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-4 space-y-2 border-t border-slate-100">
                  {/* Notification Actions */}
                  {!selectedBin.notificationSent && (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleSendNotification(selectedBin.id, 'sms')}
                        disabled={isLoading}
                        className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                      >
                        Send SMS
                      </button>
                      <button
                        onClick={() => handleSendNotification(selectedBin.id, 'call')}
                        disabled={isLoading}
                        className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                      >
                        Call Patient
                      </button>
                    </div>
                  )}

                  {/* Extend Hold */}
                  <button
                    onClick={() => handleExtendHold(selectedBin.id, 7)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50"
                  >
                    Extend Hold (+7 days)
                  </button>

                  {/* Return to Stock */}
                  <button
                    onClick={() => handleReturnToStock(selectedBin.id)}
                    disabled={isLoading}
                    className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                  >
                    Return to Stock
                  </button>

                  {/* Go to Pickup */}
                  <button
                    onClick={() => router.push('/dashboard/pharmacy/pickup')}
                    className="w-full px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700"
                  >
                    Process Pickup
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-900">No bin selected</p>
              <p className="text-xs text-slate-500 mt-1">Click a bin to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
