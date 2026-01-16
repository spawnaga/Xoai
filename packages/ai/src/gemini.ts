import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { AIResponse, MedicalAIQuery } from './types';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export interface SymptomAnalysisResult {
  possibleConditions: Array<{
    condition: string;
    likelihood: 'low' | 'moderate' | 'high';
    reasoning: string;
  }>;
  recommendedActions: string[];
  urgencyLevel: 'routine' | 'soon' | 'urgent' | 'emergency';
  disclaimer: string;
}

const MEDICAL_SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

/**
 * Create Gemini AI client for medical applications
 */
export function createGeminiClient(config: GeminiConfig) {
  const genAI = new GoogleGenerativeAI(config.apiKey);
  const modelName = config.model || 'gemini-pro';
  const model = genAI.getGenerativeModel({
    model: modelName,
    safetySettings: MEDICAL_SAFETY_SETTINGS,
  });

  return {
    async generateResponse(prompt: string): Promise<AIResponse> {
      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return {
          content: text,
          usage: {
            promptTokens: 0, // Gemini doesn't provide token counts in the same way
            completionTokens: 0,
            totalTokens: 0,
          },
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Gemini API error: ${errorMessage}`);
      }
    },

    async analyzeMedicalQuery(query: MedicalAIQuery): Promise<AIResponse> {
      const prompt = buildMedicalPrompt(query);
      return this.generateResponse(prompt);
    },

    async analyzeSymptoms(
      symptoms: string[],
      patientContext?: {
        age?: number;
        gender?: string;
        medicalHistory?: string[];
        currentMedications?: string[];
      }
    ): Promise<SymptomAnalysisResult> {
      const prompt = buildSymptomAnalysisPrompt(symptoms, patientContext);

      try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();

        return parseSymptomAnalysisResponse(text);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Symptom analysis error: ${errorMessage}`);
      }
    },

    async generateClinicalSummary(patientData: {
      demographics: { name: string; age: number; gender: string };
      chiefComplaint: string;
      vitals?: Record<string, string | number>;
      symptoms: string[];
      assessments?: string[];
    }): Promise<AIResponse> {
      const prompt = buildClinicalSummaryPrompt(patientData);
      return this.generateResponse(prompt);
    },
  };
}

function buildMedicalPrompt(query: MedicalAIQuery): string {
  const parts: string[] = [
    'You are a medical AI assistant. Provide helpful, accurate medical information while always recommending consultation with healthcare professionals for diagnosis and treatment.',
    '',
  ];

  if (query.patientContext) {
    parts.push(`Patient Context: ${query.patientContext}`);
  }

  if (query.symptoms?.length) {
    parts.push(`Symptoms: ${query.symptoms.join(', ')}`);
  }

  if (query.medications?.length) {
    parts.push(`Current Medications: ${query.medications.join(', ')}`);
  }

  if (query.allergies?.length) {
    parts.push(`Known Allergies: ${query.allergies.join(', ')}`);
  }

  parts.push(`Query: ${query.query}`);

  return parts.join('\n\n');
}

function buildSymptomAnalysisPrompt(
  symptoms: string[],
  patientContext?: {
    age?: number;
    gender?: string;
    medicalHistory?: string[];
    currentMedications?: string[];
  }
): string {
  const parts: string[] = [
    'You are a medical AI assistant performing symptom analysis. Analyze the following symptoms and provide a structured assessment.',
    'IMPORTANT: This is for informational purposes only. Always recommend professional medical consultation.',
    '',
    'Respond in the following JSON format:',
    '{',
    '  "possibleConditions": [{"condition": "name", "likelihood": "low|moderate|high", "reasoning": "explanation"}],',
    '  "recommendedActions": ["action1", "action2"],',
    '  "urgencyLevel": "routine|soon|urgent|emergency"',
    '}',
    '',
  ];

  if (patientContext) {
    if (patientContext.age) parts.push(`Age: ${patientContext.age}`);
    if (patientContext.gender) parts.push(`Gender: ${patientContext.gender}`);
    if (patientContext.medicalHistory?.length) {
      parts.push(`Medical History: ${patientContext.medicalHistory.join(', ')}`);
    }
    if (patientContext.currentMedications?.length) {
      parts.push(`Current Medications: ${patientContext.currentMedications.join(', ')}`);
    }
    parts.push('');
  }

  parts.push(`Symptoms: ${symptoms.join(', ')}`);

  return parts.join('\n');
}

function parseSymptomAnalysisResponse(text: string): SymptomAnalysisResult {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        possibleConditions: parsed.possibleConditions || [],
        recommendedActions: parsed.recommendedActions || [],
        urgencyLevel: parsed.urgencyLevel || 'routine',
        disclaimer:
          'This analysis is for informational purposes only and does not constitute medical advice. Please consult a healthcare professional for proper diagnosis and treatment.',
      };
    }
  } catch {
    // If JSON parsing fails, return a basic response
  }

  return {
    possibleConditions: [],
    recommendedActions: ['Please consult a healthcare professional for proper evaluation'],
    urgencyLevel: 'routine',
    disclaimer:
      'This analysis is for informational purposes only and does not constitute medical advice. Please consult a healthcare professional for proper diagnosis and treatment.',
  };
}

function buildClinicalSummaryPrompt(patientData: {
  demographics: { name: string; age: number; gender: string };
  chiefComplaint: string;
  vitals?: Record<string, string | number>;
  symptoms: string[];
  assessments?: string[];
}): string {
  const parts: string[] = [
    'Generate a professional clinical summary for the following patient encounter:',
    '',
    `Patient: ${patientData.demographics.name}, ${patientData.demographics.age} y/o ${patientData.demographics.gender}`,
    `Chief Complaint: ${patientData.chiefComplaint}`,
    '',
  ];

  if (patientData.vitals && Object.keys(patientData.vitals).length > 0) {
    parts.push('Vital Signs:');
    for (const [key, value] of Object.entries(patientData.vitals)) {
      parts.push(`  - ${key}: ${value}`);
    }
    parts.push('');
  }

  if (patientData.symptoms.length > 0) {
    parts.push(`Reported Symptoms: ${patientData.symptoms.join(', ')}`);
  }

  if (patientData.assessments?.length) {
    parts.push(`Clinical Assessments: ${patientData.assessments.join(', ')}`);
  }

  parts.push('');
  parts.push(
    'Please provide a concise clinical summary suitable for medical documentation, including impressions and recommended follow-up.'
  );

  return parts.join('\n');
}
