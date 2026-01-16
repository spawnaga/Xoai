/**
 * Drug Interaction Checking Service
 *
 * Provides drug-drug interaction checking, contraindication detection,
 * and allergy cross-reactivity analysis.
 */

import type {
  DrugInteraction,
  InteractionCheckResult,
  Contraindication,
  ContraindicationCheckResult,
  AllergyAlert,
  AllergyCheckResult,
  InteractionSeverity,
} from './types';
import { ALLERGY_CROSS_REACTIVITY } from './types';

// ============================================
// DRUG-DRUG INTERACTION DATABASE
// ============================================

/**
 * Known drug-drug interactions database
 * In production, this would be fetched from a comprehensive drug database
 */
const DRUG_INTERACTIONS: DrugInteraction[] = [
  // Warfarin interactions
  {
    drug1: 'warfarin',
    drug2: 'aspirin',
    severity: 'high',
    description: 'Increased risk of bleeding',
    clinicalEffect: 'Aspirin inhibits platelet function while warfarin inhibits clotting factors, leading to significantly increased bleeding risk.',
    recommendation: 'Avoid combination if possible. If necessary, use lowest effective aspirin dose and monitor INR closely.',
    mechanism: 'Additive anticoagulant/antiplatelet effects',
  },
  {
    drug1: 'warfarin',
    drug2: 'ibuprofen',
    severity: 'high',
    description: 'Increased risk of GI bleeding and elevated INR',
    clinicalEffect: 'NSAIDs increase warfarin levels and have their own bleeding risk.',
    recommendation: 'Avoid NSAIDs with warfarin. Use acetaminophen for pain if needed.',
    mechanism: 'CYP2C9 inhibition and additive bleeding risk',
  },
  {
    drug1: 'warfarin',
    drug2: 'amiodarone',
    severity: 'high',
    description: 'Significantly elevated INR',
    clinicalEffect: 'Amiodarone inhibits warfarin metabolism, leading to supratherapeutic INR.',
    recommendation: 'Reduce warfarin dose by 30-50% when starting amiodarone. Monitor INR frequently.',
    mechanism: 'CYP2C9 and CYP3A4 inhibition',
  },
  {
    drug1: 'warfarin',
    drug2: 'fluconazole',
    severity: 'high',
    description: 'Elevated INR and bleeding risk',
    clinicalEffect: 'Fluconazole significantly inhibits warfarin metabolism.',
    recommendation: 'Reduce warfarin dose and monitor INR closely during fluconazole therapy.',
    mechanism: 'CYP2C9 inhibition',
  },

  // Statin interactions
  {
    drug1: 'simvastatin',
    drug2: 'clarithromycin',
    severity: 'high',
    description: 'Risk of rhabdomyolysis',
    clinicalEffect: 'Clarithromycin inhibits simvastatin metabolism, leading to dangerously elevated statin levels.',
    recommendation: 'Avoid combination. Consider azithromycin as alternative antibiotic.',
    mechanism: 'CYP3A4 inhibition',
  },
  {
    drug1: 'atorvastatin',
    drug2: 'clarithromycin',
    severity: 'moderate',
    description: 'Increased statin levels',
    clinicalEffect: 'Elevated atorvastatin levels increase myopathy risk.',
    recommendation: 'Use lowest atorvastatin dose or consider azithromycin.',
    mechanism: 'CYP3A4 inhibition',
  },
  {
    drug1: 'simvastatin',
    drug2: 'amlodipine',
    severity: 'moderate',
    description: 'Increased simvastatin exposure',
    clinicalEffect: 'Amlodipine increases simvastatin levels.',
    recommendation: 'Limit simvastatin to 20mg daily when used with amlodipine.',
    mechanism: 'CYP3A4 inhibition',
  },

  // ACE inhibitor interactions
  {
    drug1: 'lisinopril',
    drug2: 'spironolactone',
    severity: 'high',
    description: 'Risk of severe hyperkalemia',
    clinicalEffect: 'Both drugs cause potassium retention, leading to dangerous hyperkalemia.',
    recommendation: 'If combination necessary, start with low doses and monitor potassium closely.',
    mechanism: 'Additive potassium-sparing effects',
  },
  {
    drug1: 'lisinopril',
    drug2: 'potassium',
    severity: 'moderate',
    description: 'Risk of hyperkalemia',
    clinicalEffect: 'ACE inhibitors reduce potassium excretion.',
    recommendation: 'Monitor serum potassium regularly. Avoid potassium supplements unless hypokalemia present.',
    mechanism: 'Reduced aldosterone and potassium excretion',
  },

  // Metformin interactions
  {
    drug1: 'metformin',
    drug2: 'iodine contrast',
    severity: 'high',
    description: 'Risk of lactic acidosis',
    clinicalEffect: 'Contrast-induced nephropathy can lead to metformin accumulation and lactic acidosis.',
    recommendation: 'Hold metformin before and 48 hours after contrast administration. Check renal function before resuming.',
    mechanism: 'Reduced renal clearance of metformin',
  },

  // Opioid interactions
  {
    drug1: 'hydrocodone',
    drug2: 'alprazolam',
    severity: 'high',
    description: 'Respiratory depression and sedation',
    clinicalEffect: 'Combined CNS depression can be fatal.',
    recommendation: 'Avoid combination. If necessary, use lowest effective doses and monitor closely.',
    mechanism: 'Additive CNS depression',
  },
  {
    drug1: 'tramadol',
    drug2: 'sertraline',
    severity: 'high',
    description: 'Risk of serotonin syndrome',
    clinicalEffect: 'Both drugs increase serotonin levels, risking serotonin syndrome.',
    recommendation: 'Monitor for serotonin syndrome symptoms. Consider alternative analgesic.',
    mechanism: 'Additive serotonergic effects',
  },
  {
    drug1: 'tramadol',
    drug2: 'carbamazepine',
    severity: 'moderate',
    description: 'Reduced tramadol effectiveness and seizure risk',
    clinicalEffect: 'Carbamazepine reduces tramadol levels and both drugs lower seizure threshold.',
    recommendation: 'Avoid combination in patients with seizure history.',
    mechanism: 'CYP3A4 induction and additive seizure risk',
  },

  // SSRI interactions
  {
    drug1: 'fluoxetine',
    drug2: 'tramadol',
    severity: 'high',
    description: 'Risk of serotonin syndrome',
    clinicalEffect: 'Combined serotonergic activity can cause life-threatening serotonin syndrome.',
    recommendation: 'Avoid combination. Use non-serotonergic analgesics.',
    mechanism: 'Additive serotonergic effects',
  },
  {
    drug1: 'sertraline',
    drug2: 'aspirin',
    severity: 'moderate',
    description: 'Increased bleeding risk',
    clinicalEffect: 'SSRIs impair platelet function, adding to aspirin bleeding risk.',
    recommendation: 'Use with caution. Consider GI protection with PPI.',
    mechanism: 'Additive antiplatelet effects',
  },

  // Thyroid hormone interactions
  {
    drug1: 'levothyroxine',
    drug2: 'calcium',
    severity: 'moderate',
    description: 'Reduced levothyroxine absorption',
    clinicalEffect: 'Calcium binds levothyroxine in the GI tract.',
    recommendation: 'Separate administration by at least 4 hours.',
    mechanism: 'Chelation in GI tract',
  },
  {
    drug1: 'levothyroxine',
    drug2: 'omeprazole',
    severity: 'low',
    description: 'Potentially reduced levothyroxine absorption',
    clinicalEffect: 'Reduced gastric acid may affect levothyroxine dissolution.',
    recommendation: 'Monitor TSH and adjust levothyroxine dose if needed.',
    mechanism: 'Altered gastric pH',
  },

  // Antibiotic interactions
  {
    drug1: 'ciprofloxacin',
    drug2: 'theophylline',
    severity: 'high',
    description: 'Theophylline toxicity',
    clinicalEffect: 'Ciprofloxacin inhibits theophylline metabolism.',
    recommendation: 'Avoid combination. If necessary, reduce theophylline dose by 30-40%.',
    mechanism: 'CYP1A2 inhibition',
  },
  {
    drug1: 'metronidazole',
    drug2: 'alcohol',
    severity: 'high',
    description: 'Disulfiram-like reaction',
    clinicalEffect: 'Severe nausea, vomiting, flushing, headache.',
    recommendation: 'Avoid alcohol during and 3 days after metronidazole therapy.',
    mechanism: 'Acetaldehyde accumulation',
  },

  // Antihypertensive interactions
  {
    drug1: 'amlodipine',
    drug2: 'simvastatin',
    severity: 'moderate',
    description: 'Increased myopathy risk',
    clinicalEffect: 'Elevated simvastatin levels.',
    recommendation: 'Limit simvastatin to 20mg daily.',
    mechanism: 'CYP3A4 inhibition',
  },

  // Diabetes medication interactions
  {
    drug1: 'glipizide',
    drug2: 'fluconazole',
    severity: 'high',
    description: 'Severe hypoglycemia',
    clinicalEffect: 'Fluconazole inhibits glipizide metabolism.',
    recommendation: 'Monitor blood glucose closely. Consider dose reduction.',
    mechanism: 'CYP2C9 inhibition',
  },
];

