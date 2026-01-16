import type { HL7Message, HL7Segment, HL7MessageType } from './types';

const SEGMENT_TERMINATOR = '\r';
const DEFAULT_FIELD_SEPARATOR = '|';

/**
 * Parse an HL7 message string into structured data
 */
export function parseHL7Message(rawMessage: string): HL7Message {
  const lines = rawMessage.split(SEGMENT_TERMINATOR).filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error('Empty HL7 message');
  }

  const segments: HL7Segment[] = [];
  let messageType: HL7MessageType = 'ACK';
  let version = '2.5.1';

  for (const line of lines) {
    const segment = parseSegment(line);
    segments.push(segment);

    // Extract message type from MSH segment
    if (segment.name === 'MSH') {
      const msgTypeField = segment.fields[8]; // MSH-9
      if (msgTypeField) {
        const [type, trigger] = msgTypeField.split('^');
        messageType = `${type}_${trigger}` as HL7MessageType;
      }

      const versionField = segment.fields[11]; // MSH-12
      if (versionField) {
        version = versionField;
      }
    }
  }

  return {
    type: messageType,
    version,
    segments,
    raw: rawMessage,
  };
}

/**
 * Parse a single HL7 segment
 */
function parseSegment(line: string): HL7Segment {
  const fieldSeparator = line.startsWith('MSH') ? line[3] || DEFAULT_FIELD_SEPARATOR : DEFAULT_FIELD_SEPARATOR;

  const fields = line.split(fieldSeparator);
  const name = fields[0] || '';

  return {
    name,
    fields,
  };
}

/**
 * Get a specific field from an HL7 message
 * Note: For MSH segment, field numbering starts at 1 (the separator itself),
 * so MSH-9 is at array index 8 (fieldIndex - 1)
 */
export function getField(message: HL7Message, segmentName: string, fieldIndex: number): string | undefined {
  const segment = message.segments.find((s) => s.name === segmentName);
  if (!segment) return undefined;

  // MSH segment has special field numbering - the separator is MSH-1
  // So MSH-9 is at fields[8], MSH-10 is at fields[9], etc.
  if (segmentName === 'MSH') {
    return segment.fields[fieldIndex - 1];
  }

  return segment.fields[fieldIndex];
}

/**
 * Get patient ID from message (PID-3)
 */
export function getPatientId(message: HL7Message): string | undefined {
  return getField(message, 'PID', 3);
}

/**
 * Get message control ID (MSH-10)
 */
export function getMessageControlId(message: HL7Message): string | undefined {
  return getField(message, 'MSH', 10);
}

/**
 * Validate basic HL7 message structure
 */
export function validateHL7Message(message: HL7Message): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Must have MSH segment
  const hasMSH = message.segments.some((s) => s.name === 'MSH');
  if (!hasMSH) {
    errors.push('Missing required MSH segment');
  }

  // MSH segment must be first
  if (message.segments[0]?.name !== 'MSH') {
    errors.push('MSH segment must be the first segment');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
