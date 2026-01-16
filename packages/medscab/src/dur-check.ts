/**
 * Drug Utilization Review (DUR) Service
 *
 * Comprehensive medication safety checking including:
 * - Drug-drug interactions
 * - Allergy checking
 * - Contraindication detection
 * - Duplicate therapy
 * - Dosing alerts
 * - Age-specific warnings
 * - Renal/hepatic adjustments
 * - Pregnancy/nursing alerts
 */

import type {
  DURAlert,
  DURAlertType,
  DURCheckInput,
  DURCheckResult,
  InteractionSeverity,
} from './types';
import {
  checkDrugInteractions,
  checkContraindications,
  checkAllergies,
} from './drug-interactions';

/**
 * Perform comprehensive Drug Utilization Review
 */
export async function performDURCheck(input: DURCheckInput): Promise<DURCheckResult> {
  const alerts: DURAlert[] = [];
  const timestamp = new Date();

  // 1. Check drug-drug interactions
  if (input.currentMedications && input.currentMedications.length > 0) {
    const interactionResult = checkDrugInteractions(
      input.drugName,
      input.currentMedications
    );

    for (const interaction of interactionResult.interactions) {
      alerts.push({
        type: 'drug_interaction',
        severity: interaction.severity,
        code: `DI-${interaction.severity.toUpperCase()}-001`,
        message: `${interaction.description}: ${input.drugName} + ${interaction.drug2}`,
        recommendation: interaction.recommendation,
        category: 'Drug Interaction',
        overridable: interaction.severity !== 'high',
        requiresDocumentation: interaction.severity === 'high',
      });
    }
  }

  // 2. Check allergies
  if (input.patientAllergies && input.patientAllergies.length > 0) {
    const allergyResult = checkAllergies(input.drugName, input.patientAllergies);

    for (const alert of allergyResult.alerts) {
      alerts.push({
        type: 'allergy',
        severity: alert.severity,
        code: `AL-${alert.type.toUpperCase()}-001`,
        message: `Allergy alert: Patient allergic to ${alert.allergen}`,
        recommendation: alert.recommendation,
        category: 'Allergy',
        overridable: alert.type !== 'direct_match',
        requiresDocumentation: true,
      });
    }
  }

  // 3. Check contraindications
  if (input.patientConditions && input.patientConditions.length > 0) {
    const contraindicationResult = checkContraindications(
      input.drugName,
      input.patientConditions
    );

    for (const contraindication of contraindicationResult.contraindications) {
      alerts.push({
        type: 'contraindication',
        severity: contraindication.severity,
        code: `CI-${contraindication.severity.toUpperCase()}-001`,
        message: `Contraindication: ${contraindication.description}`,
        recommendation: contraindication.recommendation,
        category: 'Contraindication',
        overridable: contraindication.severity !== 'high',
        requiresDocumentation: true,
      });
    }
  }

  // 4. Age-specific alerts
  if (input.patientAge !== undefined) {
    const ageAlerts = checkAgeAlerts(input.drugName, input.patientAge);
    alerts.push(...ageAlerts);
  }

  // 5. Renal dosing alerts
  if (input.creatinineClearance !== undefined) {
    const renalAlerts = checkRenalAlerts(
      input.drugName,
      input.creatinineClearance,
      input.dosage
    );
    alerts.push(...renalAlerts);
  }

  // 6. Hepatic dosing alerts
  if (input.hepaticFunction && input.hepaticFunction !== 'normal') {
    const hepaticAlerts = checkHepaticAlerts(
      input.drugName,
      input.hepaticFunction,
      input.dosage
    );
    alerts.push(...hepaticAlerts);
  }

  // 7. Pregnancy alerts
  if (input.isPregnant) {
    const pregnancyAlerts = checkPregnancyAlerts(input.drugName);
    alerts.push(...pregnancyAlerts);
  }

  // 8. Nursing alerts
  if (input.isNursing) {
    const nursingAlerts = checkNursingAlerts(input.drugName);
    alerts.push(...nursingAlerts);
  }

  // 9. Check for monitoring requirements
  const monitoringAlerts = checkMonitoringRequirements(input.drugName);
  alerts.push(...monitoringAlerts);

  // Calculate results
  const hasHighSeverityAlerts = alerts.some((a) => a.severity === 'high');
  const alertCount = alerts.length;

  return {
    passed: alertCount === 0,
    alerts,
    alertCount,
    hasHighSeverityAlerts,
    summary: generateDURSummary(alerts),
    timestamp,
  };
}