/**
 * Check for drug-drug interactions
 */
export function checkDrugInteractions(
  newDrug: string,
  currentMedications: string[]
): InteractionCheckResult {
  const normalizedNewDrug = normalizeDrugName(newDrug);
  const interactions: DrugInteraction[] = [];

  for (const currentMed of currentMedications) {
    const normalizedCurrentMed = normalizeDrugName(currentMed);

    // Skip self-comparison
    if (normalizedNewDrug === normalizedCurrentMed) continue;

    // Find matching interactions
    const matchingInteractions = DRUG_INTERACTIONS.filter((interaction) => {
      const drug1Match =
        normalizedNewDrug.includes(interaction.drug1) ||
        interaction.drug1.includes(normalizedNewDrug);
      const drug2Match =
        normalizedCurrentMed.includes(interaction.drug2) ||
        interaction.drug2.includes(normalizedCurrentMed);

      const reverseDrug1Match =
        normalizedCurrentMed.includes(interaction.drug1) ||
        interaction.drug1.includes(normalizedCurrentMed);
      const reverseDrug2Match =
        normalizedNewDrug.includes(interaction.drug2) ||
        interaction.drug2.includes(normalizedNewDrug);

      return (drug1Match && drug2Match) || (reverseDrug1Match && reverseDrug2Match);
    });

    interactions.push(...matchingInteractions);
  }

  // Also check for duplicate therapy
  const duplicateTherapy = checkDuplicateTherapy(newDrug, currentMedications);
  if (duplicateTherapy) {
    interactions.push(duplicateTherapy);
  }

  const highSeverityCount = interactions.filter((i) => i.severity === 'high').length;
  const moderateSeverityCount = interactions.filter((i) => i.severity === 'moderate').length;
  const lowSeverityCount = interactions.filter((i) => i.severity === 'low').length;

  return {
    hasInteractions: interactions.length > 0,
    interactions,
    highSeverityCount,
    moderateSeverityCount,
    lowSeverityCount,
    summary: generateInteractionSummary(interactions),
  };
}

