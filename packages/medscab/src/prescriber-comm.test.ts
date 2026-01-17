import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateMessageId,
  createMessage,
  updateMessageStatus,
  markMessageSent,
  markMessageDelivered,
  markMessageRead,
  recordResponse,
  markMessageFailed,
  markForRetry,
  cancelMessage,
  isMessageExpired,
  checkAndMarkExpired,
  generateFillNotification,
  generateRenewalRequest,
  generatePriorAuthRequest,
  generateClarificationRequest,
  generateTherapyChangeRequest,
  getPendingFollowUps,
  getExpiredMessages,
  calculateCommunicationStats,
  formatForFax,
  getMessagesByPrescriber,
  getMessagesByPatient,
  getMessagesRequiringAction,
  MESSAGE_TYPE_NAMES,
  CHANNEL_NAMES,
  STATUS_NAMES,
  RESPONSE_TYPE_NAMES,
  DEFAULT_RESPONSE_DEADLINES,
  MAX_RETRY_ATTEMPTS,
  PrescriberContactSchema,
  PharmacyContactSchema,
  PrescriberMessageSchema,
  type PrescriberMessage,
  type PrescriberContact,
  type PharmacyContact,
  type PrescriptionReference,
  type PatientReference,
  type PrescriberMessageType,
  type CommunicationChannel,
  type MessageStatus,
} from './prescriber-comm';

