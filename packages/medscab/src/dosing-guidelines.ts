/**
 * Dosing Guidelines Service
 *
 * Provides personalized dosing recommendations based on patient
 * characteristics including age, weight, renal function, and hepatic function.
 */

import type {
  DosingGuidelinesInput,
  DosingGuideline,
  DosingGuidelinesResult,
} from './types';

/**
 * Comprehensive dosing guidelines database
 */
const DOSING_GUIDELINES: Record<string, DosingGuideline[]> = {
  metformin: [
    {
      drugName: 'Metformin',
      indication: 'Type 2 Diabetes',
      standardDose: '500-1000 mg',
      frequency: 'Twice daily with meals',
      route: 'oral',
      maxDailyDose: '2550 mg',
      renalAdjustment: 'CrCl 30-45: Max 1000mg/day; CrCl <30: Contraindicated',
      hepaticAdjustment: 'Avoid in hepatic impairment',
      geriatricConsiderations: 'Start at lowest dose; monitor renal function',
      monitoringParameters: ['Renal function', 'B12 levels annually', 'Blood glucose'],
      notes: ['Take with food to reduce GI side effects', 'Hold before contrast procedures'],
    },
  ],
  lisinopril: [
    {
      drugName: 'Lisinopril',
      indication: 'Hypertension',
      standardDose: '10-40 mg',
      frequency: 'Once daily',
      route: 'oral',
      maxDailyDose: '80 mg',
      renalAdjustment: 'CrCl 10-30: Start 2.5-5mg; CrCl <10: Start 2.5mg',
      geriatricConsiderations: 'Start low, titrate slowly',
      monitoringParameters: ['Blood pressure', 'Potassium', 'Renal function', 'Cough'],
      notes: ['Monitor for angioedema', 'Check K+ within 2 weeks of initiation'],
    },
    {
      drugName: 'Lisinopril',
      indication: 'Heart Failure',
      standardDose: '2.5-5 mg initial, titrate to 20-40 mg',
      frequency: 'Once daily',
      route: 'oral',
      maxDailyDose: '40 mg',
      renalAdjustment: 'CrCl <30: Start 2.5mg',
      geriatricConsiderations: 'Start at 2.5mg, titrate slowly',
      monitoringParameters: ['Blood pressure', 'Potassium', 'Renal function', 'Heart failure symptoms'],
      notes: ['Titrate every 2 weeks as tolerated'],
    },
  ],
  atorvastatin: [
    {
      drugName: 'Atorvastatin',
      indication: 'Hyperlipidemia',
      standardDose: '10-80 mg',
      frequency: 'Once daily',
      route: 'oral',
      maxDailyDose: '80 mg',
      hepaticAdjustment: 'Contraindicated in active liver disease',
      geriatricConsiderations: 'No specific adjustment; monitor for myopathy',
      monitoringParameters: ['Lipid panel', 'LFTs at baseline', 'CK if symptomatic'],
      notes: ['Can be taken any time of day', 'Avoid grapefruit juice with high doses'],
    },
  ],
  amlodipine: [
    {
      drugName: 'Amlodipine',
      indication: 'Hypertension',
      standardDose: '5-10 mg',
      frequency: 'Once daily',
      route: 'oral',
      maxDailyDose: '10 mg',
      hepaticAdjustment: 'Start at 2.5mg in hepatic impairment',
      geriatricConsiderations: 'Start at 2.5mg',
      monitoringParameters: ['Blood pressure', 'Heart rate', 'Peripheral edema'],
      notes: ['Peripheral edema is dose-related', 'Takes 7-14 days for full effect'],
    },
  ],
  omeprazole: [
    {
      drugName: 'Omeprazole',
      indication: 'GERD',
      standardDose: '20 mg',
      frequency: 'Once daily before breakfast',
      route: 'oral',
      maxDailyDose: '40 mg',
      hepaticAdjustment: 'Max 20mg/day in severe hepatic impairment',
      monitoringParameters: ['Symptom relief', 'B12 with long-term use', 'Magnesium'],
      notes: ['Take 30-60 min before meals', 'Limit long-term use when possible'],
    },
    {
      drugName: 'Omeprazole',
      indication: 'Peptic Ulcer',
      standardDose: '20-40 mg',
      frequency: 'Once or twice daily',
      route: 'oral',
      maxDailyDose: '40 mg',
      monitoringParameters: ['Symptom relief', 'H. pylori eradication if applicable'],
      notes: ['Duration typically 4-8 weeks'],
    },
  ],
  gabapentin: [
    {
      drugName: 'Gabapentin',
      indication: 'Neuropathic Pain',
      standardDose: '300-600 mg',
      frequency: 'Three times daily',
      route: 'oral',
      maxDailyDose: '3600 mg',
      renalAdjustment: 'CrCl 30-60: Max 1400mg/day; CrCl 15-30: Max 700mg/day; CrCl <15: Max 300mg/day',
      geriatricConsiderations: 'Start low, titrate slowly; increased fall risk',
      monitoringParameters: ['Pain relief', 'Sedation', 'Peripheral edema'],
      notes: ['Taper when discontinuing', 'May cause weight gain'],
    },
    {
      drugName: 'Gabapentin',
      indication: 'Seizures',
      standardDose: '900-1800 mg',
      frequency: 'Three times daily',
      route: 'oral',
      maxDailyDose: '3600 mg',
      pediatricDose: 'Children 3-12: 25-35 mg/kg/day divided TID',
      renalAdjustment: 'Reduce dose based on CrCl',
      monitoringParameters: ['Seizure frequency', 'Sedation', 'Behavioral changes'],
      notes: ['Do not stop abruptly'],
    },
  ],
  warfarin: [
    {
      drugName: 'Warfarin',
      indication: 'Anticoagulation',
      standardDose: '2-10 mg (highly variable)',
      frequency: 'Once daily',
      route: 'oral',
      maxDailyDose: 'Based on INR',
      hepaticAdjustment: 'Reduce dose; enhanced sensitivity',
      geriatricConsiderations: 'Start 2.5-5mg; elderly are more sensitive',
      monitoringParameters: ['INR (target 2-3 for most indications)', 'Signs of bleeding', 'Interactions'],
      notes: ['Many drug and food interactions', 'Consistent vitamin K intake important'],
    },
  ],
  levothyroxine: [
    {
      drugName: 'Levothyroxine',
      indication: 'Hypothyroidism',
      standardDose: '1.6 mcg/kg/day (full replacement)',
      frequency: 'Once daily on empty stomach',
      route: 'oral',
      maxDailyDose: '200-300 mcg',
      geriatricConsiderations: 'Start 12.5-25 mcg; increase by 12.5-25 mcg q6-8 weeks',
      monitoringParameters: ['TSH every 6-8 weeks until stable', 'Then annually', 'Heart rate'],
      notes: ['Take 60 min before food', 'Separate from calcium, iron, antacids by 4 hours'],
    },
  ],
  prednisone: [
    {
      drugName: 'Prednisone',
      indication: 'Anti-inflammatory',
      standardDose: '5-60 mg',
      frequency: 'Once daily in morning',
      route: 'oral',
      maxDailyDose: '250 mg (pulse therapy)',
      geriatricConsiderations: 'Use lowest effective dose; monitor for adverse effects',
      monitoringParameters: ['Blood glucose', 'Blood pressure', 'Bone density if long-term', 'Infection signs'],
      notes: ['Taper if >7-14 days use', 'Take with food', 'Morning dosing mimics physiologic cortisol'],
    },
  ],
  hydrocodone: [
    {
      drugName: 'Hydrocodone/Acetaminophen',
      indication: 'Moderate to Severe Pain',
      standardDose: '5/325 mg to 10/325 mg',
      frequency: 'Every 4-6 hours as needed',
      route: 'oral',
      maxDailyDose: '60 mg hydrocodone; 4000 mg acetaminophen',
      hepaticAdjustment: 'Reduce acetaminophen dose; use with caution',
      renalAdjustment: 'Use with caution; start at lowest dose',
      geriatricConsiderations: 'Start at lowest dose; increased sensitivity',
      monitoringParameters: ['Pain relief', 'Sedation', 'Respiratory rate', 'Bowel function'],
      notes: ['DEA Schedule II', 'Assess opioid risk before prescribing', 'Prescribe naloxone if appropriate'],
    },
  ],
  alprazolam: [
    {
      drugName: 'Alprazolam',
      indication: 'Anxiety',
      standardDose: '0.25-0.5 mg',
      frequency: 'Three times daily',
      route: 'oral',
      maxDailyDose: '4 mg',
      hepaticAdjustment: 'Start 0.25mg, titrate slowly; avoid in severe',
      geriatricConsiderations: 'Start 0.25mg; avoid if possible (Beers Criteria)',
      monitoringParameters: ['Anxiety symptoms', 'Sedation', 'Cognitive function', 'Dependence'],
      notes: ['DEA Schedule IV', 'Taper slowly when discontinuing', 'Avoid in elderly'],
    },
  ],
  amoxicillin: [
    {
      drugName: 'Amoxicillin',
      indication: 'Bacterial Infections',
      standardDose: '250-500 mg',
      frequency: 'Three times daily',
      route: 'oral',
      maxDailyDose: '3000 mg',
      pediatricDose: '25-50 mg/kg/day divided q8h',
      renalAdjustment: 'CrCl 10-30: q12h dosing; CrCl <10: q24h dosing',
      monitoringParameters: ['Signs of infection resolution', 'Rash', 'GI symptoms'],
      notes: ['Complete full course', 'Can be taken with or without food'],
    },
  ],
};