/**
 * Normalize drug name for comparison
 */
function normalizeDrugName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Check for duplicate therapy (same drug class)
 */
function checkDuplicateTherapy(
  newDrug: string,
  currentMedications: string[]
): DrugInteraction | null {
  const drugClasses: Record<string, string[]> = {
    'ACE Inhibitors': ['lisinopril', 'enalapril', 'ramipril', 'benazepril', 'captopril'],
    'ARBs': ['losartan', 'valsartan', 'irbesartan', 'olmesartan', 'telmisartan'],
    'Statins': ['atorvastatin', 'simvastatin', 'rosuvastatin', 'pravastatin', 'lovastatin'],
    'PPIs': ['omeprazole', 'pantoprazole', 'esomeprazole', 'lansoprazole', 'rabeprazole'],
    'SSRIs': ['sertraline', 'fluoxetine', 'paroxetine', 'citalopram', 'escitalopram'],
    'Benzodiazepines': ['alprazolam', 'lorazepam', 'clonazepam', 'diazepam', 'temazepam'],
    'Beta Blockers': ['metoprolol', 'atenolol', 'carvedilol', 'propranolol', 'bisoprolol'],
    'Thiazides': ['hydrochlorothiazide', 'chlorthalidone', 'indapamide', 'metolazone'],
    'Opioids': ['hydrocodone', 'oxycodone', 'morphine', 'tramadol', 'fentanyl', 'codeine'],
  };

  const normalizedNew = normalizeDrugName(newDrug);

  for (const [className, drugs] of Object.entries(drugClasses)) {
    const newDrugInClass = drugs.some((d) => normalizedNew.includes(d) || d.includes(normalizedNew));

    if (newDrugInClass) {
      for (const currentMed of currentMedications) {
        const normalizedCurrent = normalizeDrugName(currentMed);
        const currentInSameClass = drugs.some(
          (d) => normalizedCurrent.includes(d) || d.includes(normalizedCurrent)
        );

        if (currentInSameClass && normalizedNew !== normalizedCurrent) {
          return {
            drug1: newDrug,
            drug2: currentMed,
            severity: 'moderate',
            description: `Duplicate therapy: Both medications are ${className}`,
            clinicalEffect: 'Using multiple drugs from the same class may increase adverse effects without additional benefit.',
            recommendation: `Review need for multiple ${className}. Consider discontinuing one if appropriate.`,
            mechanism: 'Duplicate therapeutic class',
          };
        }
      }
    }
  }

  return null;
}