/**
 * Check for age-specific medication concerns
 */
function checkAgeAlerts(drugName: string, age: number): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalizedDrug = drugName.toLowerCase();

  // Pediatric alerts (under 18)
  if (age < 18) {
    const pediatricConcerns: Record<string, { minAge: number; message: string }> = {
      aspirin: { minAge: 16, message: 'Risk of Reye syndrome in children with viral illness' },
      fluoroquinolone: { minAge: 18, message: 'May affect cartilage development in children' },
      ciprofloxacin: { minAge: 18, message: 'May affect cartilage development in children' },
      levofloxacin: { minAge: 18, message: 'May affect cartilage development in children' },
      tetracycline: { minAge: 8, message: 'May cause permanent tooth discoloration' },
      doxycycline: { minAge: 8, message: 'May cause permanent tooth discoloration' },
    };

    for (const [drug, concern] of Object.entries(pediatricConcerns)) {
      if (normalizedDrug.includes(drug) && age < concern.minAge) {
        alerts.push({
          type: 'age_alert',
          severity: 'high',
          code: 'AGE-PED-001',
          message: `Pediatric concern: ${concern.message}`,
          recommendation: `Verify appropriateness for patient age ${age}. Consider alternatives.`,
          category: 'Age-Related',
          overridable: true,
          requiresDocumentation: true,
        });
      }
    }
  }

  // Geriatric alerts (65+)
  if (age >= 65) {
    const beersCriteriaDrugs = [
      'benzodiazepine',
      'alprazolam',
      'lorazepam',
      'diazepam',
      'zolpidem',
      'diphenhydramine',
      'hydroxyzine',
      'amitriptyline',
      'imipramine',
      'chlorpheniramine',
      'promethazine',
      'meperidine',
      'indomethacin',
      'ketorolac',
    ];

    for (const drug of beersCriteriaDrugs) {
      if (normalizedDrug.includes(drug)) {
        alerts.push({
          type: 'age_alert',
          severity: 'moderate',
          code: 'AGE-GER-001',
          message: `Beers Criteria: ${drugName} is potentially inappropriate in elderly patients`,
          recommendation: 'Consider safer alternatives. If necessary, use lowest effective dose.',
          category: 'Geriatric',
          overridable: true,
          requiresDocumentation: true,
        });
        break;
      }
    }

    // Fall risk medications
    const fallRiskDrugs = ['opioid', 'benzodiazepine', 'antipsychotic', 'antidepressant', 'sedative'];
    for (const drug of fallRiskDrugs) {
      if (normalizedDrug.includes(drug)) {
        alerts.push({
          type: 'age_alert',
          severity: 'low',
          code: 'AGE-FALL-001',
          message: 'Fall risk: This medication may increase fall risk in elderly patients',
          recommendation: 'Counsel patient on fall precautions. Consider dose reduction.',
          category: 'Geriatric',
          overridable: true,
          requiresDocumentation: false,
        });
        break;
      }
    }
  }

  return alerts;
}

/**
 * Check for renal dosing adjustments
 */