/**
 * Get dosing guidelines for a medication
 */
export function getDosingGuidelines(input: DosingGuidelinesInput): DosingGuidelinesResult {
  const normalizedDrug = input.drugName.toLowerCase();

  // Find matching guidelines
  let guidelines: DosingGuideline[] = [];

  for (const [drug, drugGuidelines] of Object.entries(DOSING_GUIDELINES)) {
    if (normalizedDrug.includes(drug) || drug.includes(normalizedDrug)) {
      guidelines = drugGuidelines;
      break;
    }
  }

  // If no specific guidelines found, return generic guidance
  if (guidelines.length === 0) {
    guidelines = [
      {
        drugName: input.drugName,
        indication: 'General',
        standardDose: 'Refer to prescribing information',
        frequency: 'As directed',
        route: 'oral',
        maxDailyDose: 'See prescribing information',
        monitoringParameters: ['Efficacy', 'Adverse effects'],
        notes: ['Consult prescribing information for specific dosing'],
      },
    ];
  }

  // Filter by indication if provided
  if (input.indication) {
    const indicationGuidelines = guidelines.filter((g) =>
      g.indication.toLowerCase().includes(input.indication!.toLowerCase())
    );
    if (indicationGuidelines.length > 0) {
      guidelines = indicationGuidelines;
    }
  }

  // Apply patient-specific adjustments
  const adjustedGuidelines = guidelines.map((g) => applyPatientAdjustments(g, input));

  // Determine patient-specific factors
  const patientSpecific = {
    ageGroup: determineAgeGroup(input.patientAge),
    renalStatus: determineRenalStatus(input.creatinineClearance),
    hepaticStatus: input.hepaticFunction || 'normal',
    requiresAdjustment:
      input.creatinineClearance !== undefined && input.creatinineClearance < 60 ||
      input.hepaticFunction !== undefined && input.hepaticFunction !== 'normal' ||
      input.patientAge >= 65 ||
      input.patientAge < 18,
  };

  return {
    guidelines: adjustedGuidelines,
    patientSpecific,
  };
}

