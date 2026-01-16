import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGeminiClient, type SymptomAnalysisResult } from './gemini';

// Mock the Google Generative AI module
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn().mockReturnValue({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'Mock AI response for testing',
        },
      }),
    }),
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: {
    BLOCK_MEDIUM_AND_ABOVE: 'BLOCK_MEDIUM_AND_ABOVE',
    BLOCK_ONLY_HIGH: 'BLOCK_ONLY_HIGH',
  },
}));

describe('Gemini AI Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createGeminiClient', () => {
    it('should create client with config', () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
        model: 'gemini-pro',
      });

      expect(client).toBeDefined();
      expect(client.generateResponse).toBeInstanceOf(Function);
      expect(client.analyzeMedicalQuery).toBeInstanceOf(Function);
      expect(client.analyzeSymptoms).toBeInstanceOf(Function);
      expect(client.generateClinicalSummary).toBeInstanceOf(Function);
    });

    it('should use default model when not specified', () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
      });

      expect(client).toBeDefined();
    });
  });

  describe('generateResponse', () => {
    it('should return response object', async () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
      });

      const response = await client.generateResponse('Test prompt');

      expect(response).toBeDefined();
      expect(response.content).toBe('Mock AI response for testing');
      expect(typeof response.content).toBe('string');
    });

    it('should include usage in response', async () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
      });

      const response = await client.generateResponse('Test prompt');

      expect(response.usage).toBeDefined();
    });
  });

  describe('analyzeMedicalQuery', () => {
    it('should handle query with symptoms', async () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
      });

      const response = await client.analyzeMedicalQuery({
        symptoms: ['fever', 'cough', 'fatigue'],
        query: 'What could be causing these symptoms?',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should handle query with patient context', async () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
      });

      const response = await client.analyzeMedicalQuery({
        patientContext: '65 year old male with history of hypertension',
        medications: ['Lisinopril', 'Metformin'],
        allergies: ['Penicillin'],
        query: 'Is this medication safe?',
      });

      expect(response).toBeDefined();
    });

    it('should handle minimal query', async () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
      });

      const response = await client.analyzeMedicalQuery({
        query: 'What is hypertension?',
      });

      expect(response).toBeDefined();
    });
  });

  describe('analyzeSymptoms', () => {
    it('should return symptom analysis result', async () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
      });

      const result = await client.analyzeSymptoms(['fever', 'headache', 'fatigue']);

      expect(result).toBeDefined();
      expect(result.disclaimer).toBeDefined();
      expect(result.possibleConditions).toBeDefined();
      expect(result.recommendedActions).toBeDefined();
      expect(result.urgencyLevel).toBeDefined();
    });

    it('should accept patient context', async () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
      });

      const result = await client.analyzeSymptoms(['chest pain', 'shortness of breath'], {
        age: 55,
        gender: 'male',
        medicalHistory: ['hypertension', 'diabetes'],
        currentMedications: ['Metformin', 'Lisinopril'],
      });

      expect(result).toBeDefined();
      expect(result.disclaimer).toContain('informational purposes only');
    });
  });

  describe('generateClinicalSummary', () => {
    it('should generate clinical summary', async () => {
      const client = createGeminiClient({
        apiKey: 'test-api-key',
      });

      const response = await client.generateClinicalSummary({
        demographics: { name: 'John Doe', age: 45, gender: 'Male' },
        chiefComplaint: 'Persistent headache for 3 days',
        vitals: { BP: '130/85', HR: 72, Temp: '98.6F' },
        symptoms: ['headache', 'mild nausea'],
        assessments: ['Tension-type headache'],
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });
});
