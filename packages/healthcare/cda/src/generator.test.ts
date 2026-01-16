import { describe, it, expect } from 'vitest';
import { generateCDA, validateCDA } from './generator';
import type { CCDContent, CDAPatient, CDAAuthor } from './types';

describe('C-CDA Generator', () => {
  const samplePatient: CDAPatient = {
    id: 'patient-123',
    firstName: 'John',
    lastName: 'Doe',
    dateOfBirth: new Date('1990-05-15'),
    gender: 'M',
    address: {
      street: '123 Main St',
      city: 'Boston',
      state: 'MA',
      zip: '02101',
      country: 'USA',
    },
    phone: '555-1234',
    email: 'john.doe@example.com',
  };

  const sampleAuthor: CDAAuthor = {
    id: 'dr-001',
    firstName: 'Jane',
    lastName: 'Smith',
    npi: '1234567890',
    organization: 'Xoai Healthcare',
  };

  describe('generateCDA', () => {
    it('should generate valid CCD document', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
      };

      const result = generateCDA(content);

      expect(result.documentType).toBe('CCD');
      expect(result.documentId).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.xml).toContain('<?xml version="1.0"');
      expect(result.xml).toContain('ClinicalDocument');
    });

    it('should include patient information in XML', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
      };

      const result = generateCDA(content);

      expect(result.xml).toContain('John');
      expect(result.xml).toContain('Doe');
      expect(result.xml).toContain('patient-123');
      expect(result.xml).toContain('19900515');
    });

    it('should include author information in XML', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
      };

      const result = generateCDA(content);

      expect(result.xml).toContain('Jane');
      expect(result.xml).toContain('Smith');
      expect(result.xml).toContain('1234567890');
      expect(result.xml).toContain('Xoai Healthcare');
    });

    it('should include problems section when provided', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
        problems: [
          {
            code: 'I10',
            codeSystem: '2.16.840.1.113883.6.90',
            displayName: 'Essential Hypertension',
            status: 'active',
            onsetDate: new Date('2023-01-15'),
          },
        ],
      };

      const result = generateCDA(content);

      expect(result.xml).toContain('Problem List');
      expect(result.xml).toContain('Essential Hypertension');
      expect(result.xml).toContain('I10');
    });

    it('should include medications section when provided', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
        medications: [
          {
            code: '197884',
            codeSystem: 'http://www.nlm.nih.gov/research/umls/rxnorm',
            displayName: 'Lisinopril 10mg',
            dosage: '10mg once daily',
            status: 'active',
          },
        ],
      };

      const result = generateCDA(content);

      expect(result.xml).toContain('Medications');
      expect(result.xml).toContain('Lisinopril 10mg');
    });

    it('should include allergies section when provided', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
        allergies: [
          {
            substance: 'Penicillin',
            substanceCode: '7980',
            reaction: 'Hives',
            severity: 'moderate',
            status: 'active',
          },
        ],
      };

      const result = generateCDA(content);

      expect(result.xml).toContain('Allergies');
      expect(result.xml).toContain('Penicillin');
      expect(result.xml).toContain('Hives');
    });

    it('should include vital signs section when provided', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
        vitalSigns: [
          {
            code: '8480-6',
            displayName: 'Systolic BP',
            value: 120,
            unit: 'mmHg',
            date: new Date('2024-01-15'),
          },
          {
            code: '8462-4',
            displayName: 'Diastolic BP',
            value: 80,
            unit: 'mmHg',
            date: new Date('2024-01-15'),
          },
        ],
      };

      const result = generateCDA(content);

      expect(result.xml).toContain('Vital Signs');
      expect(result.xml).toContain('Systolic BP');
      expect(result.xml).toContain('120');
      expect(result.xml).toContain('mmHg');
    });

    it('should support different document types', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
      };

      const dischargeSummary = generateCDA(content, 'DISCHARGE_SUMMARY');
      expect(dischargeSummary.documentType).toBe('DISCHARGE_SUMMARY');

      const progressNote = generateCDA(content, 'PROGRESS_NOTE');
      expect(progressNote.documentType).toBe('PROGRESS_NOTE');
    });

    it('should generate unique document IDs', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
      };

      const doc1 = generateCDA(content);
      const doc2 = generateCDA(content);

      expect(doc1.documentId).not.toBe(doc2.documentId);
    });
  });

  describe('validateCDA', () => {
    it('should validate document with required elements', () => {
      const content: CCDContent = {
        patient: samplePatient,
        author: sampleAuthor,
      };

      const doc = generateCDA(content);
      const validation = validateCDA(doc.xml);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation for missing XML declaration', () => {
      const badXml = '<ClinicalDocument><id root="123"/></ClinicalDocument>';

      const validation = validateCDA(badXml);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing XML declaration');
    });

    it('should fail validation for missing ClinicalDocument', () => {
      const badXml = '<?xml version="1.0"?><Document></Document>';

      const validation = validateCDA(badXml);

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing ClinicalDocument root element');
    });

    it('should fail validation for missing required elements', () => {
      const badXml = '<?xml version="1.0"?><ClinicalDocument></ClinicalDocument>';

      const validation = validateCDA(badXml);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
