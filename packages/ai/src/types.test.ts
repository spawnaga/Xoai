import { describe, it, expect } from 'vitest';
import type {
  AIConfig,
  AIMessage,
  AIResponse,
  MedicalAIQuery,
  DrugInteractionResult,
  PatientContext,
  ClinicalEncounter,
} from './types';
import {
  AIMessageSchema,
  MedicalAIQuerySchema,
  DrugInteractionResultSchema,
  PatientContextSchema,
  ClinicalEncounterSchema,
  validateMedicalQuery,
  validatePatientContext,
  validateClinicalEncounter,
} from './types';

describe('AI Types', () => {
  describe('AIConfig', () => {
    it('should have correct structure', () => {
      const config: AIConfig = {
        provider: 'gemini',
        apiKey: 'test-key',
        model: 'gemini-pro',
      };

      expect(config.provider).toBe('gemini');
      expect(config.apiKey).toBe('test-key');
      expect(config.model).toBe('gemini-pro');
    });

    it('should support openai provider', () => {
      const config: AIConfig = {
        provider: 'openai',
        apiKey: 'test-key',
      };

      expect(config.provider).toBe('openai');
    });
  });

  describe('AIMessage', () => {
    it('should support user role', () => {
      const message: AIMessage = {
        role: 'user',
        content: 'Hello',
      };

      expect(message.role).toBe('user');
    });

    it('should support assistant role', () => {
      const message: AIMessage = {
        role: 'assistant',
        content: 'Hi there!',
      };

      expect(message.role).toBe('assistant');
    });

    it('should support system role', () => {
      const message: AIMessage = {
        role: 'system',
        content: 'You are a helpful assistant.',
      };

      expect(message.role).toBe('system');
    });
  });

  describe('AIResponse', () => {
    it('should have content', () => {
      const response: AIResponse = {
        content: 'Response text',
      };

      expect(response.content).toBe('Response text');
    });

    it('should optionally include usage', () => {
      const response: AIResponse = {
        content: 'Response text',
        usage: {
          promptTokens: 10,
          completionTokens: 20,
          totalTokens: 30,
        },
      };

      expect(response.usage?.totalTokens).toBe(30);
    });
  });

  describe('MedicalAIQuery', () => {
    it('should require query field', () => {
      const query: MedicalAIQuery = {
        query: 'What is diabetes?',
      };

      expect(query.query).toBeDefined();
    });

    it('should support all optional fields', () => {
      const query: MedicalAIQuery = {
        patientContext: '45 year old female',
        symptoms: ['fatigue', 'thirst'],
        medications: ['Metformin'],
        allergies: ['Penicillin'],
        query: 'What could be causing these symptoms?',
      };

      expect(query.symptoms).toContain('fatigue');
      expect(query.medications).toContain('Metformin');
      expect(query.allergies).toContain('Penicillin');
    });
  });

  describe('DrugInteractionResult', () => {
    it('should have correct structure', () => {
      const result: DrugInteractionResult = {
        drug1: 'Lisinopril',
        drug2: 'Potassium',
        severity: 'major',
        description: 'May increase potassium levels',
        recommendation: 'Monitor potassium levels closely',
      };

      expect(result.drug1).toBe('Lisinopril');
      expect(result.drug2).toBe('Potassium');
      expect(result.severity).toBe('major');
    });

    it('should support all severity levels', () => {
      const severities: DrugInteractionResult['severity'][] = [
        'minor',
        'moderate',
        'major',
        'contraindicated',
      ];

      for (const severity of severities) {
        const result: DrugInteractionResult = {
          drug1: 'A',
          drug2: 'B',
          severity,
          description: 'Test',
          recommendation: 'Test',
        };
        expect(result.severity).toBe(severity);
      }
    });
  });

  describe('PatientContext', () => {
    it('should support all optional fields', () => {
      const context: PatientContext = {
        age: 45,
        gender: 'female',
        medicalHistory: ['hypertension', 'diabetes'],
        currentMedications: ['Metformin', 'Lisinopril'],
        allergies: ['Penicillin'],
        comorbidities: ['obesity'],
      };

      expect(context.age).toBe(45);
      expect(context.medicalHistory).toContain('hypertension');
    });
  });

  describe('ClinicalEncounter', () => {
    it('should have correct structure', () => {
      const encounter: ClinicalEncounter = {
        subjective: 'Patient reports chest pain',
        objective: {
          vitals: { BP: '140/90', HR: 88 },
          physicalExam: 'Unremarkable',
        },
        assessment: 'Possible angina',
        plan: 'Order cardiac workup',
      };

      expect(encounter.subjective).toBeDefined();
      expect(encounter.objective.vitals?.BP).toBe('140/90');
    });
  });
});

