import type { CDADocument, CCDContent, CDADocumentType } from './types';
import { generateCCDXml } from './templates';

/**
 * Generate unique document ID
 */
function generateDocumentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate a C-CDA document
 * Ported from Asclepius/MediXAI
 */
export function generateCDA(
  content: CCDContent,
  documentType: CDADocumentType = 'CCD'
): CDADocument {
  const documentId = generateDocumentId();

  let xml: string;

  switch (documentType) {
    case 'CCD':
      xml = generateCCDXml(content, documentId);
      break;
    case 'DISCHARGE_SUMMARY':
    case 'PROGRESS_NOTE':
    case 'HISTORY_PHYSICAL':
      // For now, use CCD template for all types
      // TODO: Add specific templates for each document type
      xml = generateCCDXml(content, documentId);
      break;
    default:
      xml = generateCCDXml(content, documentId);
  }

  return {
    xml,
    documentId,
    documentType,
    createdAt: new Date(),
  };
}

/**
 * Validate C-CDA document structure
 */
export function validateCDA(xml: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Basic XML validation
  if (!xml.includes('<?xml')) {
    errors.push('Missing XML declaration');
  }

  if (!xml.includes('ClinicalDocument')) {
    errors.push('Missing ClinicalDocument root element');
  }

  // Check for required sections
  const requiredElements = [
    'templateId',
    'id',
    'effectiveTime',
    'recordTarget',
    'author',
  ];

  for (const element of requiredElements) {
    if (!xml.includes(`<${element}`)) {
      errors.push(`Missing required element: ${element}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
