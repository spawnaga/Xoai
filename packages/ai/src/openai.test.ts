import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createOpenAIClient } from './openai';

// Mock the OpenAI module
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'Mock OpenAI response for testing',
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      },
    },
  })),
}));

describe('OpenAI Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOpenAIClient', () => {
    it('should create client with config', () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
        model: 'gpt-4',
      });

      expect(client).toBeDefined();
      expect(client.chat).toBeInstanceOf(Function);
      expect(client.checkDrugInteractions).toBeInstanceOf(Function);
      expect(client.analyzeMedicalQuery).toBeInstanceOf(Function);
      expect(client.getClinicalDecisionSupport).toBeInstanceOf(Function);
      expect(client.generateSOAPNote).toBeInstanceOf(Function);
    });

    it('should use default model when not specified', () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      expect(client).toBeDefined();
    });

    it('should accept organization parameter', () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
        organization: 'org-123',
      });

      expect(client).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should return response for single message', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const response = await client.chat([{ role: 'user', content: 'Hello' }]);

      expect(response).toBeDefined();
      expect(response.content).toBe('Mock OpenAI response for testing');
    });

    it('should include usage in response', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const response = await client.chat([{ role: 'user', content: 'Hello' }]);

      expect(response.usage).toBeDefined();
      expect(response.usage?.totalTokens).toBe(30);
    });

    it('should accept custom options', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const response = await client.chat([{ role: 'user', content: 'Hello' }], {
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.5,
        maxTokens: 1000,
      });

      expect(response).toBeDefined();
    });
  });

  describe('analyzeMedicalQuery', () => {
    it('should analyze medical queries', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const response = await client.analyzeMedicalQuery({
        symptoms: ['fever', 'headache'],
        query: 'What could be causing these symptoms?',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });
  });

  describe('checkDrugInteractions', () => {
    it('should return empty array for single drug', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const results = await client.checkDrugInteractions(['Aspirin']);

      expect(results).toHaveLength(0);
    });

    it('should return empty array for empty drug list', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const results = await client.checkDrugInteractions([]);

      expect(results).toHaveLength(0);
    });

    it('should return array for multiple drugs', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const results = await client.checkDrugInteractions(['Lisinopril', 'Metformin', 'Aspirin']);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getClinicalDecisionSupport', () => {
    it('should return clinical decision support', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const result = await client.getClinicalDecisionSupport(
        'Patient with Type 2 diabetes and eGFR of 45'
      );

      expect(result).toBeDefined();
      expect(result.recommendation).toBeDefined();
      expect(result.evidenceLevel).toBeDefined();
    });

    it('should accept patient factors', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const result = await client.getClinicalDecisionSupport(
        'Treatment for hypertension',
        {
          age: 65,
          weight: 80,
          renalFunction: 'eGFR 60',
          allergies: ['ACE inhibitors'],
          comorbidities: ['diabetes', 'heart failure'],
        }
      );

      expect(result).toBeDefined();
    });
  });

  describe('generateSOAPNote', () => {
    it('should generate SOAP note', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const response = await client.generateSOAPNote({
        subjective: 'Patient complains of persistent cough for 1 week',
        objective: {
          vitals: { BP: '120/80', HR: 72, Temp: '98.6F' },
          physicalExam: 'Lungs clear to auscultation',
        },
        assessment: 'Viral upper respiratory infection',
        plan: 'Rest, fluids, symptomatic treatment',
      });

      expect(response).toBeDefined();
      expect(response.content).toBeDefined();
    });

    it('should handle minimal encounter data', async () => {
      const client = createOpenAIClient({
        apiKey: 'test-api-key',
      });

      const response = await client.generateSOAPNote({
        subjective: 'Follow-up visit for diabetes',
        objective: {},
      });

      expect(response).toBeDefined();
    });
  });
});