/**
 * Generate summary of interactions
 */
function generateInteractionSummary(interactions: DrugInteraction[]): string {
  if (interactions.length === 0) {
    return 'No drug interactions detected.';
  }

  const high = interactions.filter((i) => i.severity === 'high').length;
  const moderate = interactions.filter((i) => i.severity === 'moderate').length;
  const low = interactions.filter((i) => i.severity === 'low').length;

  const parts: string[] = [];
  if (high > 0) parts.push(`${high} high-severity`);
  if (moderate > 0) parts.push(`${moderate} moderate-severity`);
  if (low > 0) parts.push(`${low} low-severity`);

  return `Found ${interactions.length} interaction(s): ${parts.join(', ')}.`;
}

// ============================================
// CONTRAINDICATION CHECKING
// ============================================

/**
 * Drug-condition contraindications database
 */
const CONTRAINDICATIONS: Record<string, Array<{ condition: string; severity: InteractionSeverity; description: string; alternatives?: string[] }>> = {
  warfarin: [
    { condition: 'active bleeding', severity: 'high', description: 'Contraindicated in patients with active hemorrhage' },
    { condition: 'bleeding disorder', severity: 'high', description: 'Increased bleeding risk in coagulopathies' },
    { condition: 'pregnancy', severity: 'high', description: 'Teratogenic; crosses placenta', alternatives: ['heparin', 'enoxaparin'] },
    { condition: 'severe liver disease', severity: 'high', description: 'Impaired clotting factor synthesis' },
  ],
  metformin: [
    { condition: 'kidney disease', severity: 'high', description: 'Risk of lactic acidosis with eGFR <30', alternatives: ['insulin', 'glipizide'] },
    { condition: 'liver disease', severity: 'high', description: 'Impaired lactate metabolism increases lactic acidosis risk' },
    { condition: 'heart failure', severity: 'moderate', description: 'Use with caution; increased lactic acidosis risk' },
    { condition: 'alcohol abuse', severity: 'moderate', description: 'Alcohol potentiates lactic acidosis risk' },
  ],
  lisinopril: [
    { condition: 'angioedema', severity: 'high', description: 'History of ACE inhibitor angioedema is absolute contraindication', alternatives: ['losartan', 'amlodipine'] },
    { condition: 'pregnancy', severity: 'high', description: 'Fetotoxic; causes oligohydramnios', alternatives: ['labetalol', 'nifedipine'] },
    { condition: 'bilateral renal artery stenosis', severity: 'high', description: 'May precipitate acute renal failure' },
    { condition: 'hyperkalemia', severity: 'moderate', description: 'ACE inhibitors cause potassium retention' },
  ],
  nsaids: [
    { condition: 'kidney disease', severity: 'high', description: 'NSAIDs reduce renal blood flow', alternatives: ['acetaminophen'] },
    { condition: 'peptic ulcer', severity: 'high', description: 'Increased GI bleeding risk', alternatives: ['acetaminophen', 'topical NSAIDs'] },
    { condition: 'heart failure', severity: 'moderate', description: 'Fluid retention and reduced renal function' },
    { condition: 'pregnancy', severity: 'high', description: 'Avoid especially in third trimester' },
    { condition: 'asthma', severity: 'moderate', description: 'May trigger aspirin-exacerbated respiratory disease' },
  ],
  aspirin: [
    { condition: 'bleeding disorder', severity: 'high', description: 'Impaired platelet function increases bleeding' },
    { condition: 'peptic ulcer', severity: 'high', description: 'High risk of GI hemorrhage' },
    { condition: 'children with viral illness', severity: 'high', description: 'Risk of Reye syndrome' },
    { condition: 'gout', severity: 'moderate', description: 'Low-dose aspirin increases uric acid' },
  ],
  statins: [
    { condition: 'liver disease', severity: 'high', description: 'Active liver disease is contraindication' },
    { condition: 'pregnancy', severity: 'high', description: 'Teratogenic potential' },
    { condition: 'myopathy', severity: 'moderate', description: 'Increased risk of rhabdomyolysis' },
  ],
  opioids: [
    { condition: 'respiratory depression', severity: 'high', description: 'May worsen respiratory function' },
    { condition: 'sleep apnea', severity: 'high', description: 'Increased risk of fatal respiratory depression' },
    { condition: 'head injury', severity: 'high', description: 'May mask neurological changes' },
    { condition: 'substance abuse', severity: 'moderate', description: 'High addiction potential' },
  ],
  benzodiazepines: [
    { condition: 'sleep apnea', severity: 'high', description: 'Risk of fatal respiratory depression' },
    { condition: 'myasthenia gravis', severity: 'high', description: 'May worsen muscle weakness' },
    { condition: 'substance abuse', severity: 'moderate', description: 'High dependence potential' },
    { condition: 'pregnancy', severity: 'high', description: 'Risk of neonatal withdrawal and floppy infant syndrome' },
  ],
};

