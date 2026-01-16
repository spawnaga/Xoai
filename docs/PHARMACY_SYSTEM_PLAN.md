# Comprehensive Pharmacy System Plan

> **Document Version:** 1.0
> **Created:** 2026-01-16
> **Purpose:** Complete blueprint for building a pharmacy management application serving retail, institutional (hospice, rehab), and multi-location pharmacy operations.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Pharmacy Types & Service Models](#2-pharmacy-types--service-models)
3. [Core Software Modules](#3-core-software-modules)
4. [Database Architecture](#4-database-architecture)
5. [Hardware & Equipment](#5-hardware--equipment)
6. [E-Prescribing Integration](#6-e-prescribing-integration)
7. [Fax Systems](#7-fax-systems)
8. [Point of Sale & Payments](#8-point-of-sale--payments)
9. [Insurance & PBM Integration](#9-insurance--pbm-integration)
10. [Inventory Management](#10-inventory-management)
11. [Controlled Substances Management](#11-controlled-substances-management)
12. [Workflow & Queue Management](#12-workflow--queue-management)
13. [Multi-Location & Central Fill](#13-multi-location--central-fill)
14. [Specialty Pharmacy](#14-specialty-pharmacy)
15. [Compounding Pharmacy](#15-compounding-pharmacy)
16. [Clinical Services](#16-clinical-services)
17. [Delivery Services](#17-delivery-services)
18. [Staffing & Roles](#18-staffing--roles)
19. [Physical Layout & Design](#19-physical-layout--design)
20. [Reporting & Compliance](#20-reporting--compliance)
21. [Security & HIPAA](#21-security--hipaa)
22. [Implementation Phases](#22-implementation-phases)

---

## 1. Executive Summary

### Market Overview
- Global pharmacy management software market: **$85 billion (2024)** → **$156 billion by 2032**
- Growth rate: **10-15% CAGR**
- Nearly 100% of pharmacies in high-income countries use digital pharmacy management systems

### Key Industry Players
| Category | Examples |
|----------|----------|
| **Chain Systems** | CVS RxConnect, Walgreens Intercom Plus |
| **Independent PMS** | PioneerRx, Liberty Software, PrimeRx |
| **Enterprise** | McKesson, Cerner (Oracle Health), Epic |
| **Specialty** | RedSail Technologies, Datascan |

### System Goals
1. **Prescription Processing** - End-to-end Rx lifecycle management
2. **Patient Safety** - DUR, interactions, allergy checking
3. **Insurance Billing** - Real-time claims adjudication
4. **Regulatory Compliance** - DEA, FDA, state board requirements
5. **Multi-Institution Support** - Serve retail, hospice, rehab, hospitals
6. **Operational Efficiency** - Workflow optimization, automation

---

## 2. Pharmacy Types & Service Models

### 2.1 Retail Pharmacy (Community)

**Characteristics:**
- Walk-in customers and prescription dispensing
- OTC product sales
- Drive-through windows
- Front-end retail operations

**Services:**
- Prescription filling and dispensing
- Patient counseling
- Immunizations
- MTM (Medication Therapy Management)
- Point-of-care testing

### 2.2 Long-Term Care (LTC) Pharmacy

**Facility Types Served:**
| Facility | Description |
|----------|-------------|
| **Skilled Nursing Facilities (SNF)** | 24/7 nursing care, Medicare Part A |
| **Assisted Living Facilities (ALF)** | Residential care, lower acuity |
| **Hospice** | End-of-life palliative care |
| **Rehabilitation Centers** | Post-acute recovery care |
| **Memory Care** | Dementia/Alzheimer's specialized |
| **Group Homes** | Small residential facilities |

**LTC-Specific Requirements:**

```
┌─────────────────────────────────────────────────────────────────┐
│                    LTC PHARMACY OPERATIONS                       │
├─────────────────────────────────────────────────────────────────┤
│  • 24/7/365 Availability (emergency dispensing)                 │
│  • Monthly Drug Regimen Review (DRR) - OBRA-90 mandate          │
│  • Chart order processing (vs. individual Rx)                   │
│  • Unit-dose and blister pack packaging                         │
│  • Emergency medication kits at facilities                      │
│  • Medication Administration Records (MAR) generation           │
│  • Consultant pharmacist services                               │
│  • Automated delivery scheduling                                │
│  • Facility billing (vs. patient billing)                       │
└─────────────────────────────────────────────────────────────────┘
```

**Hospice-Specific:**
- Symptom management medications (pain, nausea, anxiety)
- Comfort kits (pre-assembled medication kits)
- CMS Conditions of Participation compliance
- Hospice is responsible for all medication costs related to terminal diagnosis
- Focus on palliative care formulary

**Rehab-Specific:**
- Short-term medication regimens
- Physical therapy coordination
- Discharge planning and medication reconciliation
- Insurance transitions (Medicare Part A → Part D)

### 2.3 Specialty Pharmacy

**Characteristics:**
- High-cost, complex medications ($10,000+/month)
- Biologics, injectables, oral oncology
- Cold chain storage requirements
- Prior authorization management
- Patient support programs

### 2.4 Compounding Pharmacy

**Types:**
- **503A** - Patient-specific, state-regulated
- **503B** - Outsourcing facilities, FDA-regulated, bulk manufacturing

### 2.5 Hospital/Health-System Pharmacy

**Services:**
- Inpatient dispensing
- IV room operations
- Automated dispensing cabinets (ADC)
- Clinical pharmacy services

---

## 3. Core Software Modules

### 3.1 Module Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                     PHARMACY MANAGEMENT SYSTEM                          │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ PRESCRIPTION │  │   PATIENT    │  │  INVENTORY   │  │  BILLING   │ │
│  │  PROCESSING  │  │  MANAGEMENT  │  │  MANAGEMENT  │  │  & CLAIMS  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │   WORKFLOW   │  │  REPORTING   │  │   CLINICAL   │  │    POS     │ │
│  │    QUEUE     │  │  & ANALYTICS │  │   SERVICES   │  │  CHECKOUT  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  CONTROLLED  │  │   DELIVERY   │  │  MULTI-SITE  │  │    FAX     │ │
│  │  SUBSTANCES  │  │  MANAGEMENT  │  │   & GROUPS   │  │  & E-RX    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ COMPOUNDING  │  │   LTC/LTCF   │  │  SPECIALTY   │  │   340B     │ │
│  │   MODULE     │  │   MODULE     │  │    MODULE    │  │  PROGRAM   │ │
│  └──────────────┘  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Prescription Processing Module

**Features:**
| Feature | Description |
|---------|-------------|
| **Data Entry** | Manual Rx entry with validation |
| **E-Rx Receipt** | Surescripts NCPDP SCRIPT integration |
| **Image Scanning** | Hard copy Rx digitization |
| **Sig Code Translation** | Convert directions to patient labels |
| **DAW Codes** | Dispense as Written handling |
| **Refill Management** | Auto-refill, refill reminders |
| **Transfer Processing** | Inbound/outbound Rx transfers |
| **Partial Fill** | Controlled substance partials |

**Workflow States:**
```
┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐
│ INTAKE  │ → │  DATA   │ → │  FILL   │ → │ VERIFY  │ → │  READY  │
│         │   │  ENTRY  │   │         │   │  (RPH)  │   │         │
└─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘
     ↓                            ↓
┌─────────┐                 ┌─────────┐
│EXCEPTION│                 │  HOLD   │
│ QUEUE   │                 │  (DUR)  │
└─────────┘                 └─────────┘
```

### 3.3 Patient Management Module

**Patient Profile Fields:**
```typescript
interface PatientProfile {
  // Demographics
  patientId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: string;
  ssn?: string; // encrypted

  // Contact
  address: Address;
  phone: string;
  email?: string;
  preferredContact: 'phone' | 'email' | 'text';

  // Medical
  allergies: Allergy[];
  conditions: MedicalCondition[];
  currentMedications: Medication[];

  // Insurance
  primaryInsurance: InsuranceInfo;
  secondaryInsurance?: InsuranceInfo;

  // Preferences
  preferredLanguage: string;
  safetyCapPreference: boolean;
  genericSubstitutionAllowed: boolean;

  // LTC-Specific
  facilityId?: string;
  roomNumber?: string;
  physicianId?: string;

  // Clinical
  weight?: number;
  height?: number;
  creatinineClearance?: number;
  hepaticFunction?: string;
  pregnancyStatus?: string;
}
```

### 3.4 Clinical Decision Support

**DUR Alerts:**
| Alert Type | Severity | Action |
|------------|----------|--------|
| Drug-Drug Interaction | High/Moderate/Low | Block/Warn |
| Drug-Allergy | High | Block |
| Duplicate Therapy | Moderate | Warn |
| Dose Check (high/low) | High | Require Override |
| Drug-Disease | Moderate | Warn |
| Drug-Age | Moderate | Warn |
| Drug-Pregnancy | High | Block |
| Refill Too Soon | Low | Warn |

---

## 4. Database Architecture

### 4.1 Entity Relationship Diagram (Core)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHARMACY DATABASE SCHEMA                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   PATIENT    │────<│ PRESCRIPTION │>────│    DRUG      │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                    │                         │
│         │                    │                    │                         │
│         ▼                    ▼                    ▼                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │  INSURANCE   │     │    FILL      │     │  INVENTORY   │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│         │                    │                    │                         │
│         │                    │                    │                         │
│         ▼                    ▼                    ▼                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │    CLAIM     │     │   PAYMENT    │     │    ORDER     │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │  PRESCRIBER  │     │   FACILITY   │     │  PHARMACY    │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │  AUDIT_LOG   │     │    USER      │     │   SCHEDULE   │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Key Tables Schema

```sql
-- PRESCRIPTION TABLE
CREATE TABLE Prescription (
  id                    UUID PRIMARY KEY,
  rxNumber              VARCHAR(20) UNIQUE NOT NULL,
  patientId             UUID REFERENCES Patient(id),
  prescriberId          UUID REFERENCES Prescriber(id),
  drugId                UUID REFERENCES Drug(id),
  ndc                   VARCHAR(11) NOT NULL,
  quantity              DECIMAL(10,2) NOT NULL,
  daysSupply            INT NOT NULL,
  directions            TEXT NOT NULL,
  directionsTranslated  TEXT,
  refillsAuthorized     INT DEFAULT 0,
  refillsRemaining      INT DEFAULT 0,
  dawCode               INT DEFAULT 0,
  status                VARCHAR(20) NOT NULL,
  writtenDate           DATE NOT NULL,
  expirationDate        DATE NOT NULL,
  originType            VARCHAR(20) NOT NULL, -- 'written', 'verbal', 'fax', 'electronic'
  controlledSchedule    VARCHAR(5),
  facilityId            UUID REFERENCES Facility(id), -- for LTC
  chartOrderId          VARCHAR(50), -- for LTC chart orders
  priorAuthNumber       VARCHAR(50),
  createdAt             TIMESTAMP DEFAULT NOW(),
  updatedAt             TIMESTAMP DEFAULT NOW()
);

-- DRUG TABLE (NDC-based)
CREATE TABLE Drug (
  id                    UUID PRIMARY KEY,
  ndc                   VARCHAR(11) UNIQUE NOT NULL,
  ndc10                 VARCHAR(10),
  productName           VARCHAR(255) NOT NULL,
  genericName           VARCHAR(255) NOT NULL,
  brandName             VARCHAR(255),
  manufacturer          VARCHAR(255),
  dosageForm            VARCHAR(100),
  strength              VARCHAR(100),
  strengthUnit          VARCHAR(50),
  packageSize           DECIMAL(10,2),
  packageUnit           VARCHAR(50),
  routeOfAdmin          VARCHAR(100),
  deaSchedule           VARCHAR(5),
  rxOtcIndicator        VARCHAR(10),
  gpi                   VARCHAR(14), -- Generic Product Identifier
  ahfsCode              VARCHAR(20),
  therapeuticClass      VARCHAR(255),
  awpPrice              DECIMAL(12,4),
  wacPrice              DECIMAL(12,4),
  nadacPrice            DECIMAL(12,4),
  isCompound            BOOLEAN DEFAULT FALSE,
  isRefrigerated        BOOLEAN DEFAULT FALSE,
  tallManLettering      VARCHAR(255),
  unitDoseAvailable     BOOLEAN DEFAULT FALSE,
  createdAt             TIMESTAMP DEFAULT NOW(),
  updatedAt             TIMESTAMP DEFAULT NOW()
);

-- FILL TABLE (Dispensing Record)
CREATE TABLE Fill (
  id                    UUID PRIMARY KEY,
  prescriptionId        UUID REFERENCES Prescription(id),
  fillNumber            INT NOT NULL,
  fillDate              TIMESTAMP DEFAULT NOW(),
  quantityDispensed     DECIMAL(10,2) NOT NULL,
  daysSupply            INT NOT NULL,
  dispensedNdc          VARCHAR(11) NOT NULL,
  lotNumber             VARCHAR(50),
  expirationDate        DATE,
  dispensingPharmacist  UUID REFERENCES User(id),
  verifyingPharmacist   UUID REFERENCES User(id),
  technicianId          UUID REFERENCES User(id),
  claimId               UUID REFERENCES Claim(id),
  paymentId             UUID REFERENCES Payment(id),
  deliveryMethod        VARCHAR(20), -- 'pickup', 'delivery', 'mail'
  deliveryStatus        VARCHAR(20),
  binLocation           VARCHAR(50),
  status                VARCHAR(20) NOT NULL,
  returnedToStock       BOOLEAN DEFAULT FALSE,
  partialFill           BOOLEAN DEFAULT FALSE,
  createdAt             TIMESTAMP DEFAULT NOW()
);

-- FACILITY TABLE (for LTC/Institutional)
CREATE TABLE Facility (
  id                    UUID PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  facilityType          VARCHAR(50) NOT NULL, -- 'SNF', 'ALF', 'Hospice', 'Rehab', etc.
  npi                   VARCHAR(10),
  deaNumber             VARCHAR(15),
  address               JSONB NOT NULL,
  phone                 VARCHAR(20),
  fax                   VARCHAR(20),
  contactPerson         VARCHAR(255),
  billingType           VARCHAR(50), -- 'facility', 'patient', 'mixed'
  deliverySchedule      JSONB, -- delivery days/times
  emergencyKitLocation  VARCHAR(255),
  consultantPharmacist  UUID REFERENCES User(id),
  contractStartDate     DATE,
  contractEndDate       DATE,
  status                VARCHAR(20) DEFAULT 'active',
  createdAt             TIMESTAMP DEFAULT NOW(),
  updatedAt             TIMESTAMP DEFAULT NOW()
);

-- CLAIM TABLE (Insurance Billing)
CREATE TABLE Claim (
  id                    UUID PRIMARY KEY,
  fillId                UUID REFERENCES Fill(id),
  claimNumber           VARCHAR(50) UNIQUE,
  transactionType       VARCHAR(10) NOT NULL, -- 'B1', 'B2', 'B3'
  bin                   VARCHAR(6) NOT NULL,
  pcn                   VARCHAR(10),
  groupNumber           VARCHAR(20),
  memberId              VARCHAR(50) NOT NULL,
  personCode            VARCHAR(3),
  submittedAmount       DECIMAL(12,2),
  paidAmount            DECIMAL(12,2),
  patientPayAmount      DECIMAL(12,2),
  copayAmount           DECIMAL(12,2),
  coinsuranceAmount     DECIMAL(12,2),
  deductibleAmount      DECIMAL(12,2),
  dispensingFee         DECIMAL(12,2),
  ingredientCost        DECIMAL(12,2),
  responseCode          VARCHAR(2),
  rejectCodes           VARCHAR(100)[], -- array of reject codes
  authNumber            VARCHAR(50),
  adjudicationDate      TIMESTAMP,
  is340B                BOOLEAN DEFAULT FALSE,
  createdAt             TIMESTAMP DEFAULT NOW()
);

-- INVENTORY TABLE
CREATE TABLE Inventory (
  id                    UUID PRIMARY KEY,
  pharmacyId            UUID REFERENCES Pharmacy(id),
  ndc                   VARCHAR(11) NOT NULL,
  quantityOnHand        DECIMAL(12,2) NOT NULL,
  quantityAllocated     DECIMAL(12,2) DEFAULT 0,
  reorderPoint          DECIMAL(12,2),
  parLevel              DECIMAL(12,2),
  lastCountDate         DATE,
  lastReceiveDate       DATE,
  averageDailyUsage     DECIMAL(10,2),
  acquisitionCost       DECIMAL(12,4),
  primaryWholesaler     VARCHAR(50),
  binLocation           VARCHAR(50),
  expirationDate        DATE,
  lotNumber             VARCHAR(50),
  createdAt             TIMESTAMP DEFAULT NOW(),
  updatedAt             TIMESTAMP DEFAULT NOW(),
  UNIQUE(pharmacyId, ndc, lotNumber)
);

-- CONTROLLED_SUBSTANCE_LOG TABLE
CREATE TABLE ControlledSubstanceLog (
  id                    UUID PRIMARY KEY,
  pharmacyId            UUID REFERENCES Pharmacy(id),
  ndc                   VARCHAR(11) NOT NULL,
  transactionType       VARCHAR(20) NOT NULL, -- 'receive', 'dispense', 'return', 'destroy', 'theft', 'adjustment'
  transactionDate       TIMESTAMP DEFAULT NOW(),
  quantity              DECIMAL(10,2) NOT NULL,
  runningBalance        DECIMAL(10,2) NOT NULL,
  referenceId           UUID, -- fillId, orderId, etc.
  referenceType         VARCHAR(20),
  invoiceNumber         VARCHAR(50),
  supplierDeaNumber     VARCHAR(15),
  csosOrderId           VARCHAR(50),
  witnessUserId         UUID REFERENCES User(id), -- for destructions
  notes                 TEXT,
  userId                UUID REFERENCES User(id),
  createdAt             TIMESTAMP DEFAULT NOW()
);

-- AUDIT_LOG TABLE
CREATE TABLE AuditLog (
  id                    UUID PRIMARY KEY,
  tableName             VARCHAR(100) NOT NULL,
  recordId              UUID NOT NULL,
  action                VARCHAR(20) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE', 'VIEW'
  oldValues             JSONB,
  newValues             JSONB,
  userId                UUID REFERENCES User(id),
  userIpAddress         INET,
  userAgent             TEXT,
  timestamp             TIMESTAMP DEFAULT NOW(),
  phiAccessed           BOOLEAN DEFAULT FALSE,
  reasonForAccess       TEXT
);
```

### 4.3 Technology Stack Recommendations

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Database** | PostgreSQL | HIPAA compliance, JSON support, reliability |
| **Cache** | Redis | Session management, real-time queues |
| **Search** | Elasticsearch | Drug search, patient lookup |
| **Message Queue** | RabbitMQ/Kafka | Async processing, claims |
| **API** | tRPC / REST | Type-safe, real-time |
| **Frontend** | Next.js / React | SSR, modern UX |
| **Mobile** | React Native | iOS/Android apps |

---

## 5. Hardware & Equipment

### 5.1 Essential Hardware

| Equipment | Purpose | Examples/Specs |
|-----------|---------|----------------|
| **Workstations** | Rx processing, data entry | Medical-grade PCs, dual monitors |
| **Barcode Scanners** | NDC verification, inventory | Datalogic Gryphon 4500 2D |
| **Label Printers** | Rx labels, auxiliary labels | Zebra ZD420, Dymo |
| **Receipt Printers** | POS receipts | Epson TM-T88 |
| **Pill Counters** | Automated counting | Kirby Lester KL1Plus, Eyecon |
| **Cash Drawers** | POS operations | APG Series 4000 |
| **Signature Pads** | Electronic signatures | Topaz T-S460 |
| **Payment Terminals** | Credit/debit/FSA/HSA | Ingenico, Verifone |
| **Document Scanners** | Hard copy Rx digitization | Fujitsu fi-7160 |
| **Refrigerators** | Cold chain storage (2-8°C) | Pharmacy-grade with monitoring |
| **Safe/Vault** | Schedule II storage | DEA-compliant safe |

### 5.2 Automation Equipment

| Equipment | Purpose | Investment Level |
|-----------|---------|------------------|
| **Automated Dispensing Cabinets (ADC)** | High-volume dispensing | $50K-150K |
| **Robotic Dispensing** | Fully automated filling | $200K-500K |
| **Blister Packaging Machines** | LTC unit-dose | $20K-100K |
| **Will Call Bins (Automated)** | Prescription storage | $10K-50K |
| **Tube Systems** | Hospital pharmacy | $50K+ |

### 5.3 Network Requirements

```
┌─────────────────────────────────────────────────────────────────────┐
│                     NETWORK INFRASTRUCTURE                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Primary Internet ─────┐                                            │
│  (100+ Mbps fiber)     │                                            │
│                        ▼                                            │
│                   ┌─────────┐     ┌─────────────┐                  │
│  Backup Internet ─│ ROUTER/ │─────│  FIREWALL   │                  │
│  (LTE/5G hotspot) │  MODEM  │     │ (HIPAA-grade)│                  │
│                   └─────────┘     └─────────────┘                  │
│                                          │                          │
│                                          ▼                          │
│                                   ┌─────────────┐                  │
│                                   │   SWITCH    │                  │
│                                   │  (managed)  │                  │
│                                   └─────────────┘                  │
│                                          │                          │
│               ┌──────────────────────────┼──────────────────────┐  │
│               │                          │                      │  │
│               ▼                          ▼                      ▼  │
│        ┌───────────┐             ┌───────────┐           ┌────────┐│
│        │Workstation│             │  Printers │           │ Wi-Fi  ││
│        │    VLANs  │             │    VLAN   │           │ (guest)││
│        └───────────┘             └───────────┘           └────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6. E-Prescribing Integration

### 6.1 Surescripts Network

**Certification Requirements:**
- Surescripts network certification
- DEA third-party audit for EPCS
- NCPDP SCRIPT standard compliance (v2017071, v2022011)

**Transaction Types:**
| Code | Transaction | Description |
|------|-------------|-------------|
| **NewRx** | New Prescription | Electronic prescription transmission |
| **RxRenewal** | Refill Request | Pharmacy-initiated renewal |
| **RxChange** | Change Request | Generic substitution, therapeutic alt |
| **RxFill** | Fill Notification | Fill status to prescriber |
| **CancelRx** | Cancel Request | Prescription cancellation |
| **RxTransfer** | Transfer | Pharmacy-to-pharmacy transfer |

### 6.2 EPCS Requirements (Electronic Prescribing for Controlled Substances)

**DEA Compliance:**
- Identity proofing of prescribers
- Two-factor authentication
- Third-party audit certification
- Logical access controls
- Digital signatures

**State Mandates (as of 2024):**
Most states now mandate EPCS for controlled substances. Check state-specific requirements.

### 6.3 Integration Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   EHR/PRESCRIBER│     │   SURESCRIPTS   │     │    PHARMACY     │
│     SYSTEM      │────>│     NETWORK     │────>│      PMS        │
│                 │     │                 │     │                 │
│ - NewRx         │     │ - Routing       │     │ - Queue receipt │
│ - EPCS          │     │ - Validation    │     │ - DUR checks    │
│ - CancelRx      │     │ - Message queue │     │ - Processing    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        ▲                                               │
        │                                               │
        └───────────────────────────────────────────────┘
                    (RxRenewal, RxChange, RxFill)
```

---

## 7. Fax Systems

### 7.1 HIPAA-Compliant eFax Solutions

| Provider | Features | Compliance |
|----------|----------|------------|
| **eFax/eFax Protect** | AES-256 encryption, TLS | HIPAA BAA available |
| **Documo** | OCR, AI data extraction, SOC 2 Type II | HIPAA compliant |
| **SRFax** | PGP encryption, healthcare focus | HIPAA compliant |
| **Notifyre** | ISO 27001, audit trails | HIPAA compliant |
| **DocVilla** | EHR integrated | HIPAA compliant |

### 7.2 Requirements

**Core Features:**
- AES-256 encryption at rest
- TLS encryption in transit
- Business Associate Agreement (BAA)
- Audit trail logging
- Role-based access control
- Automatic OCR for data extraction
- Integration with PMS

**Workflow Integration:**
```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  INCOMING │     │   eFax    │     │    OCR    │     │   PMS     │
│    FAX    │────>│  SERVICE  │────>│ EXTRACTION│────>│   QUEUE   │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
                                           │
                                           ▼
                                    ┌───────────┐
                                    │  PARSED   │
                                    │ Rx DATA   │
                                    │ (review)  │
                                    └───────────┘
```

---

## 8. Point of Sale & Payments

### 8.1 POS System Requirements

**Core Functions:**
- Prescription checkout (copay collection)
- OTC product sales
- Split payment capability
- Return processing
- Cash management
- End-of-day reconciliation

**Payment Methods:**
| Type | Requirements |
|------|--------------|
| **Cash** | Cash drawer integration |
| **Credit/Debit** | PCI DSS compliant terminal |
| **FSA/HSA** | SIGIS certification, IIAS compliance |
| **Apple Pay/Google Pay** | NFC terminal |
| **Checks** | Check verification service |
| **Patient Accounts** | Charge to account |

### 8.2 SIGIS/IIAS Compliance

For FSA/HSA card acceptance:
- Register pharmacy with SIGIS
- Use SIGIS-certified POS software
- IIAS (Inventory Information Approval System) compliance
- Auto-substantiation of eligible items

### 8.3 PCI DSS Requirements

- Point-to-point encryption (P2PE)
- Tokenization of card data
- Secure network segmentation
- Regular security assessments
- No storage of full card numbers

### 8.4 Electronic Signature Capture

**Requirements:**
- HIPAA compliance for signature storage
- FDA 21 CFR Part 11 compliance
- DEA requirements for controlled substances
- Timestamp and audit trail
- Patient acknowledgment capture

---

## 9. Insurance & PBM Integration

### 9.1 Claims Adjudication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    REAL-TIME CLAIMS ADJUDICATION                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐   │
│  │PHARMACY│───>│ SWITCH │───>│  PBM   │───>│ HEALTH │───>│RESPONSE│   │
│  │  PMS   │    │ VENDOR │    │        │    │  PLAN  │    │        │   │
│  └────────┘    └────────┘    └────────┘    └────────┘    └────────┘   │
│                                                                          │
│  NCPDP B1 Claim Request ────────────────────────────────────────>       │
│  <─────────────────────────────────── Claim Response (2-5 seconds)      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 9.2 NCPDP Standards

**Telecommunication Standard:**
- Version D.0 (current)
- Segment-based message format
- Transaction types: B1 (billing), B2 (reversal), B3 (rebill)

**Key Data Elements:**
| Field | Description |
|-------|-------------|
| **BIN** | Bank Identification Number (6 digits) |
| **PCN** | Processor Control Number |
| **Group** | Group/Plan identifier |
| **Member ID** | Patient insurance ID |
| **Person Code** | Relationship to cardholder |
| **NDC** | National Drug Code |
| **Qty** | Quantity dispensed |
| **Days Supply** | Days of therapy |
| **DAW** | Dispense As Written code |
| **SCC** | Submission Clarification Code |

### 9.3 Common Reject Codes

| Code | Description | Resolution |
|------|-------------|------------|
| **70** | Product not covered | Prior auth or formulary alternative |
| **75** | Prior authorization required | Submit PA request |
| **76** | Plan limits exceeded | Wait or override |
| **79** | Refill too soon | Wait or emergency override |
| **88** | DUR reject | Clinical override with reason |
| **MR** | M/I Prescriber ID | Verify NPI |
| **7** | M/I Cardholder ID | Verify member ID |

### 9.4 Prior Authorization Workflow

```
┌─────────────────────────────────────────────────────────────────────┐
│                  PRIOR AUTHORIZATION WORKFLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Claim Rejected (PA Required)                                    │
│           │                                                          │
│           ▼                                                          │
│  2. Initiate PA Request ──────────> Electronic PA (ePA) or Fax     │
│           │                                                          │
│           ▼                                                          │
│  3. Clinical Documentation ──────> Diagnosis, prior trials, labs   │
│           │                                                          │
│           ▼                                                          │
│  4. PBM Review (24-72 hours)                                        │
│           │                                                          │
│     ┌─────┴─────┐                                                   │
│     ▼           ▼                                                   │
│  APPROVED    DENIED ──────> Appeal process                          │
│     │                                                                │
│     ▼                                                                │
│  5. PA Number entered ──────> Resubmit claim                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 9.5 340B Program

**Requirements:**
- Covered entity registration
- Contract pharmacy agreements
- Submission Clarification Code (SCC) = 20
- Separate inventory or virtual inventory tracking
- Compliance audits
- Prevent duplicate discounts

---

## 10. Inventory Management

### 10.1 NDC-Based Tracking

**NDC Format:**
```
NDC: 12345-6789-01
      │     │    │
      │     │    └── Package Code (2 digits)
      │     └─────── Product Code (4 digits)
      └───────────── Labeler Code (5 digits)
```

### 10.2 Inventory Operations

| Operation | Description |
|-----------|-------------|
| **Receiving** | Scan invoice, verify quantity, update QOH |
| **Dispensing** | Automatic decrement on fill verification |
| **Returns** | Reverse distribution, 222 forms for CII |
| **Cycle Counts** | Periodic physical counts |
| **Biennial Inventory** | DEA-required controlled substance count |
| **Adjustments** | Corrections with documentation |
| **Transfers** | Between pharmacy locations |

### 10.3 Wholesaler Integration

**Primary Wholesalers:**
- Cardinal Health
- McKesson
- AmerisourceBergen

**Integration Features:**
- EDI 850 (Purchase Order)
- EDI 855 (Order Acknowledgment)
- EDI 856 (Advance Ship Notice)
- EDI 810 (Invoice)
- Real-time availability check
- Price file updates

### 10.4 Automated Reordering

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTOMATED REORDER WORKFLOW                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Current QOH ─────> Compare to Reorder Point                        │
│                              │                                       │
│                     ┌────────┴────────┐                             │
│                     │                 │                              │
│                     ▼                 ▼                              │
│              QOH >= Reorder     QOH < Reorder                       │
│              (No action)              │                              │
│                                       ▼                              │
│                              Calculate Order Qty                     │
│                              (Par Level - QOH)                       │
│                                       │                              │
│                                       ▼                              │
│                              Add to Order Queue                      │
│                                       │                              │
│                                       ▼                              │
│                              Buyer Review/Approve                    │
│                                       │                              │
│                                       ▼                              │
│                              Transmit EDI 850                        │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 10.5 DSCSA Compliance

**Drug Supply Chain Security Act Requirements:**
- Transaction information (TI)
- Transaction history (TH)
- Transaction statement (TS)
- Product verification
- Suspect/illegitimate product handling
- Serialization tracking

---

## 11. Controlled Substances Management

### 11.1 DEA Schedule Classifications

| Schedule | Description | Examples | Refills |
|----------|-------------|----------|---------|
| **I** | No accepted medical use | Heroin, LSD | N/A |
| **II** | High abuse potential | Oxycodone, Adderall | 0 |
| **III** | Moderate abuse potential | Tylenol w/Codeine | 5 in 6 months |
| **IV** | Lower abuse potential | Alprazolam, Tramadol | 5 in 6 months |
| **V** | Lowest abuse potential | Promethazine w/Codeine | 5 in 6 months |

### 11.2 CSOS (Controlled Substance Ordering System)

**Electronic Ordering Requirements:**
- DEA CSOS digital certificate
- CSOS Coordinator appointment
- Certificate renewal (matches DEA registration)
- 48-hour reporting to ARCOS

**Paper DEA Form 222 (Alternative):**
- Triplicate form for Schedule II
- Manual submission

### 11.3 Perpetual Inventory

```typescript
interface ControlledSubstanceTransaction {
  transactionId: string;
  ndc: string;
  transactionType: 'RECEIVE' | 'DISPENSE' | 'RETURN' | 'DESTROY' | 'THEFT' | 'ADJUST';
  quantity: number;
  runningBalance: number;
  referenceNumber: string; // Rx#, Invoice#, etc.
  supplierDEA?: string;
  patientId?: string;
  prescriberId?: string;
  witnessId?: string; // For destructions
  timestamp: Date;
  userId: string;
  notes?: string;
}
```

### 11.4 Biennial Inventory Requirements

- Complete inventory every 2 years
- Exact count for Schedule II
- Estimated count for III-V (unless >1000 units)
- Record date and time
- Maintain for 2 years

### 11.5 Emergency Kit (LTC)

For long-term care facilities:
- Pre-stocked controlled substances
- Extension of pharmacy DEA registration
- Documented access and usage
- Regular audits

---

## 12. Workflow & Queue Management

### 12.1 Prescription Workflow States

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PRESCRIPTION WORKFLOW QUEUE                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────┐                                                            │
│  │ INTAKE  │ ─── New Rx received (e-Rx, fax, phone, walk-in)           │
│  └────┬────┘                                                            │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────┐                                                            │
│  │  DATA   │ ─── Technician enters/verifies patient, drug, insurance   │
│  │  ENTRY  │                                                            │
│  └────┬────┘                                                            │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────┐     ┌─────────┐                                           │
│  │INSURANCE│────>│ REJECT  │ ─── PA needed, coverage issues            │
│  │ BILLING │     │  QUEUE  │                                           │
│  └────┬────┘     └─────────┘                                           │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────┐     ┌─────────┐                                           │
│  │   DUR   │────>│  DUR    │ ─── Interactions, allergies, overrides    │
│  │  CHECK  │     │  HOLD   │                                           │
│  └────┬────┘     └─────────┘                                           │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────┐                                                            │
│  │  FILL   │ ─── Technician fills, scans NDC, counts                   │
│  │         │                                                            │
│  └────┬────┘                                                            │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────┐                                                            │
│  │ VERIFY  │ ─── Pharmacist verifies drug, quantity, label             │
│  │  (RPH)  │                                                            │
│  └────┬────┘                                                            │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────┐                                                            │
│  │  READY  │ ─── Bagged, stored in will-call/bin                       │
│  │         │                                                            │
│  └────┬────┘                                                            │
│       │                                                                  │
│       ▼                                                                  │
│  ┌─────────┐                                                            │
│  │ SOLD/   │ ─── Patient pickup, counseling, payment                   │
│  │DELIVERED│                                                            │
│  └─────────┘                                                            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.2 Queue Dashboard Features

**Visual Indicators:**
- Color-coded priority (green/yellow/red based on wait time)
- Patient promise time countdown
- High-alert medication flags
- Controlled substance indicators
- Insurance issue indicators

**Metrics Displayed:**
- Prescriptions per queue
- Average wait time
- Overdue prescriptions
- Pharmacist verification backlog

### 12.3 Patient Notifications

| Event | Notification |
|-------|--------------|
| Rx Ready | SMS/Email/App push |
| Refill Reminder | 3-5 days before due |
| Rx Expired | 30 days before expiration |
| Auto-Refill Processed | Confirmation |
| Delivery Shipped | Tracking link |
| Pickup Reminder | If not picked up in 3 days |

---

## 13. Multi-Location & Central Fill

### 13.1 Hub and Spoke Model

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       HUB AND SPOKE ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                        ┌─────────────────────┐                          │
│                        │     CENTRAL HUB     │                          │
│                        │                     │                          │
│                        │ • High-volume fills │                          │
│                        │ • Automation        │                          │
│                        │ • Bulk inventory    │                          │
│                        │ • 50%+ maintenance  │                          │
│                        │   Rx processing     │                          │
│                        └──────────┬──────────┘                          │
│                                   │                                      │
│           ┌───────────────────────┼───────────────────────┐             │
│           │                       │                       │             │
│           ▼                       ▼                       ▼             │
│   ┌───────────────┐      ┌───────────────┐      ┌───────────────┐      │
│   │   SPOKE #1    │      │   SPOKE #2    │      │   SPOKE #3    │      │
│   │               │      │               │      │               │      │
│   │ • New Rx      │      │ • New Rx      │      │ • New Rx      │      │
│   │ • Acute fills │      │ • Acute fills │      │ • Acute fills │      │
│   │ • Counseling  │      │ • Counseling  │      │ • Counseling  │      │
│   │ • Pickup/POS  │      │ • Pickup/POS  │      │ • Pickup/POS  │      │
│   │ • Clinical    │      │ • Clinical    │      │ • Clinical    │      │
│   └───────────────┘      └───────────────┘      └───────────────┘      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 13.2 Multi-Location Features

**Shared Services:**
- Centralized patient profiles
- Cross-store refill access
- Inventory visibility across locations
- Centralized reporting
- Shared formulary management

**Location-Specific:**
- Local inventory management
- Store-specific pricing
- Individual DEA registration
- Local staff management
- Facility-specific workflows (LTC vs retail)

### 13.3 Group/Enterprise Management

**For Pharmacy Groups Serving Multiple Institutions:**

```typescript
interface PharmacyGroup {
  groupId: string;
  groupName: string;
  pharmacies: Pharmacy[];
  facilities: Facility[]; // Hospice, Rehab, SNF, etc.

  // Shared configuration
  formulary: Formulary;
  insuranceContracts: InsuranceContract[];
  wholesalerAccounts: WholesalerAccount[];

  // Centralized services
  centralFillEnabled: boolean;
  sharedInventory: boolean;
  consolidatedReporting: boolean;
}

interface FacilityContract {
  facilityId: string;
  pharmacyId: string; // Assigned pharmacy
  contractType: 'exclusive' | 'non-exclusive';
  services: string[]; // 'dispensing', 'consulting', 'IV', 'compounding'
  deliverySchedule: DeliverySchedule;
  billingTerms: BillingTerms;
  startDate: Date;
  renewalDate: Date;
}
```

---

## 14. Specialty Pharmacy

### 14.1 Accreditation Requirements

**URAC Specialty Pharmacy Accreditation:**
- 40+ standards across 9 areas
- Core requirements: risk management, operations, quality improvement
- Valid for 3 years
- 6-month certification process

**ACHC Accreditation:**
- 6-step process with on-site survey
- Surveys by licensed pharmacists
- 3-year accreditation cycle
- Annual standard updates

### 14.2 Specialty Pharmacy Features

| Capability | Description |
|------------|-------------|
| **Prior Authorization** | Automated PA initiation and tracking |
| **Benefits Investigation** | Insurance verification and copay assistance |
| **Patient Onboarding** | Welcome calls, education, enrollment |
| **Refill Management** | Proactive outreach, adherence monitoring |
| **Clinical Programs** | Disease-state management |
| **Cold Chain** | Temperature monitoring and shipping |
| **Hub Services** | Manufacturer program integration |
| **REMS Programs** | Risk management compliance |

### 14.3 High-Touch Patient Management

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SPECIALTY PATIENT JOURNEY                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. INTAKE ──────────> Prescription received, triage                    │
│        │                                                                 │
│        ▼                                                                 │
│  2. BENEFITS ────────> Insurance verification, PA submission            │
│     INVESTIGATION      Copay assistance enrollment                      │
│        │                                                                 │
│        ▼                                                                 │
│  3. CLINICAL ────────> Pharmacist assessment, drug interactions         │
│     REVIEW             Therapy appropriateness                          │
│        │                                                                 │
│        ▼                                                                 │
│  4. PATIENT ─────────> Welcome call, education, consent                 │
│     ONBOARDING         Administration training (if injectable)          │
│        │                                                                 │
│        ▼                                                                 │
│  5. DISPENSING ──────> Fill, ship (cold chain if needed)               │
│        │                                                                 │
│        ▼                                                                 │
│  6. ONGOING ─────────> Refill coordination, adherence calls            │
│     MANAGEMENT         Side effect monitoring, outcomes tracking        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Compounding Pharmacy

### 15.1 503A vs 503B Comparison

| Aspect | 503A | 503B |
|--------|------|------|
| **Regulation** | State Board of Pharmacy | FDA |
| **Batch Size** | Patient-specific | Large batches |
| **Prescription** | Required | Not required |
| **cGMP** | Not required | Required |
| **Distribution** | In-state primarily | Nationwide |
| **USP Compliance** | Required | Required |

### 15.2 USP Chapter Compliance

**USP <795> - Non-Sterile Compounding:**
- Facility requirements
- Personnel training and garbing
- Component quality
- Master formulation records
- Compounding records
- Beyond-use dating

**USP <797> - Sterile Compounding:**
- ISO Class 5 primary engineering control
- ISO Class 7 buffer and ante areas
- Environmental monitoring (every 6 months)
- Personnel certification
- Media fill testing
- Beyond-use dating (BUD) calculations

**USP <800> - Hazardous Drugs:**
- Hazardous drug list
- Engineering controls (negative pressure)
- Personal protective equipment
- Decontamination procedures
- Medical surveillance

### 15.3 Compounding Module Features

```typescript
interface CompoundFormulation {
  formulationId: string;
  name: string;
  type: 'sterile' | 'non-sterile';
  hazardous: boolean;

  // Components
  ingredients: {
    componentId: string;
    quantity: number;
    unit: string;
    lotNumber: string;
    expirationDate: Date;
  }[];

  // Instructions
  preparationSteps: string[];
  equipmentRequired: string[];
  qualityChecks: string[];

  // Dating
  beyondUseDate: number; // days
  storageConditions: string;

  // Documentation
  masterFormulaRecord: string;
  compoundingRecord: string;
}
```

---

## 16. Clinical Services

### 16.1 Medication Therapy Management (MTM)

**Services:**
- Comprehensive Medication Review (CMR)
- Targeted Intervention Programs (TIP)
- Medication reconciliation
- Adherence counseling
- Disease state management

**Documentation Requirements:**
- Collaborative Practice Agreement (CPA)
- Medicaid/Medicare billing codes
- Outcome documentation

### 16.2 Immunization Services

**Requirements:**
- Pharmacist immunization certification (APhA)
- State protocol/standing orders
- Vaccine storage and handling (CDC guidelines)
- VFC program (pediatric vaccines)
- Reporting to immunization registries

**Technician Administration (PREP Act):**
- Supervision by qualified pharmacist
- Patients 3 years and older
- Certain immunizations only
- State-specific rules may apply

### 16.3 Point-of-Care Testing (POCT)

**CLIA Waiver Requirements:**
- Certificate of Waiver application
- Approved waived tests only
- Standard operating procedures
- Quality assurance program
- Staff training documentation

**Common Tests:**
| Test | Turnaround |
|------|------------|
| Influenza A/B | 15 minutes |
| Strep A | 5 minutes |
| COVID-19 | 15-30 minutes |
| A1c | 5 minutes |
| Lipid Panel | 5 minutes |
| INR | 1 minute |
| HIV | 20 minutes |

---

## 17. Delivery Services

### 17.1 Delivery Options

| Method | Timeline | Use Case |
|--------|----------|----------|
| **In-Store Pickup** | Same day | Standard |
| **Drive-Through** | Same day | Convenience |
| **Local Delivery** | Same day | Limited mobility |
| **Courier (Same-Day)** | 2-4 hours | Urgent |
| **Mail Order** | 3-5 days | Maintenance meds |
| **Overnight Shipping** | Next day | Cold chain, urgent |

### 17.2 Cold Chain Requirements

**Temperature Ranges:**
- Refrigerated: 2-8°C (36-46°F)
- Frozen: -25 to -10°C
- Controlled room temp: 20-25°C

**Packaging:**
- Insulated containers
- Gel packs (tested for 60+ hours)
- Temperature monitors
- Light-blocking materials

### 17.3 Third-Party Delivery Partners

- DoorDash
- Instacart
- Shipt
- ScriptDrop
- Local courier services

**Controlled Substance Delivery:**
Most states restrict delivery of Schedule II controlled substances. Verify state-specific regulations.

---

## 18. Staffing & Roles

### 18.1 Pharmacist-to-Technician Ratios

| State | Ratio | Notes |
|-------|-------|-------|
| California | 1:2 (inpatient) | Varies by setting |
| Texas | 1:6 | Max 3 trainees |
| New York | 1:4 max | 2 licensed + 2 unlicensed |
| New Jersey | 1:2 base | Higher with certification |
| Virginia | 1:6 (cannabis) | Setting-specific |

### 18.2 Role Definitions

**Pharmacist (RPH/PharmD):**
- Final verification of all prescriptions
- Patient counseling
- Clinical decision making
- DUR override authority
- Immunization administration
- Controlled substance oversight

**Pharmacy Technician:**
- Data entry
- Prescription filling
- Inventory management
- Insurance billing
- Cash register operations
- Immunization administration (where permitted)

**Pharmacy Intern:**
- Pharmacist functions under supervision
- Counseling (with RPH oversight)
- Verification (some states)

**Pharmacy Clerk/Cashier:**
- Front-end sales
- Phone answering
- Filing
- Non-dispensing tasks

### 18.3 Staffing Module Features

```typescript
interface PharmacyStaff {
  userId: string;
  role: 'pharmacist' | 'technician' | 'intern' | 'clerk';

  // Credentials
  licenseNumber: string;
  licenseState: string;
  licenseExpiration: Date;
  certifications: Certification[];
  deaNumber?: string;
  npiNumber?: string;

  // Scheduling
  primaryLocation: string;
  availableLocations: string[];
  schedule: WorkSchedule;

  // Permissions
  canVerify: boolean;
  canOverrideDUR: boolean;
  canDispenseControlled: boolean;
  canAdministerImmunizations: boolean;

  // Training
  trainingRecords: TrainingRecord[];
  continuingEducation: CERecord[];
}
```

---

## 19. Physical Layout & Design

### 19.1 Space Requirements

| Area | Recommended Size | Purpose |
|------|------------------|---------|
| **Total Pharmacy** | 800-2,000 sq ft | Full operations |
| **Dispensing Area** | 200-400 sq ft | Filling stations |
| **Storage** | 200-400 sq ft | Drug inventory |
| **Consultation Room** | 80-120 sq ft | Private counseling |
| **Refrigerator Area** | 50-100 sq ft | Cold storage |
| **Controlled Substance Vault** | 50-100 sq ft | DEA-compliant |

### 19.2 Layout Zones

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PHARMACY FLOOR PLAN                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    FRONT-END / RETAIL AREA                       │   │
│  │   [OTC Shelves]  [Health & Beauty]  [Medical Supplies]          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────────────────────────────────┐  │
│  │   CONSULTATION  │  │              DROP-OFF COUNTER               │  │
│  │      ROOM       │  │   [Register 1]        [Register 2]          │  │
│  │   (Private)     │  │   Drop-off            Pickup                │  │
│  └─────────────────┘  └─────────────────────────────────────────────┘  │
│                                                                          │
│  ═══════════════════════════════════════════════════════════════════   │
│                          PHARMACY BARRIER                                │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                          │
│  ┌───────────────────────────────────────────────┐  ┌───────────────┐  │
│  │              DISPENSING AREA                   │  │   WILL-CALL   │  │
│  │                                                │  │     BINS      │  │
│  │  [Filling Station 1]  [Filling Station 2]     │  │               │  │
│  │                                                │  │   [A-F]       │  │
│  │  [Counting Tray]      [Label Printer]         │  │   [G-L]       │  │
│  │                                                │  │   [M-R]       │  │
│  │  [Pill Counter]       [Verification Station]  │  │   [S-Z]       │  │
│  └───────────────────────────────────────────────┘  └───────────────┘  │
│                                                                          │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────────────┐  │
│  │  REFRIGERATOR │  │  C-II VAULT   │  │    DRUG STORAGE SHELVES     │  │
│  │    (2-8°C)    │  │  (DEA Safe)   │  │    [Alphabetical NDC]       │  │
│  └───────────────┘  └───────────────┘  └────────────────────────────┘  │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐ │
│  │                    DRIVE-THROUGH WINDOW (Optional)                 │ │
│  └───────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 19.3 Design Best Practices

**Workflow Optimization:**
- Unidirectional prescription flow
- Minimize cross-traffic
- Acoustic panels for noise reduction
- Adequate lighting at verification stations
- Ergonomic workstation heights

**Patient Privacy:**
- Counseling area away from queues
- Privacy screens at pickup
- Sound masking systems
- HIPAA-compliant sight lines

**Security:**
- Controlled access to pharmacy area
- Camera coverage (entrance, vault, registers)
- Emergency exits
- Panic buttons

---

## 20. Reporting & Compliance

### 20.1 Required Reports

| Report | Frequency | Recipient |
|--------|-----------|-----------|
| **ARCOS (C-II)** | 48 hours | DEA |
| **PMP Reporting** | Daily | State PDMP |
| **340B Claims** | Monthly | HRSA |
| **Biennial Inventory** | Every 2 years | Internal/DEA |
| **Quality Metrics** | Quarterly | CMS (Medicare) |
| **DSCSA Transactions** | Per shipment | Trading partners |

### 20.2 Analytics Dashboard

**Operational Metrics:**
- Prescriptions filled per day/hour
- Average wait time
- Fill accuracy rate
- Insurance rejection rate
- Inventory turns

**Clinical Metrics:**
- DUR intervention rate
- Immunizations administered
- MTM completions
- Adherence rates (PDC)

**Financial Metrics:**
- Revenue by category
- Gross margin
- Reimbursement rates
- 340B savings

### 20.3 Audit Trail Requirements

**21 CFR Part 11 / Annex 11 Compliance:**
- Time-stamped record of all changes
- User identification
- Reason for change
- Old and new values
- Immutable storage
- 2-year retention minimum

```typescript
interface AuditRecord {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: string;
  fieldName?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  reasonCode?: string;
  reasonText?: string;
  phiAccessed: boolean;
}
```

---

## 21. Security & HIPAA

### 21.1 HIPAA Requirements

**Administrative Safeguards:**
- Security officer designation
- Workforce training
- Access management
- Incident response procedures
- Business Associate Agreements

**Physical Safeguards:**
- Facility access controls
- Workstation security
- Device and media controls
- Disposal procedures

**Technical Safeguards:**
- Access controls (unique user IDs)
- Audit controls (logging)
- Integrity controls (checksums)
- Transmission security (TLS)
- Encryption (AES-256)

### 21.2 Security Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  NETWORK LAYER                                                          │
│  ├── Firewall (next-gen with IPS/IDS)                                  │
│  ├── Network segmentation (VLANs)                                      │
│  ├── VPN for remote access                                             │
│  └── DDoS protection                                                    │
│                                                                          │
│  APPLICATION LAYER                                                      │
│  ├── WAF (Web Application Firewall)                                    │
│  ├── Input validation                                                   │
│  ├── Output encoding                                                    │
│  ├── CSRF protection                                                    │
│  └── Rate limiting                                                      │
│                                                                          │
│  DATA LAYER                                                             │
│  ├── Encryption at rest (AES-256)                                      │
│  ├── Encryption in transit (TLS 1.3)                                   │
│  ├── Database access controls                                          │
│  ├── Field-level encryption (PHI)                                      │
│  └── Secure key management                                             │
│                                                                          │
│  IDENTITY LAYER                                                         │
│  ├── Multi-factor authentication                                       │
│  ├── Role-based access control                                         │
│  ├── Session management                                                │
│  ├── Password policies                                                 │
│  └── Single Sign-On (optional)                                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 21.3 Access Control Matrix

| Role | Patient Data | Prescriptions | Controlled Subs | Reports | Admin |
|------|--------------|---------------|-----------------|---------|-------|
| **Pharmacist** | Full | Full | Full | Full | Limited |
| **Technician** | Read/Update | Create/Read | Read | Limited | None |
| **Intern** | Read/Update | Create/Read | Read (w/RPH) | Limited | None |
| **Clerk** | Limited | Read only | None | None | None |
| **Admin** | Audit only | Audit only | Audit only | Full | Full |

---

## 22. Implementation Phases

> **Implementation Status:** MedsCab package implemented with 266 tests (January 2026)

### Phase 1: Foundation (Months 1-3)

**Core Modules:**
- [x] Database schema design and implementation ✅ (Prisma schema)
- [x] User authentication and authorization ✅ (NextAuth.js)
- [x] Patient management module ✅ (FHIR-based)
- [x] Drug database (NDC) integration ✅ (`medscab/inventory`)
- [x] Basic prescription entry ✅ (`medscab/fill`)

**Infrastructure:**
- [x] Development environment setup ✅
- [x] CI/CD pipeline ✅ (Turborepo)
- [x] Security baseline ✅ (HIPAA compliance package)

### Phase 2: Prescription Processing (Months 4-6)

**Features:**
- [x] Full prescription workflow ✅ (`medscab/workflow`)
- [ ] DUR/clinical decision support (partial - types defined)
- [ ] Label printing
- [x] Queue management ✅ (`medscab/workflow`)
- [x] Pharmacist verification ✅ (`medscab/fill`)

### Phase 3: Billing & Insurance (Months 7-9)

**Features:**
- [x] NCPDP claims transmission ✅ (`medscab/claims`)
- [x] Real-time adjudication ✅ (`medscab/claims`)
- [x] Reject handling ✅ (`medscab/claims` - REJECT_CODES, parseRejectCodes)
- [ ] Prior authorization workflow
- [ ] POS integration

### Phase 4: E-Prescribing & Fax (Months 10-11)

**Features:**
- [ ] Surescripts certification
- [ ] EPCS compliance
- [ ] eFax integration
- [ ] Inbound Rx processing

### Phase 5: Inventory & Controlled Substances (Month 12)

**Features:**
- [x] Inventory management ✅ (`medscab/inventory`)
- [ ] Wholesaler EDI (types defined: WHOLESALERS constant)
- [x] CSOS integration ✅ (`medscab/controlled-substances`)
- [x] Perpetual inventory for CS ✅ (`medscab/controlled-substances`)
- [ ] PDMP reporting

### Phase 6: Advanced Features (Months 13-15)

**Features:**
- [ ] Multi-location support
- [ ] Central fill integration
- [x] LTC/facility module ✅ (`medscab/ltc-facility`)
- [ ] Specialty pharmacy module
- [ ] Clinical services (MTM, immunizations)

### Phase 7: Optimization (Months 16-18)

**Features:**
- [ ] Analytics and reporting
- [ ] Mobile applications
- [ ] Patient portal
- [ ] Automation integrations
- [ ] Performance optimization

### MedsCab Package Summary

| Module | File | Tests | Status |
|--------|------|-------|--------|
| Claims Processing | `claims.ts` | 25 | ✅ Complete |
| Inventory Management | `inventory.ts` | 45 | ✅ Complete |
| Controlled Substances | `controlled-substances.ts` | 39 | ✅ Complete |
| Workflow & Queue | `workflow.ts` | 42 | ✅ Complete |
| LTC Facility | `ltc-facility.ts` | 26 | ✅ Complete |
| Prescription Fill | `fill.ts` | 45 | ✅ Complete |
| Drug Interactions | `drug-interactions.ts` | 28 | ✅ Complete |
| Sig Codes | `sig-codes.ts` | 16 | ✅ Complete |
| **Total** | **8 modules** | **266** | ✅ **Complete** |

---

## Sources & References

### Retail Pharmacy Systems
- [Pharmacy Management Systems Guide - IntuitionLabs](https://intuitionlabs.ai/articles/pharmacy-management-systems-guide)
- [CVS RxConnect & Walgreens Intercom Plus - PharmacyFreak](https://pharmacyfreak.com/us-pharmacy-software-a-guide-to-rxconnect-cvs-and-intercom-plus-walgreens-the-software-systems-youll-have-to-master/)
- [CVS Tech-Enabled Pharmacy - CVS Health](https://www.cvshealth.com/news/pharmacy/a-tech-enabled-pharmacy-experience-powered-by-people.html)

### Database Architecture
- [Pharmacy Management System Development - Cleveroad](https://www.cleveroad.com/blog/how-to-create-pharmacy-management-system/)
- [Pharmacy Database Design - OSP Labs](https://www.osplabs.com/insights/a-complete-guide-to-pharmacy-management-system-development/)

### Long-Term Care Pharmacy
- [LTC Pharmacy Primer - CMS](https://www.cms.gov/Research-Statistics-Data-and-Systems/Statistics-Trends-and-Reports/Reports/downloads/lewingroup.pdf)
- [LTC Pharmacies - Senior Care Pharmacy Coalition](https://seniorcarepharmacies.org/ltc-pharmacies/)
- [ASHP Guidelines on Palliative Care](https://www.ashp.org/-/media/assets/policy-guidelines/docs/guidelines/pharmacists-roles-palliative-hospice-care.pdf)

### Insurance & PBM
- [Pharmacy Claims Adjudication - Xevant](https://www.xevant.com/glossary/pharmacy-claims-adjudication-process/)
- [Medicare Part D COB Process - NCPDP](https://www.ncpdp.org/NCPDP/media/pdf/WhitePaper/OverviewMedicarePartDPrescriptionDrugCOBProcess.pdf)
- [LTC Pharmacy Billing - Etactics](https://etactics.com/blog/long-term-care-pharmacy-billing)

### Equipment & Hardware
- [Essential Hospital Pharmacy Equipment - Cybernet](https://www.cybernetman.com/blog/essential-hospital-pharmacy-equipment-list/)
- [Hardware for Pharmacy Software - Pharmacy Software Reviews](https://www.pharmacysoftwarereviews.com/blog/10-pieces-of-hardware-to-supplement-your-pharmacy-software)
- [Pharmacy Automation - Zebra](https://www.zebra.com/us/en/industry/healthcare/use-case/pharmacy-automation.html)

### E-Prescribing
- [E-Prescribing - Surescripts](https://surescripts.com/what-we-do/e-prescribing)
- [EPCS Requirements - Surescripts](https://surescripts.com/what-we-do/e-prescribing-for-controlled-substances)
- [E-Prescribing Standards - CMS](https://www.cms.gov/medicare/regulations-guidance/electronic-prescribing/adopted-standard-and-transactions)
- [EPCS Mandates - RXNT](https://www.rxnt.com/epcs-mandates/)

### Fax Systems
- [HIPAA Compliant Fax - eFax](https://www.efax.com/hipaa-compliance)
- [Pharmacy Online Fax - Notifyre](https://notifyre.com/us/online-fax/pharmacies)
- [HIPAA Faxing Guide - Emitrr](https://emitrr.com/blog/hipaa-compliant-faxing/)

### POS Systems
- [Pharmacy POS Requirements - Datascan](https://datascanpharmacy.com/5-things-you-need-in-your-pharmacy-point-of-sale-system-pos-2021/)
- [Pharmacy POS Features - CLO Touch](https://clotouch.com/blog/learn-7-key-features-pharmacy-pos-system-bbb/)
- [Picking POS Systems - Heartland](https://www.heartland.us/resources/blog/how-to-pick-the-right-pos-system-for-your-pharmacy)

### Multi-Location & Central Fill
- [Central Fill Pharmacies - Capsa Healthcare](https://www.capsahealthcare.com/blog/central-fill-pharmacy/the-rapid-expansion-of-central-filling-mail-order-pharmacies/)
- [Hub and Spoke Dispensing - Digital Health](https://www.digitalhealth.net/2024/08/software-powers-hub-and-spoke-dispensing-at-pharmacy-group/)
- [Centralized Pharmacy Models - Parata](https://parata.com/why-pharmacies-should-consider-centralized-operating-models-to-strengthen-the-pharmacy-care-supply-chain/)

### Inventory Management
- [NDC Inventory Management - RxERP](https://rxerp.com/2025/10/02/best-ndc-inventory-management/)
- [Pharmacy Procurement APIs - CoderXIO](https://coderxio.substack.com/p/modernizing-pharmacy-drug-procurement)
- [Inventory Management Role - Drug Topics](https://www.drugtopics.com/view/inventory-management-is-not-just-for-pharmacists-the-growing-role-of-the-pharmacy-tech)

### Controlled Substances
- [CSOS FAQ - DEA](https://www.deadiversion.usdoj.gov/drugreg/csos/csos-faq.html)
- [Controlled Substances Ordering - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3875106/)
- [DEA CSOS Portal](https://www.deaecom.gov/)

### Specialty Pharmacy
- [URAC Specialty Accreditation](https://www.urac.org/accreditation-cert/specialty-pharmacy/)
- [Specialty Accreditations Guide - Pharmacy Times](https://www.pharmacytimes.com/view/specialty-pharmacy-accreditations-the-big-three)
- [ACHC Pharmacy Accreditation](https://achc.org/pharmacy/)

### Compounding
- [USP Compliant 503A Pharmacy - MediveraRx](https://mediverarx.com/usp-compliant-503a-compounding-pharmacy/)
- [503A vs 503B Guide - FDA Group](https://www.thefdagroup.com/blog/503a-vs-503b-compounding-pharmacies)
- [USP Compounding Standards - USP](https://www.usp.org/compounding/legal-considerations)

### Clinical Services
- [POCT in Pharmacy - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC5990194/)
- [Technician Immunizations - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC8590632/)
- [NASPA POCT Certificate](https://naspa.us/naspa-pharmacy-based-point-of-care-test-treat-certificate-program-registration/)

### Delivery Services
- [CVS Same-Day Delivery](https://www.cvs.com/content/same-day-delivery)
- [Walgreens Prescription Delivery](https://www.walgreens.com/topic/pharmacy/prescription-delivery.jsp)
- [FedEx Pharmaceutical Shipping](https://www.fedex.com/en-us/healthcare/pharmaceutical-supply-chain-and-shipping-services.html)

### Staffing
- [Pharmacist-Technician Ratios - Wikipedia](https://en.wikipedia.org/wiki/Pharmacist-to-pharmacy_technician_ratio)
- [California Staffing Law - Quarles](https://www.quarles.com/newsroom/publications/new-california-law-gives-pharmacists-more-power-over-staffing-and-requires-medication-error-reporting)
- [Technician Regulation - Pharmacy Times](https://www.pharmacytimes.com/view/pharmacy-technician-regulation)

### Physical Layout
- [Pharmacy Layout Guide - Leafio](https://www.leafio.ai/blog/pharmacy-layout/)
- [Pharmacy Design Blueprint - Pharmacy Mentor](https://www.pharmacymentor.com/pharmacy-design/)
- [How to Design a Pharmacy - LitSignage](https://www.litsignage.com/how-to-design-a-pharmacy/)

### Compliance & Audit
- [Audit Trail Integrity - Freyr Solutions](https://www.freyrsolutions.com/blog/audit-trail-integrity-a-crucial-aspect-of-pharma-compliance)
- [Pharmacy Audit Checklist - CompleteRx](https://www.completerx.com/blog/pharmacy-audit-checklist/)
- [21 CFR Part 11 Compliance - IntuitionLabs](https://intuitionlabs.ai/articles/audit-trails-21-cfr-part-11-annex-11-compliance)

### Workflow
- [Pharmacy Workflow Software - Datascan](https://datascanpharmacy.com/workflow-software/)
- [DocuTrack Workflow - RedSail](https://www.redsailtechnologies.com/blog/docutrack-improving-your-pharmacys-workflow)
- [PioneerRx Software - RedSail](https://www.redsailtechnologies.com/pharmacy-software)

---

*Document prepared for Xoai Healthcare Platform pharmacy module development.*
