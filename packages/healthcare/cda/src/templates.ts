import type { CCDContent, CDAProblem, CDAMedication, CDAAllergy, CDAVitalSign } from './types';

/**
 * Format date for C-CDA (YYYYMMDD or YYYYMMDDHHmmss)
 * Uses UTC to avoid timezone inconsistencies
 */
function formatCDADate(date: Date, includeTime = false): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');

  if (!includeTime) {
    return `${year}${month}${day}`;
  }

  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate Problems Section
 */
function generateProblemsSection(problems: CDAProblem[]): string {
  if (problems.length === 0) {
    return `
    <component>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.5.1"/>
        <code code="11450-4" codeSystem="2.16.840.1.113883.6.1" displayName="Problem List"/>
        <title>Problems</title>
        <text>No known problems</text>
      </section>
    </component>`;
  }

  const entries = problems.map(
    (p) => `
        <entry>
          <act classCode="ACT" moodCode="EVN">
            <templateId root="2.16.840.1.113883.10.20.22.4.3"/>
            <code code="CONC" codeSystem="2.16.840.1.113883.5.6"/>
            <statusCode code="${p.status}"/>
            <entryRelationship typeCode="SUBJ">
              <observation classCode="OBS" moodCode="EVN">
                <code code="${escapeXml(p.code)}" codeSystem="${p.codeSystem}" displayName="${escapeXml(p.displayName)}"/>
                ${p.onsetDate ? `<effectiveTime><low value="${formatCDADate(p.onsetDate)}"/></effectiveTime>` : ''}
              </observation>
            </entryRelationship>
          </act>
        </entry>`
  );

  return `
    <component>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.5.1"/>
        <code code="11450-4" codeSystem="2.16.840.1.113883.6.1" displayName="Problem List"/>
        <title>Problems</title>
        <text>
          <list>
            ${problems.map((p) => `<item>${escapeXml(p.displayName)} - ${p.status}</item>`).join('\n            ')}
          </list>
        </text>
        ${entries.join('')}
      </section>
    </component>`;
}

/**
 * Generate Medications Section
 */
function generateMedicationsSection(medications: CDAMedication[]): string {
  if (medications.length === 0) {
    return `
    <component>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.1.1"/>
        <code code="10160-0" codeSystem="2.16.840.1.113883.6.1" displayName="Medications"/>
        <title>Medications</title>
        <text>No known medications</text>
      </section>
    </component>`;
  }

  return `
    <component>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.1.1"/>
        <code code="10160-0" codeSystem="2.16.840.1.113883.6.1" displayName="Medications"/>
        <title>Medications</title>
        <text>
          <list>
            ${medications.map((m) => `<item>${escapeXml(m.displayName)}${m.dosage ? ` - ${escapeXml(m.dosage)}` : ''}</item>`).join('\n            ')}
          </list>
        </text>
      </section>
    </component>`;
}

/**
 * Generate Allergies Section
 */
function generateAllergiesSection(allergies: CDAAllergy[]): string {
  if (allergies.length === 0) {
    return `
    <component>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.6.1"/>
        <code code="48765-2" codeSystem="2.16.840.1.113883.6.1" displayName="Allergies"/>
        <title>Allergies and Adverse Reactions</title>
        <text>No known allergies</text>
      </section>
    </component>`;
  }

  return `
    <component>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.6.1"/>
        <code code="48765-2" codeSystem="2.16.840.1.113883.6.1" displayName="Allergies"/>
        <title>Allergies and Adverse Reactions</title>
        <text>
          <list>
            ${allergies.map((a) => `<item>${escapeXml(a.substance)}${a.reaction ? ` - ${escapeXml(a.reaction)}` : ''}</item>`).join('\n            ')}
          </list>
        </text>
      </section>
    </component>`;
}

/**
 * Generate Vital Signs Section
 */
function generateVitalSignsSection(vitalSigns: CDAVitalSign[]): string {
  if (vitalSigns.length === 0) {
    return '';
  }

  return `
    <component>
      <section>
        <templateId root="2.16.840.1.113883.10.20.22.2.4.1"/>
        <code code="8716-3" codeSystem="2.16.840.1.113883.6.1" displayName="Vital Signs"/>
        <title>Vital Signs</title>
        <text>
          <list>
            ${vitalSigns.map((v) => `<item>${escapeXml(v.displayName)}: ${v.value} ${v.unit}</item>`).join('\n            ')}
          </list>
        </text>
      </section>
    </component>`;
}

/**
 * Generate full CCD XML document
 * Ported from Asclepius/MediXAI
 */
export function generateCCDXml(content: CCDContent, documentId: string): string {
  const now = new Date();
  const { patient, author } = content;

  return `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <realmCode code="US"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.2"/>
  <id root="2.16.840.1.113883.19" extension="${documentId}"/>
  <code code="34133-9" codeSystem="2.16.840.1.113883.6.1" displayName="Summarization of Episode Note"/>
  <title>Continuity of Care Document</title>
  <effectiveTime value="${formatCDADate(now, true)}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="en-US"/>

  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.19" extension="${patient.id}"/>
      ${
        patient.address
          ? `<addr>
        ${patient.address.street ? `<streetAddressLine>${escapeXml(patient.address.street)}</streetAddressLine>` : ''}
        ${patient.address.city ? `<city>${escapeXml(patient.address.city)}</city>` : ''}
        ${patient.address.state ? `<state>${escapeXml(patient.address.state)}</state>` : ''}
        ${patient.address.zip ? `<postalCode>${patient.address.zip}</postalCode>` : ''}
        ${patient.address.country ? `<country>${escapeXml(patient.address.country)}</country>` : ''}
      </addr>`
          : ''
      }
      ${patient.phone ? `<telecom value="tel:${patient.phone}" use="HP"/>` : ''}
      ${patient.email ? `<telecom value="mailto:${patient.email}"/>` : ''}
      <patient>
        <name>
          <given>${escapeXml(patient.firstName)}</given>
          <family>${escapeXml(patient.lastName)}</family>
        </name>
        <administrativeGenderCode code="${patient.gender}" codeSystem="2.16.840.1.113883.5.1"/>
        <birthTime value="${formatCDADate(patient.dateOfBirth)}"/>
      </patient>
    </patientRole>
  </recordTarget>

  <author>
    <time value="${formatCDADate(now, true)}"/>
    <assignedAuthor>
      <id root="2.16.840.1.113883.19" extension="${author.id}"/>
      ${author.npi ? `<id root="2.16.840.1.113883.4.6" extension="${author.npi}"/>` : ''}
      <assignedPerson>
        <name>
          <given>${escapeXml(author.firstName)}</given>
          <family>${escapeXml(author.lastName)}</family>
        </name>
      </assignedPerson>
      ${author.organization ? `<representedOrganization><name>${escapeXml(author.organization)}</name></representedOrganization>` : ''}
    </assignedAuthor>
  </author>

  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        <id root="2.16.840.1.113883.19"/>
        <name>Xoai Healthcare</name>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>

  <component>
    <structuredBody>
      ${generateProblemsSection(content.problems || [])}
      ${generateMedicationsSection(content.medications || [])}
      ${generateAllergiesSection(content.allergies || [])}
      ${generateVitalSignsSection(content.vitalSigns || [])}
    </structuredBody>
  </component>
</ClinicalDocument>`;
}