/**
 * Check for contraindications based on patient conditions
 */
export function checkContraindications(
  drugName: string,
  patientConditions: string[]
): ContraindicationCheckResult {
  const normalizedDrug = normalizeDrugName(drugName);
  const contraindications: Contraindication[] = [];

  // Find matching drug entry
  for (const [drug, conditions] of Object.entries(CONTRAINDICATIONS)) {
    if (!normalizedDrug.includes(drug) && !drug.includes(normalizedDrug)) continue;

    for (const conditionEntry of conditions) {
      // Check if patient has this condition
      const hasCondition = patientConditions.some((pc) => {
        const normalizedPC = pc.toLowerCase();
        const normalizedCondition = conditionEntry.condition.toLowerCase();
        return normalizedPC.includes(normalizedCondition) || normalizedCondition.includes(normalizedPC);
      });

      if (hasCondition) {
        contraindications.push({
          drugName,
          condition: conditionEntry.condition,
          severity: conditionEntry.severity,
          description: conditionEntry.description,
          recommendation: `Consider avoiding ${drugName} due to ${conditionEntry.condition}.`,
          alternativeDrugs: conditionEntry.alternatives,
        });
      }
    }
  }

  return {
    hasContraindications: contraindications.length > 0,
    contraindications,
    patientConditions,
  };
}

// ============================================
// ALLERGY CROSS-REACTIVITY CHECKING
// ============================================