function checkRenalAlerts(
  drugName: string,
  creatinineClearance: number,
  currentDosage: string
): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalizedDrug = drugName.toLowerCase();

  // Drugs requiring renal adjustment
  const renalAdjustmentDrugs: Record<string, { threshold: number; adjustment: string; severity: InteractionSeverity }> = {
    metformin: { threshold: 30, adjustment: 'Contraindicated if CrCl <30', severity: 'high' },
    gabapentin: { threshold: 60, adjustment: 'Reduce dose based on CrCl', severity: 'moderate' },
    pregabalin: { threshold: 60, adjustment: 'Reduce dose based on CrCl', severity: 'moderate' },
    enoxaparin: { threshold: 30, adjustment: 'Reduce to once daily dosing', severity: 'high' },
    ciprofloxacin: { threshold: 50, adjustment: 'Reduce dose or extend interval', severity: 'moderate' },
    levofloxacin: { threshold: 50, adjustment: 'Reduce dose or extend interval', severity: 'moderate' },
    vancomycin: { threshold: 50, adjustment: 'Extend dosing interval significantly', severity: 'high' },
    acyclovir: { threshold: 50, adjustment: 'Reduce dose based on CrCl', severity: 'moderate' },
    allopurinol: { threshold: 60, adjustment: 'Start at reduced dose', severity: 'moderate' },
    lithium: { threshold: 60, adjustment: 'Reduce dose and monitor closely', severity: 'high' },
    digoxin: { threshold: 50, adjustment: 'Reduce dose; monitor levels', severity: 'high' },
    dabigatran: { threshold: 30, adjustment: 'Avoid if CrCl <30', severity: 'high' },
    rivaroxaban: { threshold: 50, adjustment: 'Dose adjustment required', severity: 'high' },
    apixaban: { threshold: 25, adjustment: 'Dose adjustment if CrCl <25 and other criteria', severity: 'moderate' },
  };

  for (const [drug, info] of Object.entries(renalAdjustmentDrugs)) {
    if (normalizedDrug.includes(drug) && creatinineClearance < info.threshold) {
      alerts.push({
        type: 'renal_alert',
        severity: info.severity,
        code: 'RENAL-ADJ-001',
        message: `Renal adjustment needed: CrCl ${creatinineClearance} mL/min is below threshold of ${info.threshold}`,
        recommendation: info.adjustment,
        category: 'Renal',
        overridable: info.severity !== 'high',
        requiresDocumentation: true,
      });
    }
  }

  // General severe renal impairment warning
  if (creatinineClearance < 15) {
    alerts.push({
      type: 'renal_alert',
      severity: 'high',
      code: 'RENAL-ESRD-001',
      message: 'Severe renal impairment (CrCl <15): Review all medications for dialyzability',
      recommendation: 'Consult nephrology. Consider if drug is dialyzable.',
      category: 'Renal',
      overridable: true,
      requiresDocumentation: true,
    });
  }

  return alerts;
}

/**
 * Check for hepatic dosing adjustments
 */
function checkHepaticAlerts(
  drugName: string,
  hepaticFunction: 'mild' | 'moderate' | 'severe',
  currentDosage: string
): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalizedDrug = drugName.toLowerCase();

  // Drugs requiring hepatic adjustment
  const hepaticConcernDrugs = [
    'acetaminophen',
    'methotrexate',
    'statins',
    'atorvastatin',
    'simvastatin',
    'ketoconazole',
    'itraconazole',
    'fluconazole',
    'isoniazid',
    'rifampin',
    'valproic acid',
    'carbamazepine',
    'phenytoin',
    'diazepam',
    'midazolam',
    'oxycodone',
    'morphine',
    'tramadol',
  ];

  const isConcernDrug = hepaticConcernDrugs.some((d) => normalizedDrug.includes(d));

  if (isConcernDrug) {
    const severity: InteractionSeverity = hepaticFunction === 'severe' ? 'high' : 'moderate';

    alerts.push({
      type: 'hepatic_alert',
      severity,
      code: 'HEPATIC-ADJ-001',
      message: `Hepatic impairment (${hepaticFunction}): ${drugName} may require dose adjustment`,
      recommendation: hepaticFunction === 'severe'
        ? 'Consider avoiding or significant dose reduction. Monitor LFTs.'
        : 'Consider dose reduction. Monitor liver function.',
      category: 'Hepatic',
      overridable: hepaticFunction !== 'severe',
      requiresDocumentation: true,
    });
  }

  // Acetaminophen specific warning
  if (normalizedDrug.includes('acetaminophen') || normalizedDrug.includes('paracetamol')) {
    alerts.push({
      type: 'hepatic_alert',
      severity: hepaticFunction === 'severe' ? 'high' : 'moderate',
      code: 'HEPATIC-APAP-001',
      message: 'Acetaminophen: Maximum daily dose should be reduced in hepatic impairment',
      recommendation: `Limit to ${hepaticFunction === 'severe' ? '2g' : '3g'} daily. Avoid in active liver disease.`,
      category: 'Hepatic',
      overridable: hepaticFunction !== 'severe',
      requiresDocumentation: true,
    });
  }

  return alerts;
}

