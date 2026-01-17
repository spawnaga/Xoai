'use client';

import Link from 'next/link';

interface QueueStats {
  intake: number;
  dataEntry: number;
  insurance: number;
  fill: number;
  verify: number;
  ready: number;
}

interface QueueHeaderProps {
  stats: QueueStats;
  currentQueue?: keyof QueueStats;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const queueConfig: Record<keyof QueueStats, { label: string; href: string; color: string; bgColor: string }> = {
  intake: {
    label: 'Intake',
    href: '/dashboard/pharmacy/intake',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  dataEntry: {
    label: 'Data Entry',
    href: '/dashboard/pharmacy/data-entry',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  insurance: {
    label: 'Insurance',
    href: '/dashboard/pharmacy/claim',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  fill: {
    label: 'Fill',
    href: '/dashboard/pharmacy/fill',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  verify: {
    label: 'Verify',
    href: '/dashboard/pharmacy/verify',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  ready: {
    label: 'Ready',
    href: '/dashboard/pharmacy/pickup',
    color: 'text-teal-600',
    bgColor: 'bg-teal-100',
  },
};

export function QueueHeader({ stats, currentQueue, onRefresh, isLoading }: QueueHeaderProps) {
  const totalPending = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Queue Stats */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(queueConfig) as Array<keyof QueueStats>).map((queue) => {
            const config = queueConfig[queue];
            const count = stats[queue];
            const isActive = currentQueue === queue;

            return (
              <Link
                key={queue}
                href={config.href}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl transition-all
                  ${isActive
                    ? `${config.bgColor} ${config.color} ring-2 ring-offset-1 ring-current`
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }
                `}
              >
                <span className="text-sm font-medium">{config.label}</span>
                <span className={`
                  min-w-[1.5rem] h-6 px-1.5 flex items-center justify-center rounded-lg text-xs font-bold
                  ${isActive
                    ? `${config.bgColor} ${config.color}`
                    : count > 0 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-400'
                  }
                `}>
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-900">{totalPending}</span>
            <span>total pending</span>
          </div>

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh queues (F5)"
            >
              <svg
                className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}

          <Link
            href="/dashboard/pharmacy"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Hub
          </Link>
        </div>
      </div>
    </div>
  );
}
