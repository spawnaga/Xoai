'use client';

import * as React from 'react';
import { cn } from '../utils';

export type InteractionSeverity = 'severe' | 'moderate' | 'mild';

export interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: InteractionSeverity;
  description: string;
  clinicalEffect?: string;
  management?: string;
  references?: string[];
}

export interface DrugInteractionAlertProps {
  interactions: DrugInteraction[];
  className?: string;
  onDismiss?: (id: string) => void;
  showManagement?: boolean;
}

const SEVERITY_STYLES: Record<InteractionSeverity, { container: string; badge: string; icon: string }> = {
  severe: {
    container: 'bg-red-50 border-red-300',
    badge: 'bg-red-600 text-white',
    icon: '\u{26A0}', // Warning sign
  },
  moderate: {
    container: 'bg-yellow-50 border-yellow-300',
    badge: 'bg-yellow-500 text-white',
    icon: '\u{26A0}', // Warning sign
  },
  mild: {
    container: 'bg-blue-50 border-blue-300',
    badge: 'bg-blue-500 text-white',
    icon: '\u{2139}', // Info
  },
};

function InteractionCard({
  interaction,
  onDismiss,
  showManagement,
}: {
  interaction: DrugInteraction;
  onDismiss?: (id: string) => void;
  showManagement?: boolean;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const styles = SEVERITY_STYLES[interaction.severity];

  return (
    <div className={cn('rounded-lg border-2 p-4', styles.container)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl" role="img" aria-label={`${interaction.severity} severity`}>
            {styles.icon}
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={cn('px-2 py-0.5 rounded text-xs font-semibold uppercase', styles.badge)}>
                {interaction.severity}
              </span>
            </div>
            <p className="font-semibold text-gray-900">
              {interaction.drug1} + {interaction.drug2}
            </p>
            <p className="text-sm text-gray-700 mt-1">{interaction.description}</p>

            {interaction.clinicalEffect && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium">Clinical Effect:</span> {interaction.clinicalEffect}
              </p>
            )}

            {showManagement && interaction.management && (
              <div className="mt-3 p-3 bg-white/50 rounded-md">
                <p className="text-sm font-medium text-gray-900">Management:</p>
                <p className="text-sm text-gray-700">{interaction.management}</p>
              </div>
            )}

            {interaction.references && interaction.references.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-gray-500 hover:text-gray-700 mt-2 underline"
              >
                {expanded ? 'Hide references' : `Show ${interaction.references.length} reference(s)`}
              </button>
            )}

            {expanded && interaction.references && (
              <ul className="mt-2 text-xs text-gray-500 list-disc list-inside">
                {interaction.references.map((ref, i) => (
                  <li key={i}>{ref}</li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={() => onDismiss(interaction.id)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export function DrugInteractionAlert({
  interactions,
  className,
  onDismiss,
  showManagement = true,
}: DrugInteractionAlertProps) {
  if (!interactions.length) {
    return null;
  }

  // Sort by severity (severe first)
  const sortedInteractions = [...interactions].sort((a, b) => {
    const order: Record<InteractionSeverity, number> = { severe: 0, moderate: 1, mild: 2 };
    return order[a.severity] - order[b.severity];
  });

  const severeCount = interactions.filter((i) => i.severity === 'severe').length;
  const moderateCount = interactions.filter((i) => i.severity === 'moderate').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary header */}
      <div className="flex items-center gap-4 p-3 bg-gray-100 rounded-lg">
        <span className="text-xl">{'\u{1F48A}'}</span>
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            {interactions.length} Drug Interaction{interactions.length > 1 ? 's' : ''} Detected
          </p>
          <p className="text-sm text-gray-600">
            {severeCount > 0 && <span className="text-red-600 font-medium">{severeCount} severe</span>}
            {severeCount > 0 && moderateCount > 0 && ', '}
            {moderateCount > 0 && <span className="text-yellow-600 font-medium">{moderateCount} moderate</span>}
          </p>
        </div>
      </div>

      {/* Individual interactions */}
      <div className="space-y-3">
        {sortedInteractions.map((interaction) => (
          <InteractionCard
            key={interaction.id}
            interaction={interaction}
            onDismiss={onDismiss}
            showManagement={showManagement}
          />
        ))}
      </div>
    </div>
  );
}

// Helper to check interactions (placeholder - would connect to real drug database)
export function checkDrugInteractions(
  currentMedications: string[],
  newMedication: string
): DrugInteraction[] {
  // This is a placeholder - in production, this would call a real drug interaction API
  // like DrugBank, RxNorm, or similar
  console.warn('checkDrugInteractions is a placeholder - implement with real drug database');
  return [];
}