describe('Zod Validation Schemas', () => {
  describe('AIMessageSchema', () => {
    it('should validate correct message', () => {
      const result = AIMessageSchema.safeParse({
        role: 'user',
        content: 'Hello',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid role', () => {
      const result = AIMessageSchema.safeParse({
        role: 'invalid',
        content: 'Hello',
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const result = AIMessageSchema.safeParse({
        role: 'user',
        content: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('MedicalAIQuerySchema', () => {
    it('should validate minimal query', () => {
      const result = MedicalAIQuerySchema.safeParse({
        query: 'What is diabetes?',
      });

      expect(result.success).toBe(true);
    });

    it('should validate full query', () => {
      const result = MedicalAIQuerySchema.safeParse({
        patientContext: '45 year old',
        symptoms: ['fever'],
        medications: ['Aspirin'],
        allergies: ['Penicillin'],
        query: 'What should I do?',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty query', () => {
      const result = MedicalAIQuerySchema.safeParse({
        query: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('DrugInteractionResultSchema', () => {
    it('should validate correct result', () => {
      const result = DrugInteractionResultSchema.safeParse({
        drug1: 'Aspirin',
        drug2: 'Warfarin',
        severity: 'major',
        description: 'Increased bleeding risk',
        recommendation: 'Avoid combination',
      });

      expect(result.success).toBe(true);
    });

    it('should reject invalid severity', () => {
      const result = DrugInteractionResultSchema.safeParse({
        drug1: 'A',
        drug2: 'B',
        severity: 'invalid',
        description: 'Test',
        recommendation: 'Test',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('PatientContextSchema', () => {
    it('should validate patient context', () => {
      const result = PatientContextSchema.safeParse({
        age: 45,
        gender: 'male',
        allergies: ['Penicillin'],
      });

      expect(result.success).toBe(true);
    });

    it('should reject negative age', () => {
      const result = PatientContextSchema.safeParse({
        age: -5,
      });

      expect(result.success).toBe(false);
    });
  });

  describe('ClinicalEncounterSchema', () => {
    it('should validate encounter', () => {
      const result = ClinicalEncounterSchema.safeParse({
        subjective: 'Patient reports pain',
        objective: {
          vitals: { BP: '120/80' },
        },
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty subjective', () => {
      const result = ClinicalEncounterSchema.safeParse({
        subjective: '',
        objective: {},
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Validation Functions', () => {
    it('validateMedicalQuery should return parsed query', () => {
      const query = validateMedicalQuery({
        query: 'Test query',
        symptoms: ['fever'],
      });

      expect(query.query).toBe('Test query');
      expect(query.symptoms).toContain('fever');
    });

    it('validatePatientContext should return parsed context', () => {
      const context = validatePatientContext({
        age: 30,
        gender: 'female',
      });

      expect(context.age).toBe(30);
    });

    it('validateClinicalEncounter should return parsed encounter', () => {
      const encounter = validateClinicalEncounter({
        subjective: 'Chief complaint',
        objective: { vitals: { HR: 72 } },
      });

      expect(encounter.subjective).toBe('Chief complaint');
    });

    it('validateMedicalQuery should throw on invalid input', () => {
      expect(() => validateMedicalQuery({ query: '' })).toThrow();
    });
  });
});
