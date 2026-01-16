import OpenAI from 'openai';
import type { AIResponse, AIMessage, DrugInteractionResult, MedicalAIQuery } from './types';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  organization?: string;
}

export interface MedicalAssistantConfig {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ClinicalDecisionSupport {
  recommendation: string;
  evidenceLevel: 'strong' | 'moderate' | 'weak' | 'expert-opinion';
  references?: string[];
  contraindications?: string[];
  alternatives?: string[];
}

const DEFAULT_MEDICAL_SYSTEM_PROMPT = `You are a medical AI assistant designed to support healthcare professionals.
Your role is to provide evidence-based information while always emphasizing the importance of clinical judgment.
- Always cite medical evidence levels when making recommendations
- Highlight contraindications and warnings prominently
- Never provide diagnoses, only differential considerations
- Recommend consultation with specialists when appropriate
- Maintain HIPAA-compliant communication standards`;

/**
 * Create OpenAI client for medical applications
 */
export function createOpenAIClient(config: OpenAIConfig) {
  const openai = new OpenAI({
    apiKey: config.apiKey,
    organization: config.organization,
  });
  const modelName = config.model || 'gpt-4';

  return {
    async chat(messages: AIMessage[], options?: MedicalAssistantConfig): Promise<AIResponse> {
      try {
        const systemMessage = options?.systemPrompt || DEFAULT_MEDICAL_SYSTEM_PROMPT;

        const completion = await openai.chat.completions.create({
          model: modelName,
          messages: [
            { role: 'system', content: systemMessage },
            ...messages.map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system',
              content: m.content,
            })),
          ],
          temperature: options?.temperature ?? 0.3,
          max_tokens: options?.maxTokens ?? 2048,
        });

        const choice = completion.choices[0];
        return {
          content: choice?.message?.content || '',
          usage: completion.usage
            ? {
                promptTokens: completion.usage.prompt_tokens,
                completionTokens: completion.usage.completion_tokens,
                totalTokens: completion.usage.total_tokens,
              }
            : undefined,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`OpenAI API error: ${errorMessage}`);
      }
    },

    async analyzeMedicalQuery(query: MedicalAIQuery): Promise<AIResponse> {
      const messages: AIMessage[] = [
        {
          role: 'user',
          content: buildMedicalQueryMessage(query),
        },
      ];

      return this.chat(messages, {
        systemPrompt: DEFAULT_MEDICAL_SYSTEM_PROMPT,
        temperature: 0.2,
      });
    },

    async checkDrugInteractions(drugs: string[]): Promise<DrugInteractionResult[]> {
      if (drugs.length < 2) {
        return [];
      }

      const prompt = buildDrugInteractionPrompt(drugs);

      try {
        const completion = await openai.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: `You are a clinical pharmacology AI assistant. Analyze drug interactions with precision.
Always respond in valid JSON format with the following structure:
{
  "interactions": [
    {
      "drug1": "string",
      "drug2": "string",
      "severity": "minor|moderate|major|contraindicated",
      "description": "string",
      "recommendation": "string"
    }
  ]
}`,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.1,
          max_tokens: 2048,
        });

        const content = completion.choices[0]?.message?.content || '';
        return parseDrugInteractionResponse(content, drugs);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Drug interaction check error: ${errorMessage}`);
      }
    },

    async getClinicalDecisionSupport(
      scenario: string,
      patientFactors?: {
        age?: number;
        weight?: number;
        renalFunction?: string;
        hepaticFunction?: string;
        allergies?: string[];
        comorbidities?: string[];
      }
    ): Promise<ClinicalDecisionSupport> {
      const prompt = buildCDSPrompt(scenario, patientFactors);

      try {
        const completion = await openai.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: `You are a clinical decision support AI. Provide evidence-based recommendations.
Respond in JSON format:
{
  "recommendation": "string",
  "evidenceLevel": "strong|moderate|weak|expert-opinion",
  "references": ["string"],
  "contraindications": ["string"],
  "alternatives": ["string"]
}`,
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 1500,
        });

        const content = completion.choices[0]?.message?.content || '';
        return parseCDSResponse(content);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Clinical decision support error: ${errorMessage}`);
      }
    },

    async generateSOAPNote(encounter: {
      subjective: string;
      objective: {
        vitals?: Record<string, string | number>;
        physicalExam?: string;
        labResults?: Record<string, string | number>;
      };
      assessment?: string;
      plan?: string;
    }): Promise<AIResponse> {
      const prompt = buildSOAPPrompt(encounter);

      return this.chat(
        [{ role: 'user', content: prompt }],
        {
          systemPrompt:
            'You are a medical documentation assistant. Generate professional, concise SOAP notes following standard medical documentation practices.',
          temperature: 0.3,
        }
      );
    },
  };
}

