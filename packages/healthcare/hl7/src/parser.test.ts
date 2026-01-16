import { describe, it, expect } from 'vitest';
import {
  parseHL7Message,
  getField,
  getPatientId,
  getMessageControlId,
  validateHL7Message,
} from './parser';

describe('HL7 Parser', () => {
  const sampleADT = [
    'MSH|^~\\&|XOAI|FACILITY|RECV|RECV_FAC|20240115103000||ADT^A04|MSG123|P|2.5.1',
    'EVN|A04|20240115103000',
    'PID|1||P12345|||Doe^John||19900515|M',
    'PV1|1|O',
  ].join('\r') + '\r';

  describe('parseHL7Message', () => {
    it('should parse valid HL7 message', () => {
      const result = parseHL7Message(sampleADT);

      expect(result.type).toBe('ADT_A04');
      expect(result.version).toBe('2.5.1');
      expect(result.segments.length).toBe(4);
      expect(result.raw).toBe(sampleADT);
    });

    it('should identify all segments', () => {
      const result = parseHL7Message(sampleADT);

      const segmentNames = result.segments.map((s) => s.name);
      expect(segmentNames).toContain('MSH');
      expect(segmentNames).toContain('EVN');
      expect(segmentNames).toContain('PID');
      expect(segmentNames).toContain('PV1');
    });

    it('should throw error for empty message', () => {
      expect(() => parseHL7Message('')).toThrow('Empty HL7 message');
    });

    it('should parse segment fields correctly', () => {
      const result = parseHL7Message(sampleADT);
      const pidSegment = result.segments.find((s) => s.name === 'PID');

      expect(pidSegment).toBeDefined();
      expect(pidSegment?.fields[0]).toBe('PID');
      expect(pidSegment?.fields[1]).toBe('1');
    });
  });

  describe('getField', () => {
    it('should get specific field from message', () => {
      const message = parseHL7Message(sampleADT);

      const mshField = getField(message, 'MSH', 9);
      expect(mshField).toBe('ADT^A04');
    });

    it('should return undefined for non-existent segment', () => {
      const message = parseHL7Message(sampleADT);

      const result = getField(message, 'OBX', 1);
      expect(result).toBeUndefined();
    });

    it('should return undefined for non-existent field', () => {
      const message = parseHL7Message(sampleADT);

      const result = getField(message, 'PID', 100);
      expect(result).toBeUndefined();
    });
  });

  describe('getPatientId', () => {
    it('should extract patient ID from PID-3', () => {
      const message = parseHL7Message(sampleADT);

      const patientId = getPatientId(message);
      expect(patientId).toBe('P12345');
    });

    it('should return undefined if no PID segment', () => {
      const messageWithoutPID = 'MSH|^~\\&|XOAI|FAC|RECV|RECV_FAC|20240115||ACK^A01|MSG456|P|2.5.1\rMSA|AA|MSG123\r';
      const message = parseHL7Message(messageWithoutPID);

      const patientId = getPatientId(message);
      expect(patientId).toBeUndefined();
    });
  });

  describe('getMessageControlId', () => {
    it('should extract message control ID from MSH-10', () => {
      const message = parseHL7Message(sampleADT);

      const controlId = getMessageControlId(message);
      expect(controlId).toBe('MSG123');
    });
  });

  describe('validateHL7Message', () => {
    it('should validate message with MSH segment', () => {
      const message = parseHL7Message(sampleADT);

      const validation = validateHL7Message(message);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should fail validation without MSH segment', () => {
      const badMessage = {
        type: 'ADT_A04' as const,
        version: '2.5.1',
        segments: [{ name: 'PID', fields: ['PID', '1'] }],
        raw: 'PID|1\r',
      };

      const validation = validateHL7Message(badMessage);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required MSH segment');
      expect(validation.errors).toContain('MSH segment must be the first segment');
    });

    it('should fail if MSH is not first segment', () => {
      const badMessage = {
        type: 'ADT_A04' as const,
        version: '2.5.1',
        segments: [
          { name: 'PID', fields: ['PID', '1'] },
          { name: 'MSH', fields: ['MSH', '^~\\&'] },
        ],
        raw: 'PID|1\rMSH|^~\\&\r',
      };

      const validation = validateHL7Message(badMessage);
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('MSH segment must be the first segment');
    });
  });
});