/**
 * Apply patient-specific adjustments to guidelines
 */
function applyPatientAdjustments(
  guideline: DosingGuideline,
  input: DosingGuidelinesInput
): DosingGuideline {
  const adjusted = { ...guideline };
  const notes = [...(guideline.notes || [])];

  // Age adjustments
  if (input.patientAge >= 65 && guideline.geriatricConsiderations) {
    adjusted.adjustedDose = `Geriatric: ${guideline.geriatricConsiderations}`;
    notes.push('Geriatric dosing applied');
  }

  if (input.patientAge < 18 && guideline.pediatricDose) {
    adjusted.adjustedDose = guideline.pediatricDose;
    notes.push('Pediatric dosing applied');
  }

  // Renal adjustments
  if (input.creatinineClearance !== undefined && guideline.renalAdjustment) {
    if (input.creatinineClearance < 60) {
      notes.push(`Renal adjustment needed: CrCl ${input.creatinineClearance} mL/min`);
      adjusted.adjustedDose = (adjusted.adjustedDose ? adjusted.adjustedDose + '; ' : '') +
        `Renal: ${guideline.renalAdjustment}`;
    }
  }

  // Hepatic adjustments
  if (input.hepaticFunction && input.hepaticFunction !== 'normal' && guideline.hepaticAdjustment) {
    notes.push(`Hepatic adjustment needed: ${input.hepaticFunction} impairment`);
    adjusted.adjustedDose = (adjusted.adjustedDose ? adjusted.adjustedDose + '; ' : '') +
      `Hepatic: ${guideline.hepaticAdjustment}`;
  }

  // Weight-based dosing
  if (input.patientWeight && guideline.standardDose.includes('mg/kg')) {
    const match = guideline.standardDose.match(/(\d+(?:\.\d+)?)\s*mg\/kg/);
    if (match) {
      const mgPerKg = parseFloat(match[1]);
      const calculatedDose = Math.round(mgPerKg * input.patientWeight);
      notes.push(`Weight-based dose: ${calculatedDose} mg (${mgPerKg} mg/kg × ${input.patientWeight} kg)`);
    }
  }

  adjusted.notes = notes;
  return adjusted;
}