/**
 * Check for pregnancy concerns
 */
function checkPregnancyAlerts(drugName: string): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalizedDrug = drugName.toLowerCase();

  // Category X drugs (contraindicated)
  const categoryXDrugs = [
    'warfarin',
    'methotrexate',
    'isotretinoin',
    'thalidomide',
    'statins',
    'atorvastatin',
    'simvastatin',
    'rosuvastatin',
    'finasteride',
    'dutasteride',
    'misoprostol',
    'ribavirin',
    'leflunomide',
  ];

  // Category D drugs (positive evidence of risk)
  const categoryDDrugs = [
    'phenytoin',
    'valproic acid',
    'carbamazepine',
    'lithium',
    'tetracycline',
    'doxycycline',
    'ciprofloxacin',
    'paroxetine',
    'benzodiazepine',
    'alprazolam',
    'diazepam',
  ];

  for (const drug of categoryXDrugs) {
    if (normalizedDrug.includes(drug)) {
      alerts.push({
        type: 'pregnancy_alert',
        severity: 'high',
        code: 'PREG-X-001',
        message: `Pregnancy Category X: ${drugName} is contraindicated in pregnancy`,
        recommendation: 'Do not use during pregnancy. Discuss alternatives with patient.',
        category: 'Pregnancy',
        overridable: false,
        requiresDocumentation: true,
      });
      return alerts;
    }
  }

  for (const drug of categoryDDrugs) {
    if (normalizedDrug.includes(drug)) {
      alerts.push({
        type: 'pregnancy_alert',
        severity: 'high',
        code: 'PREG-D-001',
        message: `Pregnancy Category D: ${drugName} has positive evidence of fetal risk`,
        recommendation: 'Use only if potential benefit justifies risk. Document discussion.',
        category: 'Pregnancy',
        overridable: true,
        requiresDocumentation: true,
      });
      return alerts;
    }
  }

  return alerts;
}

/**
 * Check for nursing/lactation concerns
 */
function checkNursingAlerts(drugName: string): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalizedDrug = drugName.toLowerCase();

  // Drugs to avoid during breastfeeding
  const avoidInNursing = [
    'codeine',
    'tramadol',
    'ergotamine',
    'bromocriptine',
    'cabergoline',
    'lithium',
    'radioactive iodine',
    'cytotoxic',
    'methotrexate',
    'cyclophosphamide',
  ];

  // Drugs requiring caution
  const cautionInNursing = [
    'benzodiazepine',
    'opioid',
    'antidepressant',
    'antipsychotic',
    'anticonvulsant',
    'aspirin',
  ];

  for (const drug of avoidInNursing) {
    if (normalizedDrug.includes(drug)) {
      alerts.push({
        type: 'pregnancy_alert', // Using same type for nursing
        severity: 'high',
        code: 'NURS-AVOID-001',
        message: `Lactation: ${drugName} should be avoided during breastfeeding`,
        recommendation: 'Significant risk to nursing infant. Consider alternatives or pump and discard.',
        category: 'Lactation',
        overridable: false,
        requiresDocumentation: true,
      });
      return alerts;
    }
  }

  for (const drug of cautionInNursing) {
    if (normalizedDrug.includes(drug)) {
      alerts.push({
        type: 'pregnancy_alert',
        severity: 'moderate',
        code: 'NURS-CAUT-001',
        message: `Lactation caution: ${drugName} passes into breast milk`,
        recommendation: 'Monitor infant for sedation, feeding difficulties. Consider timing of doses.',
        category: 'Lactation',
        overridable: true,
        requiresDocumentation: true,
      });
      return alerts;
    }
  }

  return alerts;
}