function buildMedicalQueryMessage(query: MedicalAIQuery): string {
  const parts: string[] = [];

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

  parts.push(`Question: ${query.query}`);

  return parts.join('\n\n');
}

function buildDrugInteractionPrompt(drugs: string[]): string {
  return `Analyze potential drug interactions between the following medications:

Medications: ${drugs.join(', ')}

For each pair of drugs that may interact, provide:
1. The severity level (minor, moderate, major, or contraindicated)
2. A clinical description of the interaction mechanism
3. A recommendation for management

Only include interactions that are clinically significant. If two drugs have no known interaction, do not include them.`;
}

function parseDrugInteractionResponse(
  content: string,
  drugs: string[]
): DrugInteractionResult[] {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.interactions && Array.isArray(parsed.interactions)) {
        return parsed.interactions.map(
          (i: Record<string, string>): DrugInteractionResult => ({
            drug1: i.drug1 || drugs[0] || '',
            drug2: i.drug2 || drugs[1] || '',
            severity: (i.severity as DrugInteractionResult['severity']) || 'minor',
            description: i.description || 'No description available',
            recommendation: i.recommendation || 'Consult pharmacist',
          })
        );
      }
    }
  } catch {
    // Return empty array on parse failure
  }

  return [];
}

function buildCDSPrompt(
  scenario: string,
  patientFactors?: {
    age?: number;
    weight?: number;
    renalFunction?: string;
    hepaticFunction?: string;
    allergies?: string[];
    comorbidities?: string[];
  }
): string {
  const parts: string[] = [`Clinical Scenario: ${scenario}`, ''];

  if (patientFactors) {
    parts.push('Patient Factors:');
    if (patientFactors.age) parts.push(`- Age: ${patientFactors.age} years`);
    if (patientFactors.weight) parts.push(`- Weight: ${patientFactors.weight} kg`);
    if (patientFactors.renalFunction) parts.push(`- Renal Function: ${patientFactors.renalFunction}`);
    if (patientFactors.hepaticFunction) parts.push(`- Hepatic Function: ${patientFactors.hepaticFunction}`);
    if (patientFactors.allergies?.length) {
      parts.push(`- Allergies: ${patientFactors.allergies.join(', ')}`);
    }
    if (patientFactors.comorbidities?.length) {
      parts.push(`- Comorbidities: ${patientFactors.comorbidities.join(', ')}`);
    }
    parts.push('');
  }

  parts.push(
    'Please provide an evidence-based clinical recommendation, including the level of evidence, any contraindications, and alternative approaches if applicable.'
  );

  return parts.join('\n');
}

function parseCDSResponse(content: string): ClinicalDecisionSupport {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        recommendation: parsed.recommendation || 'Unable to generate recommendation',
        evidenceLevel: parsed.evidenceLevel || 'expert-opinion',
        references: parsed.references || [],
        contraindications: parsed.contraindications || [],
        alternatives: parsed.alternatives || [],
      };
    }
  } catch {
    // Return default on parse failure
  }

  return {
    recommendation: 'Unable to parse clinical decision support response',
    evidenceLevel: 'expert-opinion',
    references: [],
    contraindications: [],
    alternatives: [],
  };
}

function buildSOAPPrompt(encounter: {
  subjective: string;
  objective: {
    vitals?: Record<string, string | number>;
    physicalExam?: string;
    labResults?: Record<string, string | number>;
  };
  assessment?: string;
  plan?: string;
}): string {
  const parts: string[] = ['Generate a professional SOAP note based on the following information:', ''];

  parts.push(`SUBJECTIVE:\n${encounter.subjective}`);
  parts.push('');

  parts.push('OBJECTIVE:');
  if (encounter.objective.vitals) {
    parts.push('Vitals:');
    for (const [key, value] of Object.entries(encounter.objective.vitals)) {
      parts.push(`  ${key}: ${value}`);
    }
  }
  if (encounter.objective.physicalExam) {
    parts.push(`Physical Exam: ${encounter.objective.physicalExam}`);
  }
  if (encounter.objective.labResults) {
    parts.push('Lab Results:');
    for (const [key, value] of Object.entries(encounter.objective.labResults)) {
      parts.push(`  ${key}: ${value}`);
    }
  }
  parts.push('');

  if (encounter.assessment) {
    parts.push(`ASSESSMENT (draft):\n${encounter.assessment}`);
    parts.push('');
  }

  if (encounter.plan) {
    parts.push(`PLAN (draft):\n${encounter.plan}`);
  }

  parts.push('');
  parts.push(
    'Please refine and complete this SOAP note with appropriate medical terminology and formatting.'
  );

  return parts.join('\n');
}
