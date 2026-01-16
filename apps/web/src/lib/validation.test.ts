import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  passwordSchema,
  usernameSchema,
  registerSchema,
  patientSearchSchema,
  patientSchema,
  dateRangeSchema,
  paginationSchema,
  mrnSchema,
  validateInput,
} from './validation';

describe('Validation Schemas', () => {
  describe('loginSchema', () => {
    it('should accept valid login credentials', () => {
      const result = loginSchema.safeParse({
        username: 'testuser',
        password: 'password123',
      });

      expect(result.success).toBe(true);
    });

    it('should reject empty username', () => {
      const result = loginSchema.safeParse({
        username: '',
        password: 'password123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.username).toBeDefined();
      }
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({
        username: 'testuser',
        password: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.password).toBeDefined();
      }
    });
  });

  describe('passwordSchema (HIPAA compliant)', () => {
    it('should accept valid HIPAA-compliant password', () => {
      const result = passwordSchema.safeParse('SecureP@ss123');
      expect(result.success).toBe(true);
    });

    it('should reject password shorter than 8 characters', () => {
      const result = passwordSchema.safeParse('Abc@12');
      expect(result.success).toBe(false);
    });

    it('should reject password without uppercase letter', () => {
      const result = passwordSchema.safeParse('securep@ss123');
      expect(result.success).toBe(false);
    });

    it('should reject password without lowercase letter', () => {
      const result = passwordSchema.safeParse('SECUREP@SS123');
      expect(result.success).toBe(false);
    });

    it('should reject password without number', () => {
      const result = passwordSchema.safeParse('SecureP@ssword');
      expect(result.success).toBe(false);
    });

    it('should reject password without special character', () => {
      const result = passwordSchema.safeParse('SecurePass123');
      expect(result.success).toBe(false);
    });

    it('should accept various special characters', () => {
      const passwords = [
        'SecureP@ss123',
        'SecureP!ss123',
        'SecureP#ss123',
        'SecureP$ss123',
        'SecureP%ss123',
        'SecureP^ss123',
        'SecureP&ss123',
        'SecureP*ss123',
      ];

      for (const password of passwords) {
        const result = passwordSchema.safeParse(password);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('usernameSchema', () => {
    it('should accept valid username', () => {
      const result = usernameSchema.safeParse('john_doe123');
      expect(result.success).toBe(true);
    });

    it('should reject username shorter than 3 characters', () => {
      const result = usernameSchema.safeParse('ab');
      expect(result.success).toBe(false);
    });

    it('should reject username longer than 30 characters', () => {
      const result = usernameSchema.safeParse('a'.repeat(31));
      expect(result.success).toBe(false);
    });

    it('should reject username with special characters', () => {
      const result = usernameSchema.safeParse('john@doe');
      expect(result.success).toBe(false);
    });

    it('should reject username with spaces', () => {
      const result = usernameSchema.safeParse('john doe');
      expect(result.success).toBe(false);
    });

    it('should accept username with underscores', () => {
      const result = usernameSchema.safeParse('john_doe_123');
      expect(result.success).toBe(true);
    });
  });

  describe('registerSchema', () => {
    const validData = {
      username: 'newuser',
      password: 'SecureP@ss123',
      confirmPassword: 'SecureP@ss123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
    };

    it('should accept valid registration data', () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept registration without optional fields', () => {
      const result = registerSchema.safeParse({
        username: 'newuser',
        password: 'SecureP@ss123',
        confirmPassword: 'SecureP@ss123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject when passwords do not match', () => {
      const result = registerSchema.safeParse({
        ...validData,
        confirmPassword: 'DifferentP@ss123',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
      }
    });

    it('should reject invalid email format', () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: 'invalid-email',
      });

      expect(result.success).toBe(false);
    });

    it('should accept empty string for email', () => {
      const result = registerSchema.safeParse({
        ...validData,
        email: '',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('patientSearchSchema', () => {
    it('should accept valid search query', () => {
      const result = patientSearchSchema.safeParse({
        query: 'John Doe',
        limit: 20,
      });
      expect(result.success).toBe(true);
    });

    it('should reject search query shorter than 2 characters', () => {
      const result = patientSearchSchema.safeParse({
        query: 'a',
      });
      expect(result.success).toBe(false);
    });

    it('should use default limit', () => {
      const result = patientSearchSchema.safeParse({
        query: 'John',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(20);
      }
    });

    it('should reject limit over 100', () => {
      const result = patientSearchSchema.safeParse({
        query: 'John',
        limit: 101,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('patientSchema', () => {
    const validPatient = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: new Date('1990-01-15'),
      gender: 'male' as const,
    };

    it('should accept valid patient data', () => {
      const result = patientSchema.safeParse(validPatient);
      expect(result.success).toBe(true);
    });

    it('should accept patient with all optional fields', () => {
      const result = patientSchema.safeParse({
        ...validPatient,
        email: 'john@example.com',
        phone: '555-0100',
        address: '123 Main St',
        city: 'Springfield',
        state: 'IL',
        zipCode: '62701',
        insuranceProvider: 'Blue Cross',
        insurancePolicyNumber: 'BC123456',
      });
      expect(result.success).toBe(true);
    });

    it('should reject patient without first name', () => {
      const result = patientSchema.safeParse({
        ...validPatient,
        firstName: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid gender', () => {
      const result = patientSchema.safeParse({
        ...validPatient,
        gender: 'invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should accept all valid gender values', () => {
      const genders = ['male', 'female', 'other', 'unknown'] as const;

      for (const gender of genders) {
        const result = patientSchema.safeParse({
          ...validPatient,
          gender,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('dateRangeSchema', () => {
    it('should accept valid date range', () => {
      const result = dateRangeSchema.safeParse({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      });
      expect(result.success).toBe(true);
    });

    it('should accept same start and end date', () => {
      const date = new Date('2024-06-15');
      const result = dateRangeSchema.safeParse({
        startDate: date,
        endDate: date,
      });
      expect(result.success).toBe(true);
    });

    it('should reject end date before start date', () => {
      const result = dateRangeSchema.safeParse({
        startDate: new Date('2024-12-31'),
        endDate: new Date('2024-01-01'),
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.flatten().fieldErrors.endDate).toBeDefined();
      }
    });
  });

  describe('paginationSchema', () => {
    it('should use default values', () => {
      const result = paginationSchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
        expect(result.data.sortOrder).toBe('desc');
      }
    });

    it('should accept valid pagination', () => {
      const result = paginationSchema.safeParse({
        page: 5,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(5);
        expect(result.data.limit).toBe(50);
        expect(result.data.sortBy).toBe('createdAt');
        expect(result.data.sortOrder).toBe('asc');
      }
    });

    it('should reject page less than 1', () => {
      const result = paginationSchema.safeParse({
        page: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({
        limit: 101,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid sort order', () => {
      const result = paginationSchema.safeParse({
        sortOrder: 'random',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('mrnSchema', () => {
    it('should accept valid MRN format', () => {
      const validMRNs = [
        'MRN-12345',
        'MRN-ABC123',
        'MRN-1234567890',
        'MRN-A1B2C3',
        'mrn-12345', // Case-insensitive
        'Mrn-ABC123', // Mixed case
      ];

      for (const mrn of validMRNs) {
        const result = mrnSchema.safeParse(mrn);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid MRN format', () => {
      const invalidMRNs = [
        '12345',       // Missing MRN- prefix
        'MRN12345',    // Missing hyphen after MRN
        'PAT-12345',   // Wrong prefix
        '',            // Empty string
        'MRN-',        // Missing ID after hyphen
      ];

      for (const mrn of invalidMRNs) {
        const result = mrnSchema.safeParse(mrn);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('validateInput utility', () => {
    it('should return success with data for valid input', () => {
      const result = validateInput(loginSchema, {
        username: 'test',
        password: 'pass',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('test');
        expect(result.data.password).toBe('pass');
      }
    });

    it('should return errors for invalid input', () => {
      const result = validateInput(loginSchema, {
        username: '',
        password: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.username).toBeDefined();
        expect(result.errors.password).toBeDefined();
      }
    });
  });

  describe('HIPAA password policy edge cases', () => {
    it('should accept exactly 8 character password', () => {
      const result = passwordSchema.safeParse('Abcd@123');
      expect(result.success).toBe(true);
    });

    it('should accept very long password', () => {
      const result = passwordSchema.safeParse('A'.repeat(50) + 'a@1');
      expect(result.success).toBe(true);
    });

    it('should handle unicode characters', () => {
      // Unicode should work as long as requirements are met
      const result = passwordSchema.safeParse('Pässwörd@123');
      expect(result.success).toBe(true);
    });
  });
});