/**
 * Check for monitoring requirements
 */
function checkMonitoringRequirements(drugName: string): DURAlert[] {
  const alerts: DURAlert[] = [];
  const normalizedDrug = drugName.toLowerCase();

  const monitoringRequirements: Record<string, { parameters: string[]; frequency: string }> = {
    warfarin: { parameters: ['INR', 'signs of bleeding'], frequency: 'Weekly initially, then monthly' },
    metformin: { parameters: ['Renal function', 'B12 levels'], frequency: 'Annually or as indicated' },
    lithium: { parameters: ['Lithium levels', 'Renal function', 'Thyroid function'], frequency: 'Every 3-6 months' },
    digoxin: { parameters: ['Digoxin levels', 'Potassium', 'Renal function'], frequency: 'Periodically' },
    methotrexate: { parameters: ['CBC', 'LFTs', 'Renal function'], frequency: 'Monthly for first 6 months' },
    clozapine: { parameters: ['ANC (absolute neutrophil count)'], frequency: 'Weekly for first 6 months' },
    amiodarone: { parameters: ['Thyroid function', 'LFTs', 'Pulmonary function'], frequency: 'Every 6 months' },
    carbamazepine: { parameters: ['CBC', 'LFTs', 'Drug levels'], frequency: 'Periodically' },
    valproic: { parameters: ['LFTs', 'Ammonia', 'Drug levels'], frequency: 'Periodically' },
    phenytoin: { parameters: ['Drug levels', 'CBC'], frequency: 'Periodically' },
    atorvastatin: { parameters: ['LFTs', 'Lipid panel', 'CK if symptomatic'], frequency: 'Annually' },
    simvastatin: { parameters: ['LFTs', 'Lipid panel', 'CK if symptomatic'], frequency: 'Annually' },
    rosuvastatin: { parameters: ['LFTs', 'Lipid panel', 'CK if symptomatic'], frequency: 'Annually' },
    lisinopril: { parameters: ['Potassium', 'Renal function'], frequency: 'Within 2 weeks of initiation' },
    enalapril: { parameters: ['Potassium', 'Renal function'], frequency: 'Within 2 weeks of initiation' },
    ramipril: { parameters: ['Potassium', 'Renal function'], frequency: 'Within 2 weeks of initiation' },
  };

  for (const [drug, monitoring] of Object.entries(monitoringRequirements)) {
    if (normalizedDrug.includes(drug)) {
      alerts.push({
        type: 'monitoring_required',
        severity: 'low',
        code: 'MON-REQ-001',
        message: `Monitoring required for ${drugName}`,
        recommendation: `Monitor: ${monitoring.parameters.join(', ')}. Frequency: ${monitoring.frequency}`,
        category: 'Monitoring',
        overridable: true,
        requiresDocumentation: false,
      });
      break;
    }
  }

  return alerts;
}

/**
 * Generate DUR summary
 */
function generateDURSummary(alerts: DURAlert[]): string {
  if (alerts.length === 0) {
    return 'DUR check passed. No alerts or concerns identified.';
  }

  const high = alerts.filter((a) => a.severity === 'high').length;
  const moderate = alerts.filter((a) => a.severity === 'moderate').length;
  const low = alerts.filter((a) => a.severity === 'low').length;

  const parts: string[] = [];
  if (high > 0) parts.push(`${high} high-severity`);
  if (moderate > 0) parts.push(`${moderate} moderate-severity`);
  if (low > 0) parts.push(`${low} low-severity`);

  const categories = [...new Set(alerts.map((a) => a.category))];

  return `DUR check found ${alerts.length} alert(s): ${parts.join(', ')}. Categories: ${categories.join(', ')}.`;
}

/**
 * Quick DUR check for common scenarios
 */
export function quickDURCheck(
  drugName: string,
  currentMedications: string[]
): { safe: boolean; alertCount: number; highAlerts: number } {
  const result = checkDrugInteractions(drugName, currentMedications);

  return {
    safe: !result.hasInteractions,
    alertCount: result.interactions.length,
    highAlerts: result.highSeverityCount,
  };
}