/**
 * Check for allergy conflicts including cross-reactivity
 */
export function checkAllergies(
  drugName: string,
  patientAllergies: string[]
): AllergyCheckResult {
  const normalizedDrug = normalizeDrugName(drugName);
  const alerts: AllergyAlert[] = [];
  const crossReactivityWarnings: string[] = [];

  for (const allergy of patientAllergies) {
    const normalizedAllergy = normalizeDrugName(allergy);

    // Direct match
    if (normalizedDrug.includes(normalizedAllergy) || normalizedAllergy.includes(normalizedDrug)) {
      alerts.push({
        allergen: allergy,
        drugName,
        type: 'direct_match',
        severity: 'high',
        recommendation: `Patient has documented allergy to ${allergy}. Do not prescribe ${drugName}.`,
      });
      continue;
    }

    // Check cross-reactivity
    for (const [allergyClass, relatedDrugs] of Object.entries(ALLERGY_CROSS_REACTIVITY)) {
      // Check if patient allergy matches this class
      const allergyMatchesClass =
        normalizedAllergy.includes(allergyClass) ||
        relatedDrugs.some((d) => normalizedAllergy.includes(d));

      if (allergyMatchesClass) {
        // Check if prescribed drug is in the cross-reactive class
        const drugInClass = relatedDrugs.some(
          (d) => normalizedDrug.includes(d) || d.includes(normalizedDrug)
        );

        if (drugInClass) {
          alerts.push({
            allergen: allergy,
            drugName,
            type: 'cross_reactivity',
            severity: allergyClass === 'penicillin' && normalizedDrug.includes('cephalosporin') ? 'moderate' : 'high',
            recommendation: `Potential cross-reactivity between ${allergy} and ${drugName}. Use with extreme caution or avoid.`,
          });
          crossReactivityWarnings.push(
            `${allergyClass} class cross-reactivity: ${allergy} → ${drugName}`
          );
        }
      }
    }
  }

  return {
    hasAllergies: alerts.length > 0,
    alerts,
    crossReactivityWarnings,
  };
}

/**
 * Comprehensive safety check combining interactions, contraindications, and allergies
 */
export function comprehensiveSafetyCheck(
  drugName: string,
  currentMedications: string[],
  patientConditions: string[],
  patientAllergies: string[]
): {
  safe: boolean;
  interactions: InteractionCheckResult;
  contraindications: ContraindicationCheckResult;
  allergies: AllergyCheckResult;
  overallRisk: InteractionSeverity;
  summary: string;
} {
  const interactions = checkDrugInteractions(drugName, currentMedications);
  const contraindications = checkContraindications(drugName, patientConditions);
  const allergies = checkAllergies(drugName, patientAllergies);

  // Determine overall risk
  let overallRisk: InteractionSeverity = 'low';
  if (
    interactions.highSeverityCount > 0 ||
    contraindications.contraindications.some((c) => c.severity === 'high') ||
    allergies.alerts.some((a) => a.severity === 'high')
  ) {
    overallRisk = 'high';
  } else if (
    interactions.moderateSeverityCount > 0 ||
    contraindications.contraindications.some((c) => c.severity === 'moderate') ||
    allergies.alerts.some((a) => a.severity === 'moderate')
  ) {
    overallRisk = 'moderate';
  }

  const safe =
    !interactions.hasInteractions &&
    !contraindications.hasContraindications &&
    !allergies.hasAllergies;

  // Generate summary
  const summaryParts: string[] = [];
  if (interactions.hasInteractions) {
    summaryParts.push(interactions.summary);
  }
  if (contraindications.hasContraindications) {
    summaryParts.push(`${contraindications.contraindications.length} contraindication(s) found.`);
  }
  if (allergies.hasAllergies) {
    summaryParts.push(`${allergies.alerts.length} allergy alert(s).`);
  }

  return {
    safe,
    interactions,
    contraindications,
    allergies,
    overallRisk,
    summary: safe ? 'No safety concerns identified.' : summaryParts.join(' '),
  };
}