/**
 * Determine age group
 */
function determineAgeGroup(age: number): 'pediatric' | 'adult' | 'geriatric' {
  if (age < 18) return 'pediatric';
  if (age >= 65) return 'geriatric';
  return 'adult';
}

/**
 * Determine renal status description
 */
function determineRenalStatus(creatinineClearance?: number): string {
  if (creatinineClearance === undefined) return 'Not assessed';
  if (creatinineClearance >= 90) return 'Normal (CrCl ≥90)';
  if (creatinineClearance >= 60) return 'Mild impairment (CrCl 60-89)';
  if (creatinineClearance >= 30) return 'Moderate impairment (CrCl 30-59)';
  if (creatinineClearance >= 15) return 'Severe impairment (CrCl 15-29)';
  return 'End-stage renal disease (CrCl <15)';
}

/**
 * Get standard frequencies for a route of administration
 */
export function getStandardFrequencies(route: string): string[] {
  const frequencies: Record<string, string[]> = {
    oral: [
      'Once daily',
      'Twice daily',
      'Three times daily',
      'Four times daily',
      'Every 4 hours',
      'Every 6 hours',
      'Every 8 hours',
      'Every 12 hours',
      'At bedtime',
      'Before meals',
      'With meals',
    ],
    injection: [
      'Once daily',
      'Twice daily',
      'Every 12 hours',
      'Every 24 hours',
      'Weekly',
      'Every 2 weeks',
      'Monthly',
    ],
    topical: [
      'Once daily',
      'Twice daily',
      'Three times daily',
      'As needed',
    ],
    inhalation: [
      'Once daily',
      'Twice daily',
      'Every 4-6 hours as needed',
      'Before exercise',
    ],
    subcutaneous: [
      'Once daily',
      'Twice daily',
      'Weekly',
      'Every 2 weeks',
      'Monthly',
    ],
  };

  return frequencies[route.toLowerCase()] || frequencies.oral;
}

/**
 * Get standard routes of administration
 */
export function getStandardRoutes(): string[] {
  return [
    'Oral',
    'Sublingual',
    'Buccal',
    'Intravenous',
    'Intramuscular',
    'Subcutaneous',
    'Topical',
    'Transdermal',
    'Inhalation',
    'Nasal',
    'Ophthalmic',
    'Otic',
    'Rectal',
    'Vaginal',
  ];
}