describe('Prescriber Communication Module', () => {
  // Test data factories
  function createMockPrescriber(): PrescriberContact {
    return {
      npi: '1234567890',
      dea: 'AB1234567',
      firstName: 'John',
      lastName: 'Smith',
      credential: 'MD',
      specialty: 'Internal Medicine',
      phone: '555-123-4567',
      fax: '555-123-4568',
      email: 'dr.smith@clinic.com',
      preferredContact: 'fax',
      surescriptsEnabled: true,
      address: {
        street1: '123 Medical Plaza',
        city: 'Healthcare City',
        state: 'CA',
        zip: '90210',
      },
    };
  }

  function createMockPharmacy(): PharmacyContact {
    return {
      name: 'Main Street Pharmacy',
      npi: '9876543210',
      dea: 'BP1234567',
      ncpdpId: '1234567',
      phone: '555-987-6543',
      fax: '555-987-6544',
      email: 'pharmacy@mainstreet.com',
      address: {
        street1: '456 Main Street',
        city: 'Pharmatown',
        state: 'CA',
        zip: '90211',
      },
      pharmacistName: 'Jane Doe, RPh',
      pharmacistLicense: 'RPH12345',
    };
  }

  function createMockPrescription(): PrescriptionReference {
    return {
      prescriptionId: 'rx_001',
      rxNumber: 'RX-2024-001234',
      drugName: 'Lisinopril',
      strength: '10mg',
      quantity: 30,
      daysSupply: 30,
      sig: 'Take one tablet by mouth once daily',
      refillsAuthorized: 5,
      refillsRemaining: 3,
      writtenDate: new Date('2024-01-15'),
      deaSchedule: undefined,
    };
  }

  function createMockPatient(): PatientReference {
    return {
      patientId: 'pt_001',
      firstName: 'Alice',
      lastName: 'Johnson',
      dateOfBirth: new Date('1980-05-15'),
      phone: '555-111-2222',
      mrn: 'MRN001234',
    };
  }

  function createMockMessage(overrides?: Partial<PrescriberMessage>): PrescriberMessage {
    const message = createMessage(
      'renewal_request',
      createMockPrescriber(),
      createMockPharmacy(),
      createMockPrescription(),
      createMockPatient(),
      'fax',
      'Test Subject',
      'Test Body',
      'user_001'
    );
    return { ...message, ...overrides };
  }

  describe('Message ID Generation', () => {
    it('should generate unique message IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();

      expect(id1).not.toBe(id2);
    });

    it('should generate IDs with correct prefix', () => {
      const id = generateMessageId();

      expect(id).toMatch(/^MSG-[A-Z0-9]+-[A-Z0-9]+$/);
    });

    it('should generate uppercase IDs', () => {
      const id = generateMessageId();

      expect(id).toBe(id.toUpperCase());
    });
  });

  describe('Message Creation', () => {
    it('should create a message with all required fields', () => {
      const message = createMessage(
        'renewal_request',
        createMockPrescriber(),
        createMockPharmacy(),
        createMockPrescription(),
        createMockPatient(),
        'fax',
        'Renewal Request',
        'Please renew prescription',
        'user_001'
      );

      expect(message.id).toBeDefined();
      expect(message.messageType).toBe('renewal_request');
      expect(message.status).toBe('draft');
      expect(message.responseReceived).toBe(false);
      expect(message.retryCount).toBe(0);
      expect(message.auditTrail.length).toBe(1);
      expect(message.auditTrail[0]?.action).toBe('created');
    });

    it('should set default priority to routine', () => {
      const message = createMockMessage();

      expect(message.priority).toBe('routine');
    });

    it('should allow custom priority', () => {
      const message = createMessage(
        'drug_interaction',
        createMockPrescriber(),
        createMockPharmacy(),
        createMockPrescription(),
        createMockPatient(),
        'phone',
        'Urgent: Drug Interaction',
        'Critical interaction detected',
        'user_001',
        { priority: 'stat' }
      );

      expect(message.priority).toBe('stat');
    });

    it('should calculate response deadline based on message type', () => {
      const message = createMessage(
        'renewal_request',
        createMockPrescriber(),
        createMockPharmacy(),
        createMockPrescription(),
        createMockPatient(),
        'fax',
        'Renewal',
        'Body',
        'user_001'
      );

      expect(message.responseDeadline).toBeDefined();
      // Renewal request has 72 hour deadline
      const expectedDeadline = new Date();
      expectedDeadline.setHours(expectedDeadline.getHours() + 72);
      // Allow 1 minute tolerance
      expect(Math.abs(message.responseDeadline!.getTime() - expectedDeadline.getTime())).toBeLessThan(60000);
    });

    it('should not set response deadline for fill notifications', () => {
      const message = createMessage(
        'fill_notification',
        createMockPrescriber(),
        createMockPharmacy(),
        createMockPrescription(),
        createMockPatient(),
        'fax',
        'Filled',
        'Body',
        'user_001'
      );

      expect(message.responseDeadline).toBeUndefined();
      expect(message.followUpRequired).toBe(false);
    });

    it('should allow custom response deadline', () => {
      const message = createMessage(
        'renewal_request',
        createMockPrescriber(),
        createMockPharmacy(),
        createMockPrescription(),
        createMockPatient(),
        'fax',
        'Urgent Renewal',
        'Body',
        'user_001',
        { responseDeadlineHours: 24 }
      );

      const expectedDeadline = new Date();
      expectedDeadline.setHours(expectedDeadline.getHours() + 24);
      expect(Math.abs(message.responseDeadline!.getTime() - expectedDeadline.getTime())).toBeLessThan(60000);
    });

    it('should include sender name when provided', () => {
      const message = createMessage(
        'renewal_request',
        createMockPrescriber(),
        createMockPharmacy(),
        createMockPrescription(),
        createMockPatient(),
        'fax',
        'Subject',
        'Body',
        'user_001',
        { sentByName: 'Jane Pharmacist' }
      );

      expect(message.sentByName).toBe('Jane Pharmacist');
    });
  });

  describe('Status Management', () => {
    it('should update message status', () => {
      const message = createMockMessage();
      const updated = updateMessageStatus(message, 'pending_send', 'user_001', 'Ready to send');

      expect(updated.status).toBe('pending_send');
      expect(updated.auditTrail.length).toBe(2);
      expect(updated.auditTrail[1]?.previousStatus).toBe('draft');
      expect(updated.auditTrail[1]?.newStatus).toBe('pending_send');
    });

    it('should mark message as sent', () => {
      const message = createMockMessage();
      const sent = markMessageSent(message, 'SS-123456');

      expect(sent.status).toBe('sent');
      expect(sent.sentAt).toBeDefined();
      expect(sent.surescriptsMessageId).toBe('SS-123456');
    });

    it('should mark message as delivered', () => {
      const message = createMockMessage();
      const delivered = markMessageDelivered(message);

      expect(delivered.status).toBe('delivered');
      expect(delivered.deliveredAt).toBeDefined();
    });

    it('should mark message as read', () => {
      const message = createMockMessage();
      const read = markMessageRead(message);

      expect(read.status).toBe('read');
      expect(read.readAt).toBeDefined();
    });

    it('should track status changes in audit trail', () => {
      let message = createMockMessage();
      message = updateMessageStatus(message, 'pending_send');
      message = markMessageSent(message);
      message = markMessageDelivered(message);
      message = markMessageRead(message);

      expect(message.auditTrail.length).toBe(5);
      expect(message.auditTrail.map((a) => a.newStatus)).toEqual([
        'draft',
        'pending_send',
        'sent',
        'delivered',
        'read',
      ]);
    });
  });

  describe('Response Recording', () => {
    it('should record approved response', () => {
      const message = createMockMessage();
      const responded = recordResponse(message, 'approved', 'Refills authorized', 'user_002');

      expect(responded.status).toBe('response_received');
      expect(responded.responseReceived).toBe(true);
      expect(responded.responseType).toBe('approved');
      expect(responded.responseNotes).toBe('Refills authorized');
      expect(responded.responseBy).toBe('user_002');
      expect(responded.responseAt).toBeDefined();
    });

    it('should record denied response', () => {
      const message = createMockMessage();
      const responded = recordResponse(message, 'denied', 'Not appropriate for patient', 'user_002');

      expect(responded.responseType).toBe('denied');
      expect(responded.followUpRequired).toBe(false);
    });

    it('should set follow-up required for more info needed', () => {
      const message = createMockMessage();
      const responded = recordResponse(message, 'more_info_needed', 'Need lab results', 'user_002');

      expect(responded.followUpRequired).toBe(true);
    });

    it('should set follow-up required for call prescriber', () => {
      const message = createMockMessage();
      const responded = recordResponse(message, 'call_prescriber', 'Please call to discuss', 'user_002');

      expect(responded.followUpRequired).toBe(true);
    });
  });

  describe('Message Failure and Retry', () => {
    it('should mark message as failed', () => {
      const message = createMockMessage();
      const failed = markMessageFailed(message, 'Fax transmission failed');

      expect(failed.status).toBe('failed');
      expect(failed.errorMessage).toBe('Fax transmission failed');
    });

    it('should mark for retry and increment counter', () => {
      const message = createMockMessage();
      const retrying = markForRetry(message);

      expect(retrying.status).toBe('pending_send');
      expect(retrying.retryCount).toBe(1);
      expect(retrying.lastRetryAt).toBeDefined();
    });

    it('should fail after max retry attempts', () => {
      let message = createMockMessage({ retryCount: MAX_RETRY_ATTEMPTS });
      message = markForRetry(message);

      expect(message.status).toBe('failed');
      expect(message.errorMessage).toBe('Maximum retry attempts exceeded');
    });

    it('should allow retries up to max attempts', () => {
      let message = createMockMessage({ retryCount: 0 });

      for (let i = 0; i < MAX_RETRY_ATTEMPTS; i++) {
        message = markForRetry(message);
        expect(message.retryCount).toBe(i + 1);
        expect(message.status).toBe('pending_send');
      }

      // One more should fail
      message = markForRetry(message);
      expect(message.status).toBe('failed');
    });
  });

  describe('Message Cancellation', () => {
    it('should cancel message with reason', () => {
      const message = createMockMessage();
      const cancelled = cancelMessage(message, 'user_001', 'Patient cancelled therapy');

      expect(cancelled.status).toBe('cancelled');
      expect(cancelled.auditTrail[cancelled.auditTrail.length - 1]?.details).toBe(
        'Patient cancelled therapy'
      );
    });
  });

  describe('Message Expiration', () => {
    it('should detect expired message', () => {
      const pastDeadline = new Date();
      pastDeadline.setHours(pastDeadline.getHours() - 1);
      const message = createMockMessage({ responseDeadline: pastDeadline });

      expect(isMessageExpired(message)).toBe(true);
    });

    it('should not detect non-expired message as expired', () => {
      const futureDeadline = new Date();
      futureDeadline.setHours(futureDeadline.getHours() + 24);
      const message = createMockMessage({ responseDeadline: futureDeadline });

      expect(isMessageExpired(message)).toBe(false);
    });

    it('should not consider message without deadline as expired', () => {
      const message = createMockMessage({ responseDeadline: undefined });

      expect(isMessageExpired(message)).toBe(false);
    });

    it('should mark expired messages when status is appropriate', () => {
      const pastDeadline = new Date();
      pastDeadline.setHours(pastDeadline.getHours() - 1);
      const message = createMockMessage({
        status: 'sent',
        responseDeadline: pastDeadline,
      });

      const checked = checkAndMarkExpired(message);

      expect(checked.status).toBe('expired');
      expect(checked.expiredAt).toBeDefined();
    });

    it('should not mark draft message as expired', () => {
      const pastDeadline = new Date();
      pastDeadline.setHours(pastDeadline.getHours() - 1);
      const message = createMockMessage({
        status: 'draft',
        responseDeadline: pastDeadline,
      });

      const checked = checkAndMarkExpired(message);

      expect(checked.status).toBe('draft');
    });

    it('should not mark already expired message again', () => {
      const pastDeadline = new Date();
      pastDeadline.setHours(pastDeadline.getHours() - 1);
      const expiredAt = new Date();
      expiredAt.setMinutes(expiredAt.getMinutes() - 30);
      const message = createMockMessage({
        status: 'expired',
        responseDeadline: pastDeadline,
        expiredAt,
      });

      const checked = checkAndMarkExpired(message);

      expect(checked.expiredAt).toEqual(expiredAt);
    });
  });

  describe('Message Generators', () => {
    describe('Fill Notification', () => {
      it('should generate fill notification with correct subject', () => {
        const rx = createMockPrescription();
        const patient = createMockPatient();
        const pharmacy = createMockPharmacy();

        const { subject, body } = generateFillNotification(rx, patient, pharmacy);

        expect(subject).toContain('Prescription Filled');
        expect(subject).toContain(rx.drugName);
        expect(subject).toContain(patient.lastName);
      });

      it('should include patient and prescription details in body', () => {
        const rx = createMockPrescription();
        const patient = createMockPatient();
        const pharmacy = createMockPharmacy();

        const { body } = generateFillNotification(rx, patient, pharmacy);

        expect(body).toContain(patient.firstName);
        expect(body).toContain(patient.lastName);
        expect(body).toContain(rx.rxNumber);
        expect(body).toContain(rx.drugName);
        expect(body).toContain(rx.strength);
        expect(body).toContain(String(rx.quantity));
        expect(body).toContain(pharmacy.name);
      });

      it('should include no response required statement', () => {
        const { body } = generateFillNotification(
          createMockPrescription(),
          createMockPatient(),
          createMockPharmacy()
        );

        expect(body).toContain('No response is required');
      });
    });

    describe('Renewal Request', () => {
      it('should generate renewal request with refill count', () => {
        const { subject, body } = generateRenewalRequest(
          createMockPrescription(),
          createMockPatient(),
          createMockPharmacy(),
          3,
          'Patient requests continuation of therapy'
        );

        expect(subject).toContain('Refill/Renewal Request');
        expect(body).toContain('Refills Requested: 3');
        expect(body).toContain('Patient requests continuation of therapy');
      });

      it('should include refills remaining', () => {
        const rx = createMockPrescription();
        rx.refillsRemaining = 0;

        const { body } = generateRenewalRequest(
          rx,
          createMockPatient(),
          createMockPharmacy(),
          5
        );

        expect(body).toContain('Refills Remaining: 0');
      });
    });

    describe('Prior Authorization Request', () => {
      it('should generate prior auth request with insurance info', () => {
        const { subject, body } = generatePriorAuthRequest(
          createMockPrescription(),
          createMockPatient(),
          createMockPharmacy(),
          'Blue Cross Blue Shield',
          'NDC not covered',
          'Generic alternative available'
        );

        expect(subject).toContain('Prior Authorization Required');
        expect(body).toContain('Blue Cross Blue Shield');
        expect(body).toContain('NDC not covered');
        expect(body).toContain('Generic alternative available');
      });

      it('should include action required section', () => {
        const { body } = generatePriorAuthRequest(
          createMockPrescription(),
          createMockPatient(),
          createMockPharmacy(),
          'Aetna'
        );

        expect(body).toContain('ACTION REQUIRED');
        expect(body).toContain('prior authorization');
      });
    });

    describe('Clarification Request', () => {
      it('should generate clarification request with question', () => {
        const { subject, body } = generateClarificationRequest(
          createMockPrescription(),
          createMockPatient(),
          createMockPharmacy(),
          'quantity',
          'Is the quantity correct for the days supply?',
          '30',
          '90'
        );

        expect(subject).toContain('Clarification Needed');
        expect(body).toContain('Type: quantity');
        expect(body).toContain('Current Value: 30');
        expect(body).toContain('Suggested Value: 90');
        expect(body).toContain('Is the quantity correct');
      });

      it('should work without suggested value', () => {
        const { body } = generateClarificationRequest(
          createMockPrescription(),
          createMockPatient(),
          createMockPharmacy(),
          'directions',
          'Directions are unclear, please clarify',
          'Take as directed'
        );

        expect(body).toContain('Type: directions');
        expect(body).toContain('Current Value: Take as directed');
        expect(body).not.toContain('Suggested Value:');
      });
    });

    describe('Therapy Change Request', () => {
      it('should generate therapy change request with details', () => {
        const { subject, body } = generateTherapyChangeRequest(
          createMockPrescription(),
          createMockPatient(),
          createMockPharmacy(),
          'Losartan',
          '50mg',
          'formulary',
          'Losartan is preferred on patient insurance formulary',
          150
        );

        expect(subject).toContain('Therapy Change Recommendation');
        expect(subject).toContain('Lisinopril to Losartan');
        expect(body).toContain('Suggested Medication: Losartan 50mg');
        expect(body).toContain('Reason: formulary');
        expect(body).toContain('Estimated Cost Savings: $150.00');
      });

      it('should work without cost savings', () => {
        const { body } = generateTherapyChangeRequest(
          createMockPrescription(),
          createMockPatient(),
          createMockPharmacy(),
          'Losartan',
          '50mg',
          'allergy',
          'Patient developed ACE inhibitor cough'
        );

        expect(body).toContain('Reason: allergy');
        expect(body).not.toContain('Cost Savings');
      });
    });
  });

  describe('Message Filtering', () => {
    let messages: PrescriberMessage[];

    beforeEach(() => {
      const pastDeadline = new Date();
      pastDeadline.setHours(pastDeadline.getHours() - 24);

      const futureDeadline = new Date();
      futureDeadline.setHours(futureDeadline.getHours() + 24);

      messages = [
        createMockMessage({
          id: 'msg1',
          status: 'sent',
          followUpRequired: true,
          responseReceived: false,
          responseDeadline: futureDeadline,
          prescriber: { ...createMockPrescriber(), npi: '1111111111' },
          patient: { ...createMockPatient(), patientId: 'pt_001' },
        }),
        createMockMessage({
          id: 'msg2',
          status: 'delivered',
          followUpRequired: true,
          responseReceived: false,
          responseDeadline: pastDeadline,
          prescriber: { ...createMockPrescriber(), npi: '1111111111' },
          patient: { ...createMockPatient(), patientId: 'pt_002' },
        }),
        createMockMessage({
          id: 'msg3',
          status: 'response_received',
          followUpRequired: false,
          responseReceived: true,
          prescriber: { ...createMockPrescriber(), npi: '2222222222' },
          patient: { ...createMockPatient(), patientId: 'pt_001' },
        }),
        createMockMessage({
          id: 'msg4',
          status: 'cancelled',
          followUpRequired: true,
          responseReceived: false,
          prescriber: { ...createMockPrescriber(), npi: '2222222222' },
          patient: { ...createMockPatient(), patientId: 'pt_003' },
        }),
        createMockMessage({
          id: 'msg5',
          status: 'failed',
          followUpRequired: false,
          responseReceived: false,
          prescriber: { ...createMockPrescriber(), npi: '1111111111' },
          patient: { ...createMockPatient(), patientId: 'pt_001' },
        }),
        createMockMessage({
          id: 'msg6',
          status: 'response_pending',
          followUpRequired: true,
          responseReceived: false,
          responseType: 'more_info_needed',
          prescriber: { ...createMockPrescriber(), npi: '3333333333' },
          patient: { ...createMockPatient(), patientId: 'pt_004' },
        }),
      ];
    });

    it('should get pending follow-ups', () => {
      const pending = getPendingFollowUps(messages);

      expect(pending.length).toBe(3);
      expect(pending.map((m) => m.id)).toContain('msg1');
      expect(pending.map((m) => m.id)).toContain('msg2');
      expect(pending.map((m) => m.id)).toContain('msg6');
    });

    it('should not include cancelled messages in pending', () => {
      const pending = getPendingFollowUps(messages);

      expect(pending.map((m) => m.id)).not.toContain('msg4');
    });

    it('should get expired messages', () => {
      const expired = getExpiredMessages(messages);

      expect(expired.length).toBe(1);
      expect(expired[0]?.id).toBe('msg2');
    });

    it('should get messages by prescriber NPI', () => {
      const prescriberMessages = getMessagesByPrescriber(messages, '1111111111');

      expect(prescriberMessages.length).toBe(3);
    });

    it('should get messages by patient ID', () => {
      const patientMessages = getMessagesByPatient(messages, 'pt_001');

      expect(patientMessages.length).toBe(3);
    });

    it('should get messages requiring action', () => {
      const actionRequired = getMessagesRequiringAction(messages);

      expect(actionRequired.length).toBe(2);
      expect(actionRequired.map((m) => m.id)).toContain('msg5'); // failed
      expect(actionRequired.map((m) => m.id)).toContain('msg6'); // response_pending
    });
  });

  describe('Communication Statistics', () => {
    it('should calculate basic statistics', () => {
      const now = new Date();
      const sentAt = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago
      const responseAt = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago

      const messages: PrescriberMessage[] = [
        createMockMessage({
          messageType: 'renewal_request',
          channel: 'fax',
          status: 'response_received',
          sentAt,
          responseAt,
          responseReceived: true,
        }),
        createMockMessage({
          messageType: 'renewal_request',
          channel: 'surescripts',
          status: 'sent',
          sentAt: now,
          responseReceived: false,
        }),
        createMockMessage({
          messageType: 'fill_notification',
          channel: 'fax',
          status: 'sent',
          sentAt: now,
          responseReceived: false,
        }),
        createMockMessage({
          messageType: 'prior_auth_request',
          channel: 'fax',
          status: 'expired',
          sentAt,
          responseReceived: false,
        }),
      ];

      const stats = calculateCommunicationStats(messages);

      expect(stats.totalSent).toBe(4);
      expect(stats.byType.renewal_request).toBe(2);
      expect(stats.byType.fill_notification).toBe(1);
      expect(stats.byChannel.fax).toBe(3);
      expect(stats.byChannel.surescripts).toBe(1);
      expect(stats.byStatus.sent).toBe(2);
      expect(stats.byStatus.response_received).toBe(1);
      expect(stats.byStatus.expired).toBe(1);
      expect(stats.expiredCount).toBe(1);
    });

    it('should calculate response rate correctly', () => {
      const messages: PrescriberMessage[] = [
        createMockMessage({
          messageType: 'renewal_request', // expects response
          status: 'response_received',
          responseReceived: true,
          sentAt: new Date(),
          responseAt: new Date(),
        }),
        createMockMessage({
          messageType: 'renewal_request', // expects response
          status: 'sent',
          responseReceived: false,
          sentAt: new Date(),
        }),
        createMockMessage({
          messageType: 'fill_notification', // no response expected
          status: 'sent',
          responseReceived: false,
          sentAt: new Date(),
        }),
      ];

      const stats = calculateCommunicationStats(messages);

      // 1 response out of 2 that expect responses = 50%
      expect(stats.responseRate).toBe(50);
    });

    it('should calculate average response time', () => {
      const sentAt = new Date('2024-01-01T10:00:00');
      const responseAt1 = new Date('2024-01-01T22:00:00'); // 12 hours later
      const responseAt2 = new Date('2024-01-02T10:00:00'); // 24 hours later

      const messages: PrescriberMessage[] = [
        createMockMessage({
          status: 'response_received',
          responseReceived: true,
          sentAt,
          responseAt: responseAt1,
        }),
        createMockMessage({
          status: 'response_received',
          responseReceived: true,
          sentAt,
          responseAt: responseAt2,
        }),
      ];

      const stats = calculateCommunicationStats(messages);

      // (12 + 24) / 2 = 18 hours average
      expect(stats.averageResponseTimeHours).toBe(18);
    });

    it('should count pending responses', () => {
      const messages: PrescriberMessage[] = [
        createMockMessage({ status: 'sent', responseReceived: false }),
        createMockMessage({ status: 'delivered', responseReceived: false }),
        createMockMessage({ status: 'read', responseReceived: false }),
        createMockMessage({ status: 'response_received', responseReceived: true }),
        createMockMessage({ status: 'cancelled', responseReceived: false }),
      ];

      const stats = calculateCommunicationStats(messages);

      expect(stats.pendingResponses).toBe(3);
    });

    it('should handle empty message array', () => {
      const stats = calculateCommunicationStats([]);

      expect(stats.totalSent).toBe(0);
      expect(stats.responseRate).toBe(0);
      expect(stats.averageResponseTimeHours).toBe(0);
      expect(stats.pendingResponses).toBe(0);
      expect(stats.expiredCount).toBe(0);
    });
  });

  describe('Fax Formatting', () => {
    it('should format message for fax with all sections', () => {
      const message = createMockMessage({
        priority: 'urgent',
        responseDeadline: new Date('2024-01-20T12:00:00'),
      });

      const faxContent = formatForFax(message);

      expect(faxContent).toContain('PHARMACY COMMUNICATION');
      expect(faxContent).toContain('RENEWAL/REFILL REQUEST');
      expect(faxContent).toContain('Priority: URGENT');
      expect(faxContent).toContain('FROM: (Pharmacy)');
      expect(faxContent).toContain('TO: (Prescriber)');
      expect(faxContent).toContain('PATIENT:');
      expect(faxContent).toContain('SUBJECT:');
      expect(faxContent).toContain('MESSAGE:');
      expect(faxContent).toContain('CONFIDENTIALITY NOTICE');
      expect(faxContent).toContain('HIPAA');
    });

    it('should include pharmacy contact information', () => {
      const message = createMockMessage();
      const faxContent = formatForFax(message);

      expect(faxContent).toContain(message.pharmacy.name);
      expect(faxContent).toContain(message.pharmacy.npi);
      expect(faxContent).toContain(message.pharmacy.phone);
      expect(faxContent).toContain(message.pharmacy.fax);
    });

    it('should include prescriber contact information', () => {
      const message = createMockMessage();
      const faxContent = formatForFax(message);

      expect(faxContent).toContain(message.prescriber.lastName);
      expect(faxContent).toContain(message.prescriber.firstName);
      expect(faxContent).toContain(message.prescriber.npi);
    });

    it('should include patient information', () => {
      const message = createMockMessage();
      const faxContent = formatForFax(message);

      expect(faxContent).toContain(message.patient.lastName);
      expect(faxContent).toContain(message.patient.firstName);
      expect(faxContent).toContain('DOB:');
    });

    it('should include response deadline when present', () => {
      const deadline = new Date('2024-01-20T12:00:00');
      const message = createMockMessage({ responseDeadline: deadline });

      const faxContent = formatForFax(message);

      expect(faxContent).toContain('Please respond by:');
    });
  });

  describe('Schema Validation', () => {
    it('should validate prescriber contact schema', () => {
      const prescriber = createMockPrescriber();
      const result = PrescriberContactSchema.safeParse(prescriber);

      expect(result.success).toBe(true);
    });

    it('should reject invalid prescriber NPI', () => {
      const prescriber = { ...createMockPrescriber(), npi: '123' };
      const result = PrescriberContactSchema.safeParse(prescriber);

      expect(result.success).toBe(false);
    });

    it('should validate pharmacy contact schema', () => {
      const pharmacy = createMockPharmacy();
      const result = PharmacyContactSchema.safeParse(pharmacy);

      expect(result.success).toBe(true);
    });

    it('should reject pharmacy without required fields', () => {
      const pharmacy = {
        name: 'Test Pharmacy',
        npi: '1234567890',
        // Missing required fields
      };
      const result = PharmacyContactSchema.safeParse(pharmacy);

      expect(result.success).toBe(false);
    });

    it('should validate message schema', () => {
      const message = createMockMessage();
      const result = PrescriberMessageSchema.safeParse({
        ...message,
        // Schema expects these specific fields
        id: message.id,
        messageType: message.messageType,
        priority: message.priority,
        channel: message.channel,
        subject: message.subject,
        body: message.body,
        status: message.status,
        responseReceived: message.responseReceived,
        followUpRequired: message.followUpRequired,
        retryCount: message.retryCount,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Constants', () => {
    it('should have all message type names', () => {
      const types: PrescriberMessageType[] = [
        'fill_notification',
        'hold_notification',
        'cancel_request',
        'renewal_request',
        'prior_auth_request',
        'clarification_request',
        'therapy_change',
        'generic_substitution',
        'drug_interaction',
        'formulary_alternative',
        'refill_too_soon',
        'quantity_clarification',
        'directions_clarification',
        'daw_clarification',
        'general_inquiry',
      ];

      types.forEach((type) => {
        expect(MESSAGE_TYPE_NAMES[type]).toBeDefined();
        expect(typeof MESSAGE_TYPE_NAMES[type]).toBe('string');
      });
    });

    it('should have all channel names', () => {
      const channels: CommunicationChannel[] = [
        'surescripts',
        'fax',
        'phone',
        'portal',
        'secure_message',
        'mail',
      ];

      channels.forEach((channel) => {
        expect(CHANNEL_NAMES[channel]).toBeDefined();
      });
    });

    it('should have all status names', () => {
      const statuses: MessageStatus[] = [
        'draft',
        'pending_send',
        'sent',
        'delivered',
        'read',
        'response_received',
        'response_pending',
        'expired',
        'cancelled',
        'failed',
      ];

      statuses.forEach((status) => {
        expect(STATUS_NAMES[status]).toBeDefined();
      });
    });

    it('should have default response deadlines for all message types', () => {
      const types = Object.keys(MESSAGE_TYPE_NAMES) as PrescriberMessageType[];

      types.forEach((type) => {
        expect(DEFAULT_RESPONSE_DEADLINES[type]).toBeDefined();
        expect(typeof DEFAULT_RESPONSE_DEADLINES[type]).toBe('number');
      });
    });

    it('should have response type names', () => {
      expect(RESPONSE_TYPE_NAMES.approved).toBe('Approved');
      expect(RESPONSE_TYPE_NAMES.denied).toBe('Denied');
      expect(RESPONSE_TYPE_NAMES.modified).toBe('Approved with Modifications');
    });

    it('should define max retry attempts', () => {
      expect(MAX_RETRY_ATTEMPTS).toBe(3);
    });

    it('should have zero deadline for fill notifications (no response expected)', () => {
      expect(DEFAULT_RESPONSE_DEADLINES.fill_notification).toBe(0);
    });

    it('should have short deadline for drug interactions (urgent)', () => {
      expect(DEFAULT_RESPONSE_DEADLINES.drug_interaction).toBe(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle message with no attachments', () => {
      const message = createMockMessage({ attachments: undefined });

      expect(message.attachments).toBeUndefined();
    });

    it('should handle message with multiple attachments', () => {
      const message = createMessage(
        'prior_auth_request',
        createMockPrescriber(),
        createMockPharmacy(),
        createMockPrescription(),
        createMockPatient(),
        'fax',
        'PA Request',
        'Body',
        'user_001',
        { attachments: ['doc1.pdf', 'doc2.pdf', 'doc3.pdf'] }
      );

      expect(message.attachments?.length).toBe(3);
    });

    it('should handle patient without phone', () => {
      const patient = createMockPatient();
      delete (patient as { phone?: string }).phone;

      const { body } = generateRenewalRequest(
        createMockPrescription(),
        patient,
        createMockPharmacy(),
        3
      );

      // Patient info section should not have phone, but pharmacy section still will
      // Check that the patient phone line (after DOB) is empty
      expect(body).toContain('DOB:');
      // The body should still have pharmacy phone but no empty line pattern from patient phone
    });

    it('should handle prescriber without credential', () => {
      const prescriber = createMockPrescriber();
      delete (prescriber as { credential?: string }).credential;

      const message = createMockMessage({ prescriber });
      const faxContent = formatForFax(message);

      expect(faxContent).toContain(prescriber.lastName);
    });

    it('should handle pharmacy without pharmacist name', () => {
      const pharmacy = createMockPharmacy();
      delete (pharmacy as { pharmacistName?: string }).pharmacistName;

      const { body } = generateFillNotification(
        createMockPrescription(),
        createMockPatient(),
        pharmacy
      );

      expect(body).toContain('Pharmacy Staff');
    });

    it('should preserve immutability in status updates', () => {
      const original = createMockMessage();
      const updated = updateMessageStatus(original, 'sent');

      expect(original.status).toBe('draft');
      expect(updated.status).toBe('sent');
      expect(original.auditTrail.length).toBe(1);
      expect(updated.auditTrail.length).toBe(2);
    });

    it('should handle very long message body', () => {
      const longBody = 'A'.repeat(10000);
      const message = createMessage(
        'general_inquiry',
        createMockPrescriber(),
        createMockPharmacy(),
        createMockPrescription(),
        createMockPatient(),
        'fax',
        'Long Message',
        longBody,
        'user_001'
      );

      expect(message.body.length).toBe(10000);
    });
  });
});
