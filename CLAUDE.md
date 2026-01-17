# CLAUDE.md - Xoai Healthcare Platform

## Quick Reference

**Current Project:** Xoai - Unified Healthcare Platform (monorepo merger)
**Source Projects:**
- `C:\Users\alial\WebstormProjects\Asclepius` - AI Healthcare Platform (MediXAI)
- `C:\Users\alial\WebstormProjects\docom` - Healthcare Monorepo (create-t3-turbo)

## Project Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1-3 | Foundation, Core & Healthcare Packages | ✅ Complete |
| Phase 4 | Web Application | ✅ Complete |
| Phase 5 | AI Integration | 🔄 60% |
| Phase 6 | UI Components | ✅ Complete |
| Phase 7 | Data Migration (MongoDB → MySQL) | ✅ Complete |
| Phase 8 | Professional UI Overhaul | ✅ Complete |
| Phase 9 | SSR Migration & Security Hardening | 🔄 50% |
| Phase 10 | C# Integration Layer | ⏳ Planned |

**Tests:** 899 passing ✅

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 18+ |
| Package Manager | pnpm 8.15.0 |
| Monorepo | Turborepo 2.0.0 |
| Frontend | Next.js 15 (App Router) |
| Backend | tRPC |
| Auth | NextAuth.js |
| Database | MySQL 8.0 + Prisma |
| Cache | Redis 7 |
| Language | TypeScript 5.3+ |
| Styling | Tailwind CSS |
| Testing | Vitest |
| AI | Google Gemini, OpenAI |

## Project Structure

```
Xoai/
├── apps/
│   └── web/                    # Main Next.js 15 application
├── packages/
│   ├── api/                    # tRPC API routers
│   ├── auth/                   # NextAuth.js authentication
│   ├── db/                     # Prisma database models
│   ├── ui/                     # Shared UI component library
│   ├── ai/                     # AI integrations
│   ├── medscab/                # Pharmacy management system (266 tests)
│   │   ├── claims/             # NCPDP claims processing (B1, B2, B3)
│   │   ├── inventory/          # NDC-based inventory management
│   │   ├── controlled-substances/ # DEA compliance, CSOS, ARCOS
│   │   ├── workflow/           # Prescription queue management
│   │   ├── ltc-facility/       # Long-term care & hospice
│   │   └── fill/               # Prescription filling operations
│   └── healthcare/             # Healthcare-specific packages
│       ├── fhir/               # FHIR R4 converters & validators
│       ├── google/             # Google Healthcare API
│       ├── hl7/                # HL7 v2.x messaging
│       ├── cda/                # Clinical Document Architecture
│       ├── terminology/        # Medical coding (ICD-10, SNOMED, etc.)
│       └── compliance/         # HIPAA encryption & audit
├── tooling/                    # Shared configs (ESLint, TypeScript)
├── scripts/                    # Utility scripts
├── turbo.json
├── pnpm-workspace.yaml
└── docker-compose.yml
```

## Common Commands

```bash
pnpm dev              # Start development server (http://localhost:3000 or 3001/3002)
pnpm build            # Build all packages
pnpm test             # Run tests
pnpm lint             # Lint code
pnpm type-check       # TypeScript checking
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Prisma Studio
pnpm format           # Format with Prettier
```

## Database

- **MySQL:** `mysql://xoai_user:xoai_password@localhost:3306/xoai`
- **Redis:** `localhost:6379`
- **Adminer:** `http://localhost:8080`

Start services: `docker-compose up -d`

## Key Features

- HIPAA-compliant AES-256-GCM encryption for PHI
- Healthcare interoperability: FHIR R4, HL7 v2.x, C-CDA
- Medical terminology: ICD-10/11, SNOMED CT, LOINC, NDC, RxNorm, CPT
- Role-based access: doctors, nurses, pharmacists, administrators
- AI-powered symptom analysis and drug interaction checking
- Comprehensive audit logging
- **Professional modern UI with gradients and animations**

## MedsCab Pharmacy Package

> **Package:** `packages/medscab` | **Tests:** 270+ passing | **Status:** ✅ Complete

### Modules Implemented

| Module | Description | Key Features |
|--------|-------------|--------------|
| **Claims** | NCPDP insurance claims | B1/B2/B3 transactions, reject codes, eligibility checking, patient pay calculation |
| **Inventory** | NDC-based inventory | NDC parsing (5-4-2 format), reorder management, expiration tracking, inventory valuation |
| **Controlled Substances** | DEA compliance | DEA number validation, CSOS ordering, perpetual inventory, biennial inventory, theft/loss reporting |
| **Workflow** | Prescription queue | State machine transitions, queue priorities, notifications, will-call management |
| **LTC Facility** | Long-term care | Hospice comfort kits, MAR generation, delivery scheduling, emergency kit tracking |
| **Fill** | Prescription filling | Fill validation, refill logic, DAW codes, auxiliary labels, pharmacist verification |
| **Prescription Workflow** | Dispensing orchestration | 15-state workflow, promise time calculation, queue management |
| **Data Entry** | Rx validation | SIG builder, NDC/NPI/DEA validation, DAW codes, days supply calculation |
| **Claim Adjudication** | Reject resolution | Override codes, refill date calculation, cash pricing, prior auth validation |
| **Verification** | Pharmacist check | Checklist system, barcode parsing, NDC matching, DUR override |

### Key Types Exported

```typescript
// Claims
InsuranceInfo, ClaimRequest, ClaimResponse, EligibilityResponse

// Inventory
InventoryItem, InventoryTransaction, ReorderItem, NDCComponents

// Controlled Substances
CSTransaction, TheftLossReport, VarianceResult, BiennialInventoryStatus

// Workflow
WorkflowItem, WorkflowState, QueueSummary, WorkflowNotification

// LTC Facility
FacilityResident, HospiceAdmission, DeliverySchedule, EmergencyKit, MARRecord

// Fill
Fill, FillValidation, AuxiliaryLabel, Prescription

// Prescription Workflow (New)
PrescriptionWorkflowState, WorkflowPriority, StateTransitionResult

// Data Entry (New)
DAWCode, SigComponents, DataEntryInput, DataEntryValidationResult

// Claim Adjudication (New)
OverrideCode, RejectCodeResolution, RefillEligibility, CashPriceResult, PriorAuthRequest

// Verification Workflow (New)
VerificationChecklist, ChecklistItem, DURAlert, BarcodeParseResult, VerificationResult
```

### Usage Example

```typescript
import {
  submitClaim,
  normalizeNDC,
  isValidDEANumber,
  transitionState,
  generateMAR,
  createFill,
} from '@xoai/medscab';

// Submit insurance claim
const response = await submitClaim(claimRequest);

// Validate NDC format
const ndc = normalizeNDC('12345-6789-01'); // Returns '12345678901'

// Validate DEA number
const valid = isValidDEANumber('AS1234563'); // Returns true/false

// Transition prescription workflow state
const result = transitionState(item, 'fill', 'verify', userId);

// Generate MAR for LTC resident
const mar = generateMAR(resident, medications, startDate, 7);

// Create new fill record
const fill = createFill(prescription, fillData);
```

---

## Retail Pharmacy Dispensing Workflow

> **Package Extensions:** `packages/medscab` | **New Tests:** 4 test files | **Status:** ✅ Complete (January 2026)

### Workflow Overview

Complete retail pharmacy dispensing workflow implementation: **Intake → Data Entry → Claim → Fill → Verify → Dispense**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     PRESCRIPTION WORKFLOW STATE MACHINE                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INTAKE ──► DATA_ENTRY ──► INSURANCE_PENDING ──► DUR_REVIEW ──► FILLING     │
│     │            │                  │                 │             │        │
│     │            │                  │                 │             ▼        │
│     │            │                  ▼                 │       VERIFICATION   │
│     │            │             CASH_PRICING          │             │        │
│     │            │                  │                 │             ▼        │
│     │            ▼                  ▼                 │          READY       │
│     │        REJECTED          PATIENT_HOLD ◄────────┘             │        │
│     │            │                  │                              ▼        │
│     ▼            ▼                  │                            SOLD       │
│  CANCELLED   TRANSFERRED            │                              │        │
│                                     ▼                              ▼        │
│                                RETURNED                        COMPLETED     │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Workflow States (15 States)

| State | Description | Next States | Requires Pharmacist |
|-------|-------------|-------------|---------------------|
| `INTAKE` | Initial prescription received | DATA_ENTRY, CANCELLED | No |
| `DATA_ENTRY` | Prescription details being entered | INSURANCE_PENDING, CASH_PRICING, REJECTED | No |
| `INSURANCE_PENDING` | Claim submitted to PBM | DUR_REVIEW, FILLING, PATIENT_HOLD, CASH_PRICING | No |
| `CASH_PRICING` | Cash price calculated for patient | FILLING, PATIENT_HOLD, CANCELLED | No |
| `DUR_REVIEW` | Drug utilization review alerts | FILLING, PATIENT_HOLD, CANCELLED | **Yes** |
| `FILLING` | Medication being dispensed | VERIFICATION | No |
| `VERIFICATION` | Pharmacist final check | READY, DATA_ENTRY | **Yes** |
| `READY` | Ready for patient pickup | SOLD, RETURNED | No |
| `SOLD` | Dispensed to patient | COMPLETED | No |
| `COMPLETED` | Transaction complete | (terminal) | No |
| `REJECTED` | Prescription rejected | CANCELLED, TRANSFERRED | **Yes** |
| `PATIENT_HOLD` | Waiting for patient decision | FILLING, CANCELLED, TRANSFERRED | No |
| `CANCELLED` | Prescription cancelled | (terminal) | No |
| `TRANSFERRED` | Transferred to another pharmacy | (terminal) | **Yes** |
| `RETURNED` | Patient returned to stock | COMPLETED | No |

### New Domain Logic Modules

**Directory:** `packages/medscab/src/`

| File | Purpose | Key Exports |
|------|---------|-------------|
| `prescription-workflow.ts` | Central workflow orchestration | `validateStateTransition()`, `getNextStates()`, `calculatePromiseTime()`, `isTerminalState()`, `createQueueSummary()`, `sortQueueItems()` |
| `data-entry.ts` | Data entry validation | `DAW_CODES`, `SIG_COMPONENTS`, `buildSig()`, `validateDataEntry()`, `formatNdcDisplay()`, `normalizeNdc()`, `isValidNdc()`, `isValidNpi()`, `isValidDeaNumber()`, `calculateDaysSupply()`, `frequencyToDosesPerDay()` |
| `claim-adjudication.ts` | Insurance claim workflow | `OVERRIDE_CODES`, `getRejectCodeResolution()`, `calculateEligibleRefillDate()`, `calculateCashPrice()`, `comparePricingOptions()`, `isPriorAuthValid()`, `getDaysUntilPAExpiration()` |
| `verification-workflow.ts` | Pharmacist verification | `createVerificationChecklist()`, `validateChecklist()`, `parseNdcFromBarcode()`, `verifyNdcMatch()`, `overrideDurAlert()`, `completeVerification()` |

### Key Types & Constants

```typescript
// Prescription Workflow
type WorkflowState = 'INTAKE' | 'DATA_ENTRY' | 'INSURANCE_PENDING' | 'CASH_PRICING'
  | 'DUR_REVIEW' | 'FILLING' | 'VERIFICATION' | 'READY' | 'SOLD' | 'COMPLETED'
  | 'REJECTED' | 'PATIENT_HOLD' | 'CANCELLED' | 'TRANSFERRED' | 'RETURNED';

type WorkflowPriority = 'STAT' | 'URGENT' | 'NORMAL' | 'LOW';

// Data Entry
type DAWCode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface SigComponents {
  action: string;      // TAKE, APPLY, INJECT, etc.
  quantity?: string;   // 1, 2, 0.5, etc.
  form?: string;       // TAB, CAP, ML, etc.
  route: string;       // PO, TOP, SC, etc.
  frequency: string;   // QD, BID, TID, PRN, etc.
  timing?: string;     // WF (with food), AC (before meals), HS (at bedtime)
  prnReason?: string;  // PAIN, NAUSEA, etc.
  duration?: string;   // X7D (for 7 days), etc.
  customDose?: string; // For non-standard doses
}

// Claim Adjudication
interface OverrideCode {
  code: string;
  description: string;
  requiresDocumentation: boolean;
}

// DUR Override codes: M0 (Prescriber Approval), P0 (Patient Informed), 1A-6A (Clinical Override)
// Early Refill Override codes: VS (Vacation Supply), LT (Lost/Theft), ER (Emergency)
// Quantity Override codes: QL (Quantity Limit Override)

// Reject Code Resolutions (NCPDP standard codes)
// 7: Member ID Invalid
// 65: Patient Not Covered
// 70: Not Covered (Drug not on formulary)
// 75: Prior Auth Required
// 76: Plan Limitations Exceeded
// 79: Refill Too Soon
// 88: DUR Reject

// Verification Workflow
interface VerificationChecklist {
  items: ChecklistItem[];
  durAlerts: DURAlert[];
  ndcVerified: boolean;
  quantityVerified: boolean;
  labelVerified: boolean;
}

type BarcodeFormat = 'UPC-A' | 'GS1-DataMatrix' | 'NDC-HRI' | 'UNKNOWN';
```

### NCPDP Reject Code Resolution

| Code | Description | Resolution Steps | Can Override | Requires Pharmacist |
|------|-------------|------------------|--------------|---------------------|
| 7 | Member ID Invalid | Verify member ID, check plan records | No | No |
| 65 | Patient Not Covered | Verify eligibility dates, check for new plan | No | No |
| 70 | Not Covered | Check formulary, request exception, offer cash | No | Yes |
| 75 | Prior Auth Required | Submit PA request to PBM, check existing PA | Yes | Yes |
| 76 | Plan Limitations | Verify quantity/days supply, submit override | Yes | No |
| 79 | Refill Too Soon | Calculate eligible date, vacation supply override | Yes | No |
| 88 | DUR Reject | Review interaction, prescriber contact, override | Yes | Yes |

### UI Pages Implemented

| Route | Page | Description | RBAC |
|-------|------|-------------|------|
| `/dashboard/pharmacy` | Pharmacy Hub | Queue summary, navigation, quick actions | Tech+ |
| `/dashboard/pharmacy/intake` | Intake Queue | eRx/Fax/Phone channels, triage | Tech+ |
| `/dashboard/pharmacy/data-entry` | Data Entry | Drug search, prescriber lookup, SIG builder | Tech+ |
| `/dashboard/pharmacy/claim` | Claims Workstation | Reject resolution, override submission, cash pricing | Tech+ |
| `/dashboard/pharmacy/fill` | Fill Station | NDC scan, label print, auxiliary labels | Tech+ |
| `/dashboard/pharmacy/verify` | Verification | DUR review, checklist, approve/reject | **Pharmacist only** |
| `/dashboard/pharmacy/pickup` | Pickup/Dispense | Patient search, ID verify, signature capture | Tech+ |
| `/dashboard/pharmacy/will-call` | Will-Call | Bin management, patient lookup | Tech+ |
| `/dashboard/pharmacy/inventory` | Inventory | Stock management, NDC lookup | Tech+ |
| `/dashboard/pharmacy/pdmp` | PDMP | Prescription drug monitoring (placeholder) | Pharmacist+ |
| `/dashboard/pharmacy/immunizations` | Immunizations | Vaccine administration (placeholder) | Pharmacist+ |
| `/dashboard/pharmacy/transfers` | Transfers | Rx transfer in/out (placeholder) | Tech+ |
| `/dashboard/pharmacy/staff` | Staff | Pharmacist/tech assignments (placeholder) | Manager+ |
| `/dashboard/pharmacy/standing-orders` | Standing Orders | Vaccine protocols (placeholder) | Pharmacist+ |

### Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| F1 | Help / Patient Search | Global |
| F2 | Accept / Approve | Intake, Verify |
| F3 | Triage / Next Item | Queue pages |
| F4 | Override DUR | Verify (pharmacist) |
| F5 | Resubmit / Refresh | Claims |
| F6 | Scan Barcode | Fill, Verify |
| F7 | Capture Signature | Pickup |
| F8 | Print Label | Fill |
| F9 | Complete Fill | Fill |
| F10 | Submit Form | All forms |
| Esc | Cancel / Back | Global |
| Ctrl+S | Save | Global |
| Ctrl+N | New Note | Detail views |

### Test Files

**Directory:** `packages/medscab/src/`

| File | Coverage | Key Test Cases |
|------|----------|----------------|
| `prescription-workflow.test.ts` | State transitions | Valid/invalid transitions, pharmacist requirements, terminal states, queue sorting |
| `data-entry.test.ts` | Data validation | DAW codes, SIG building, NDC/NPI/DEA validation, days supply calculation, controlled substance rules |
| `claim-adjudication.test.ts` | Claims processing | Override codes, reject resolution, refill date calculation, cash pricing, prior auth validation |
| `verification-workflow.test.ts` | Verification | Checklist creation/validation, barcode parsing (UPC-A, GS1), NDC matching, DUR override |

### Usage Examples

```typescript
import {
  validateStateTransition,
  buildSig,
  validateDataEntry,
  getRejectCodeResolution,
  calculateCashPrice,
  parseNdcFromBarcode,
  createVerificationChecklist,
} from '@xoai/medscab';

// Validate workflow state transition
const result = validateStateTransition('FILLING', 'VERIFICATION', { isPharmacist: true });
// result: { success: true, requiresNote: false }

// Build SIG text from components
const sig = buildSig({
  action: 'TAKE',
  quantity: '1',
  form: 'TAB',
  route: 'PO',
  frequency: 'BID',
  timing: 'WF',
});
// sig: "Take one tablet(s) by mouth twice daily with food"

// Get resolution for reject code 79 (Refill Too Soon)
const resolution = getRejectCodeResolution('79');
// resolution: { code: '79', resolutionSteps: [...], overrideCodes: OVERRIDE_CODES.EARLY_REFILL }

// Calculate cash price
const price = calculateCashPrice(10, 5, 20, 10);
// price: { acquisitionCost: 10, markup: 2, dispensingFee: 5, finalPrice: 17 }

// Parse NDC from barcode scan
const barcode = parseNdcFromBarcode('012345678901');
// barcode: { success: true, ndc: '01234567890', format: 'UPC-A' }

// Create verification checklist
const checklist = createVerificationChecklist(prescription, fill);
// checklist: { items: [...], durAlerts: [...], ndcVerified: false }
```

### Audit Logging

All pharmacy workflow actions are logged to `AuditLog`:

| Action | Data Logged |
|--------|-------------|
| State Transition | Previous state, new state, user ID, timestamp, notes |
| DUR Override | Override code, clinical reason, pharmacist ID, patient ID |
| Claim Submission | Claim ID, BIN/PCN, patient copay, response code |
| Signature Capture | Pickup session ID, patient/proxy verification method |
| Controlled Substance | DEA schedule, quantity, PDMP query status |
| Label Print | Prescription ID, reprint flag, user ID |

---

## Source Project Details

### Asclepius (MediXAI)
- **Stack:** Next.js 15, Express, MongoDB, Custom JWT
- **Key Assets:** HL7/FHIR APIs, prescription portal, drug interactions, AI integration
- **Default Login:** MasterUser / Masteruser#1
- **Test Patient:** Santa Clause (pre-populated)

### Docom
- **Stack:** Next.js 13, tRPC, MySQL/PlanetScale, NextAuth.js
- **Key Assets:** Turborepo structure, HIPAA docs, type-safe API patterns
- **Docs:** `docs/HIPAA.md`, `docs/NOM-004.md`, `docs/dashboardRoles.md`

## Environment Variables

```env
DATABASE_URL=mysql://xoai_user:xoai_password@localhost:3306/xoai
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret
GOOGLE_PROJECT_ID=your-project
GOOGLE_GEMINI_API_KEY=your-key
OPENAI_API_KEY=your-key
ENCRYPTION_KEY=32-byte-hex-key
```

## Remaining Work

### Medium Priority
1. Complete AI integrations with real API calls (Phase 5)

### Low Priority
2. PWA offline caching strategies
3. Comprehensive security audit
4. Production deployment

## Data Migration Commands

```bash
pnpm migrate:connect    # Test MongoDB connection
pnpm migrate:export     # Export from MongoDB
pnpm migrate:transform  # Transform to MySQL format
pnpm migrate:load       # Load into MySQL
pnpm migrate:validate   # Validate migration
pnpm migrate:all        # Run complete migration
```

## Important Files

- `merger_plan.md` - Detailed integration plan with phase tracking
- `.env.example` - Environment template
- `docker-compose.yml` - Local development services
- `packages/healthcare/*/src/` - Healthcare standards implementations
- `scripts/generate-icons.js` - PWA icon generation script

### Phase 9 Implementation Files (New)

| File | Purpose |
|------|---------|
| `apps/web/middleware.ts` | Auth middleware for server-side route protection |
| `apps/web/src/lib/auth.ts` | Server-side auth utilities (`getSession`, `requireSession`, etc.) |
| `apps/web/src/lib/trpc-server.ts` | Server-side tRPC caller for SSR data fetching |
| `apps/web/src/lib/rate-limit.ts` | Rate limiting utility with pre-configured limiters |
| `apps/web/src/components/dashboard/sidebar.tsx` | Client-side sidebar component (extracted) |
| `apps/web/src/components/auth/login-form.tsx` | Login form with server actions |
| `apps/web/src/components/auth/register-form.tsx` | Register form with server actions |
| `apps/web/src/components/patients/patient-list.tsx` | Interactive patient list component |
| `apps/web/src/components/session/session-timeout-warning.tsx` | HIPAA session timeout warning |
| `apps/web/src/app/(auth)/actions.ts` | Server actions for authentication |
| `apps/web/next.config.js` | Updated with HIPAA security headers (CSP, HSTS, etc.) |

## MongoDB → MySQL Schema Mapping

| Asclepius (MongoDB) | Xoai (MySQL) |
|---------------------|--------------|
| `users` | `User` |
| `patients` | `Patient` |
| `prescriptions` | `Medication` |
| `appointments` | `Encounter` |
| `vitals` | `Observation` |
| `diagnoses` | `Condition` |
| `labResults` | `DiagnosticReport` |
| `auditLogs` | `AuditLog` |

## UI Pages (Phase 8 - Complete)

### Public Pages
- **Landing Page** (`/`) - Hero section, features, CTA, footer
- **Login** (`/login`) - Split-screen with branding panel
- **Register** (`/register`) - Split-screen with benefits list

### Dashboard Pages
- **Dashboard Home** (`/dashboard`) - Stats, quick actions, recent patients, compliance status
- **Patients** (`/dashboard/patients`) - Table/grid view, search, filters
- **Encounters** (`/dashboard/encounters`) - Patient visits
- **Observations** (`/dashboard/observations`) - Vitals and clinical data
- **Medications** (`/dashboard/medications`) - Prescriptions

### Design System
- **Colors:** Blue/Indigo gradients, Slate for text, Emerald for success
- **Rounded corners:** 2xl (16px) for cards, xl (12px) for buttons/inputs
- **Shadows:** Colored shadows (e.g., `shadow-blue-500/25`)
- **Animations:** Fade-in, slide-up, slide-down, pulse indicators
- **Glass effects:** `backdrop-blur-md` with semi-transparent backgrounds

---

## Healthcare Regulatory Compliance Requirements

> **Research Date:** January 2026
> **Purpose:** Ensure Xoai meets all healthcare compliance requirements before implementation

### Regulatory Framework Overview

| Framework | Scope | Status | Priority |
|-----------|-------|--------|----------|
| HIPAA Security Rule | US Healthcare Data Protection | **MANDATORY** | Critical |
| HIPAA 2025 Updates | Enhanced Cybersecurity Requirements | Proposed (pending) | Critical |
| HITRUST CSF v11 | Comprehensive Security Framework | Recommended | High |
| SOC 2 Type II | Service Organization Controls | Recommended | High |
| NIST CSF 2.0 | Cybersecurity Framework | Reference Standard | High |
| FDA SaMD | Software as Medical Device | Conditional* | Medium |
| OWASP Top 10:2025 | Web Application Security | Best Practice | High |

*FDA SaMD applies if the software provides diagnosis, treatment recommendations, or clinical decision support.

---

### HIPAA Security Rule Requirements (45 CFR § 164)

#### Technical Safeguards (§ 164.312)

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Access Control** (§ 164.312(a)) | | |
| └─ Unique User Identification | User ID per account | ✅ Implemented |
| └─ Emergency Access Procedure | Break-glass access | ⏳ Planned |
| └─ Automatic Logoff | Session timeout (5-15 min) | ⏳ Phase 9 |
| └─ Encryption/Decryption | AES-256-GCM for ePHI | ✅ Implemented |
| **Audit Controls** (§ 164.312(b)) | | |
| └─ Hardware/Software Logging | Comprehensive audit trail | 🔄 Enhance in Phase 9 |
| └─ 6-Year Retention | Tamper-proof storage | ⏳ Phase 9 |
| **Integrity Controls** (§ 164.312(c)) | | |
| └─ Data Authentication | Hash verification | ⏳ Phase 9 |
| **Transmission Security** (§ 164.312(e)) | | |
| └─ Integrity Controls | TLS 1.3 | ⏳ Phase 9 |
| └─ Encryption | TLS 1.3 mandatory | ⏳ Phase 9 |

#### HIPAA 2025 Proposed Updates (Federal Register 2025-01-06)

> **Status:** Proposed rule, comment period closed March 2025. Final rule pending.
> **Compliance Deadline:** If enacted, December 31, 2025

**Key Changes (All Become MANDATORY - No "Addressable" Distinction):**

| Requirement | Current | Proposed 2025 |
|-------------|---------|---------------|
| Encryption at Rest | Addressable | **REQUIRED** (AES-256) |
| Encryption in Transit | Addressable | **REQUIRED** (TLS 1.3) |
| Multi-Factor Authentication | Addressable | **REQUIRED** for all ePHI access |
| Network Segmentation | Not specified | **REQUIRED** |
| Vulnerability Scanning | Not specified | **REQUIRED** (every 6 months) |
| Penetration Testing | Not specified | **REQUIRED** (annual) |
| System Recovery | Addressable | **REQUIRED** (72-hour recovery) |
| Asset Inventory | Not specified | **REQUIRED** (annual) |
| Business Associate Verification | Limited | **REQUIRED** (annual written certification) |

**Penalties:** $137 - $2,067,813 per violation depending on severity.

---

### Encryption Standards (HIPAA + NIST)

| Data State | Required Standard | Implementation |
|------------|-------------------|----------------|
| **At Rest** | AES-256 (FIPS 140-2 Level 2+) | Database encryption, file encryption |
| **In Transit** | TLS 1.3 (minimum TLS 1.2) | HTTPS, API calls, WebSocket |
| **Key Exchange** | RSA-2048 or higher (RSA-4096 recommended) | JWT signing, session tokens |
| **Key Management** | HSM recommended | Environment variables → HSM migration path |

**Current Implementation:**
```
✅ AES-256-GCM for PHI encryption (packages/healthcare/compliance)
⏳ TLS 1.3 enforcement (Phase 9)
⏳ FIPS 140-2 validation (Phase 9)
```

---

### Authentication & Access Control Requirements

#### Multi-Factor Authentication (MFA)

| Requirement | Standard | Implementation |
|-------------|----------|----------------|
| MFA for Remote Access | HIPAA 2025, NIST 800-63B | TOTP, WebAuthn/FIDO2 |
| Phishing-Resistant MFA | CISA, NIST | FIDO2 passkeys (preferred) |
| Number-Matching Push | Microsoft/CISA guidance | Prevent push bombing attacks |
| Risk-Based/Adaptive MFA | Zero Trust Architecture | Location, device, behavior analysis |

#### Role-Based Access Control (RBAC)

| Role | Access Level | PHI Access |
|------|--------------|------------|
| Administrator | Full system | All (audit logged) |
| Physician | Patient care | Assigned patients |
| Nurse | Clinical data | Assigned unit/patients |
| Pharmacist | Medication data | Prescription-related |
| Billing Staff | Financial data | Limited PHI (minimum necessary) |
| Lab Technician | Lab results | Lab data only |
| Patient | Own data | Self-service portal |

**Principle of Least Privilege:** Each role accesses only the minimum PHI necessary for job function.

#### Session Management

| Setting | Requirement | Value |
|---------|-------------|-------|
| Idle Timeout (Clinical) | HIPAA Automatic Logoff | 5-15 minutes |
| Idle Timeout (Shared Areas) | High-risk environments | 2-5 minutes |
| Idle Timeout (Mobile) | mHealth apps | 2-3 minutes |
| Absolute Session Lifetime | Web applications | 8-12 hours |
| Re-authentication | Sensitive actions | On each action |
| Session Termination | On logout | Immediate invalidation |

---

### Audit Logging Requirements (45 CFR § 164.312(b))

#### What Must Be Logged

| Event Category | Data Points | Retention |
|----------------|-------------|-----------|
| **Authentication** | User ID, timestamp, success/fail, IP, device | 6 years |
| **PHI Access** | User, patient ID, data accessed, action, timestamp | 6 years |
| **Data Modification** | User, record ID, old/new values, timestamp | 6 years |
| **System Events** | Config changes, errors, security events | 6 years |
| **Export/Transfer** | Source, destination, data volume, user | 6 years |

#### Audit Log Integrity

| Requirement | Implementation |
|-------------|----------------|
| Tamper-Proof Storage | WORM (Write Once Read Many) or cryptographic hashing |
| Immutability | Logs cannot be altered, overwritten, or deleted |
| Chain of Custody | Hash chaining (blockchain-style) for integrity |
| Secure Storage | Encrypted, separate from application data |

#### Monitoring & Alerting

| Alert Trigger | Response |
|---------------|----------|
| Multiple failed logins (5+) | Account lockout, security alert |
| Access outside business hours | Flag for review |
| Bulk PHI export | Immediate alert to security team |
| Access by terminated employee | Block + immediate investigation |
| Impossible travel (geo) | Block + verification required |

---

### OWASP Top 10:2025 Compliance

| Rank | Vulnerability | Mitigation | Status |
|------|--------------|------------|--------|
| A01 | Broken Access Control | RBAC, server-side auth checks | ⏳ Phase 9 |
| A02 | Security Misconfiguration | Security headers, hardened config | ⏳ Phase 9 |
| A03 | Software Supply Chain | Dependency scanning, SBOM | ⏳ Phase 9 |
| A04 | Cryptographic Failures | AES-256, TLS 1.3, secure key mgmt | 🔄 Partial |
| A05 | Injection | Parameterized queries (Prisma), input validation | ✅ Implemented |
| A06 | Insecure Design | Threat modeling, secure SDLC | ⏳ Phase 9 |
| A07 | Identification & Auth Failures | MFA, session management | ⏳ Phase 9 |
| A08 | Software & Data Integrity | Code signing, integrity checks | ⏳ Phase 9 |
| A09 | Security Logging & Monitoring | Comprehensive audit logging | ⏳ Phase 9 |
| A10 | SSRF / Exception Handling | Input validation, error handling | ⏳ Phase 9 |

---

### API Security Requirements (FHIR/SMART on FHIR)

#### SMART on FHIR Authorization

| Component | Standard | Implementation |
|-----------|----------|----------------|
| Authorization | OAuth 2.0 | Authorization Code Grant |
| Token Format | JWT | RS256/RS384 signing |
| Scopes | SMART Scopes | `patient/*.read`, `user/*.write` |
| PKCE | Required | Code challenge/verifier |
| Token Lifetime | Access: 5-60 min | Refresh: 24h-30d |

#### API Security Checklist

- [ ] TLS 1.3 for all API endpoints
- [ ] OAuth 2.0 / SMART on FHIR authorization
- [ ] Rate limiting per endpoint
- [ ] Request size limits
- [ ] Input validation on all endpoints
- [ ] Output encoding (prevent XSS)
- [ ] CORS configuration (restrictive)
- [ ] API versioning (`/api/v1/`)
- [ ] Comprehensive API logging

---

### SOC 2 Type II Alignment

| Trust Service Criteria | Requirement | Implementation |
|------------------------|-------------|----------------|
| **Security** (Required) | | |
| └─ Access Control | RBAC, MFA, least privilege | Phase 9 |
| └─ System Operations | Monitoring, incident response | Phase 9 |
| └─ Change Management | Version control, code review | ✅ Git |
| └─ Risk Mitigation | Vulnerability management | Phase 9 |
| **Availability** | | |
| └─ System Monitoring | Health checks, alerting | Phase 9 |
| └─ Disaster Recovery | 72-hour recovery capability | Phase 9 |
| **Confidentiality** | | |
| └─ Data Classification | PHI identification, handling | ✅ Implemented |
| └─ Encryption | At rest and in transit | Phase 9 |
| **Privacy** (PHI-related) | | |
| └─ Consent Management | Patient authorization tracking | Phase 9 |
| └─ Data Minimization | Minimum necessary principle | Phase 9 |

---

### NIST Cybersecurity Framework 2.0 Mapping

| Function | Category | Xoai Implementation |
|----------|----------|---------------------|
| **GOVERN** | Risk Management | Compliance documentation, policies |
| **IDENTIFY** | Asset Management | Technology inventory, data mapping |
| **PROTECT** | Access Control | RBAC, MFA, encryption |
| | Data Security | AES-256, TLS 1.3 |
| | Platform Security | Security headers, hardening |
| **DETECT** | Continuous Monitoring | Audit logging, alerting |
| | Anomaly Detection | Behavioral analysis |
| **RESPOND** | Incident Response | Response plan, containment |
| **RECOVER** | Recovery Planning | 72-hour recovery, backups |

---

### FDA SaMD Considerations

> **Applicability:** If Xoai provides clinical decision support, diagnosis, or treatment recommendations, FDA regulations may apply.

#### Classification Criteria

| Category | Risk Level | Examples | Regulatory Path |
|----------|------------|----------|-----------------|
| Category I | Lowest | Wellness apps, admin tools | Exempt |
| Category II | Low | Clinical reference, reminders | 510(k) likely exempt |
| Category III | Medium | Diagnosis assist, treatment suggestions | 510(k) required |
| Category IV | Highest | Autonomous diagnosis/treatment | PMA required |

#### Current Xoai Features Analysis

| Feature | FDA Category | Action Required |
|---------|--------------|-----------------|
| Patient Records Management | I (Admin) | None |
| Appointment Scheduling | I (Admin) | None |
| Drug Interaction Checking | II-III | Document clinical evidence |
| AI Symptom Analysis | III | May require 510(k) |
| AI Diagnosis Suggestions | III-IV | Likely requires 510(k)/PMA |

**Recommendation:** Document intended use clearly. If AI features provide diagnosis/treatment recommendations, consult FDA regulatory counsel.

---

### HITRUST CSF v11 Key Controls

| Domain | Control | Priority |
|--------|---------|----------|
| Access Control | Unique user IDs, MFA, session management | Critical |
| Audit Logging | Comprehensive logging, 6-year retention | Critical |
| Data Protection | Encryption at rest/transit, key management | Critical |
| Incident Response | Response plan, 72-hour notification | Critical |
| Network Security | Segmentation, firewalls, IDS/IPS | High |
| Vulnerability Management | Scanning, patching, penetration testing | High |
| Business Continuity | DR plan, backup testing, RTO/RPO | High |

---

### Compliance Implementation Priority

#### Phase 9.0 - Critical (Must Have)

1. **MFA Implementation** - HIPAA 2025 mandate
2. **Session Management** - Automatic logoff, secure cookies
3. **Audit Logging Enhancement** - Full PHI access tracking
4. **TLS 1.3 Enforcement** - Encryption in transit
5. **Security Headers** - CSP, HSTS, X-Frame-Options
6. **Server-Side Auth** - Middleware protection

#### Phase 9.1 - High Priority

7. **Rate Limiting** - Brute force protection
8. **Input Validation** - XSS, injection prevention
9. **Error Handling** - No information disclosure
10. **RBAC Enhancement** - Minimum necessary access

#### Phase 9.2 - Important

11. **Vulnerability Scanning** - Automated scanning
12. **Penetration Testing** - Annual requirement
13. **Incident Response Plan** - Documentation
14. **72-Hour Recovery** - Disaster recovery capability

---

### Compliance Documentation Required

| Document | Purpose | Status |
|----------|---------|--------|
| Security Policy | Overall security governance | ⏳ Create |
| Risk Assessment | Annual threat/vulnerability analysis | ⏳ Create |
| Incident Response Plan | Breach response procedures | ⏳ Create |
| Disaster Recovery Plan | Business continuity | ⏳ Create |
| Access Control Policy | RBAC definitions, procedures | ⏳ Create |
| Audit Log Policy | Retention, review procedures | ⏳ Create |
| Encryption Policy | Key management, standards | ⏳ Create |
| Vendor Management | BAA tracking, assessments | ⏳ Create |

---

### Sources & References

#### Official Regulatory Sources
- [HIPAA Security Rule - HHS.gov](https://www.hhs.gov/hipaa/for-professionals/security/index.html)
- [HIPAA 2025 NPRM - Federal Register](https://www.federalregister.gov/documents/2025/01/06/2024-30983/hipaa-security-rule-to-strengthen-the-cybersecurity-of-electronic-protected-health-information)
- [FDA SaMD Guidance](https://www.fda.gov/medical-devices/digital-health-center-excellence/software-medical-device-samd)
- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/cyberframework)
- [NIST SP 800-66 (HIPAA Guide)](https://www.nist.gov/news-events/news/2022/07/nist-updates-guidance-health-care-cybersecurity)

#### Industry Standards
- [HITRUST CSF Framework](https://hitrustalliance.net/hitrust-framework)
- [OWASP Top 10:2025](https://owasp.org/Top10/2025/)
- [SMART on FHIR Best Practices](https://docs.smarthealthit.org/authorization/best-practices/)
- [HPH Sector Cybersecurity Guide](https://aspr.hhs.gov/cip/hph-cybersecurity-framework-implementation-guide/)

#### Implementation Guides
- [HIPAA Encryption Requirements - Kiteworks](https://www.kiteworks.com/hipaa-compliance/hipaa-encryption/)
- [HIPAA Audit Log Requirements - Kiteworks](https://www.kiteworks.com/hipaa-compliance/hipaa-audit-log-requirements/)
- [Healthcare IAM Best Practices - Descope](https://www.descope.com/blog/post/healthcare-iam)
- [SOC 2 Healthcare Checklist - HIPAA Journal](https://www.hipaajournal.com/soc-2-compliance-checklist/)

---

## Phase 9: SSR Migration & Security Hardening

**Goal:** Migrate from 15% SSR to 70%+ SSR, implement security best practices, prepare for C# integration.

**Progress:** 🔄 50% Complete (as of January 2026)

### 9.1 Authentication & Session Security

- [x] **9.1.1** Create auth middleware (`middleware.ts`) for route protection ✅
  - File: `apps/web/middleware.ts`
  - Features: Server-side route protection, session validation, audit headers
- [x] **9.1.2** Implement server-side session validation before page render ✅
  - File: `apps/web/src/lib/auth.ts`
  - Functions: `getSession()`, `requireSession()`, `requireUser()`
- [ ] **9.1.3** Add CSRF token generation and validation
- [x] **9.1.4** Implement secure session cookies (HttpOnly, Secure, SameSite=Strict) ✅
  - Already configured in NextAuth
- [x] **9.1.5** Add session timeout warning component ✅
  - File: `apps/web/src/components/session/session-timeout-warning.tsx`
  - HIPAA-compliant automatic logoff warning
  - Inactivity detection (15 min default)
  - Session extension capability
- [x] **9.1.6** Create `getServerSession()` wrapper for all protected pages ✅
  - File: `apps/web/src/lib/auth.ts`
- [x] **9.1.7** Implement account lockout after failed login attempts ✅
  - Already implemented in `apps/web/src/app/api/auth/[...nextauth]/route.ts`
- [ ] **9.1.8** Add multi-factor authentication (MFA) support structure

### 9.2 Server Components Migration

- [ ] **9.2.1** Convert `/app/page.tsx` (landing) to Server Component
- [x] **9.2.2** Convert `/app/(auth)/login/page.tsx` to hybrid (server + client form) ✅
  - Server Component with metadata, client LoginForm component
- [x] **9.2.3** Convert `/app/(auth)/register/page.tsx` to hybrid (server + client form) ✅
  - Server Component with metadata, client RegisterForm component
- [x] **9.2.4** Convert `/app/(dashboard)/layout.tsx` to Server Component with auth check ✅
  - Now uses server-side `requireSession()` before rendering
  - Client sidebar extracted to `components/dashboard/sidebar.tsx`
  - Session timeout warning component added
- [x] **9.2.5** Convert `/app/(dashboard)/page.tsx` to Server Component with data prefetch ✅
  - SSR data fetching for stats and recent patients
  - PHI access logging before data exposure
- [x] **9.2.6** Convert `/app/(dashboard)/patients/page.tsx` to Server Component ✅
  - SSR patient list fetching
  - Client PatientList component for interactivity
- [ ] **9.2.7** Convert `/app/(dashboard)/encounters/page.tsx` to Server Component
- [ ] **9.2.8** Convert `/app/(dashboard)/observations/page.tsx` to Server Component
- [ ] **9.2.9** Convert `/app/(dashboard)/medications/page.tsx` to Server Component
- [ ] **9.2.10** Create reusable `<ClientOnly>` wrapper for interactive islands

### 9.3 Server Actions Implementation

- [x] **9.3.1** Create `actions/auth.ts` with login/logout/register server actions ✅
  - File: `apps/web/src/app/(auth)/actions.ts`
  - Login with rate limiting, account lockout, audit logging
  - Register with validation, rate limiting, audit logging
- [ ] **9.3.2** Create `actions/patients.ts` for patient CRUD operations
- [ ] **9.3.3** Create `actions/encounters.ts` for encounter management
- [ ] **9.3.4** Create `actions/observations.ts` for vitals/observations
- [ ] **9.3.5** Create `actions/medications.ts` for prescription management
- [x] **9.3.6** Add server-side input validation with Zod schemas ✅
  - Implemented in auth server actions
- [x] **9.3.7** Implement proper error handling and user feedback ✅
  - AuthState type with error/errors/success fields
- [x] **9.3.8** Add audit logging to all server actions ✅
  - File: `apps/web/src/lib/auth.ts` - `logPHIAccess()` function

### 9.4 Data Fetching Optimization

- [x] **9.4.1** Create server-side tRPC caller for SSR data fetching ✅
  - File: `apps/web/src/lib/trpc-server.ts`
  - Provides `api`, `getServerCaller()`, `prefetch()` for server components
- [ ] **9.4.2** Implement data prefetching in server components
- [ ] **9.4.3** Add React Suspense boundaries with loading skeletons
- [ ] **9.4.4** Implement streaming for large data sets
- [ ] **9.4.5** Add `revalidatePath()` / `revalidateTag()` for cache invalidation
- [ ] **9.4.6** Create ISR (Incremental Static Regeneration) for static pages

### 9.5 Security Headers & Protection

- [x] **9.5.1** Implement Content Security Policy (CSP) headers ✅
  - File: `apps/web/next.config.js`
- [x] **9.5.2** Add X-Frame-Options: DENY (prevent clickjacking) ✅
- [x] **9.5.3** Add X-Content-Type-Options: nosniff ✅
- [x] **9.5.4** Add X-XSS-Protection header ✅
- [x] **9.5.5** Add Referrer-Policy: strict-origin-when-cross-origin ✅
- [x] **9.5.6** Add Permissions-Policy header ✅
- [x] **9.5.7** Implement HSTS (Strict-Transport-Security) ✅
- [x] **9.5.8** Create security headers middleware in `next.config.js` ✅
  - Also added: Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy
  - Cache-Control headers for sensitive data (no-store)

### 9.6 Rate Limiting & DDoS Protection

- [x] **9.6.1** Implement in-memory rate limiting for API routes ✅
  - File: `apps/web/src/lib/rate-limit.ts`
  - Note: Use Redis in production for distributed systems
- [ ] **9.6.2** Add rate limiting to login endpoint (prevent brute force)
- [x] **9.6.3** Add rate limiting to registration endpoint ✅
  - File: `apps/web/src/app/api/auth/register/route.ts`
  - Limit: 3 per hour per IP
- [ ] **9.6.4** Add rate limiting to password reset endpoint
- [x] **9.6.5** Implement progressive delays for repeated failed attempts ✅
  - Configured in rate limit library
- [ ] **9.6.6** Add IP-based blocking for suspicious activity
- [x] **9.6.7** Create rate limit configuration per endpoint ✅
  - Preconfigured limiters: login, register, passwordReset, api, phiExport

### 9.7 Input Validation & Sanitization

- [ ] **9.7.1** Create centralized Zod schemas for all input types
- [ ] **9.7.2** Implement server-side validation for all form submissions
- [ ] **9.7.3** Add SQL injection prevention (Prisma parameterized queries)
- [ ] **9.7.4** Implement XSS sanitization for user-generated content
- [ ] **9.7.5** Add file upload validation (type, size, malware scan hook)
- [ ] **9.7.6** Validate and sanitize URL parameters
- [ ] **9.7.7** Implement request body size limits

### 9.8 Audit Logging & Monitoring

- [ ] **9.8.1** Enhance audit log schema for HIPAA compliance
- [ ] **9.8.2** Log all authentication events (login, logout, failed attempts)
- [ ] **9.8.3** Log all PHI access with user, timestamp, action, resource
- [ ] **9.8.4** Log all data modifications (create, update, delete)
- [ ] **9.8.5** Implement tamper-proof audit log storage
- [ ] **9.8.6** Create audit log viewer for administrators
- [ ] **9.8.7** Add alerting for suspicious activity patterns

### 9.9 Error Handling & Information Disclosure

- [ ] **9.9.1** Create custom error pages (400, 401, 403, 404, 500)
- [ ] **9.9.2** Implement generic error messages for production (no stack traces)
- [ ] **9.9.3** Add error boundary components for graceful degradation
- [ ] **9.9.4** Sanitize error responses to prevent information leakage
- [ ] **9.9.5** Implement structured logging (no PHI in logs)
- [ ] **9.9.6** Create error reporting integration (Sentry-ready)

### 9.10 Progressive Enhancement

- [ ] **9.10.1** Ensure forms submit without JavaScript (native form action)
- [ ] **9.10.2** Add `<noscript>` fallbacks for critical functionality
- [ ] **9.10.3** Implement server-side form validation feedback
- [ ] **9.10.4** Test all pages with JavaScript disabled
- [ ] **9.10.5** Document minimum functionality without JS

---

## Phase 10: C# Integration Layer

**Goal:** Prepare architecture for future C# backend services (.NET Core/ASP.NET) integration.

### 10.1 API Architecture for Interoperability

- [ ] **10.1.1** Create REST API layer alongside tRPC (`/api/v1/*`)
- [ ] **10.1.2** Document all endpoints with OpenAPI/Swagger specification
- [ ] **10.1.3** Generate OpenAPI schema from existing tRPC routers
- [ ] **10.1.4** Create versioned API structure (`/api/v1`, `/api/v2`)
- [ ] **10.1.5** Implement consistent JSON response format
- [ ] **10.1.6** Add request/response logging for debugging

### 10.2 Authentication Interoperability

- [ ] **10.2.1** Implement JWT token generation with standard claims
- [ ] **10.2.2** Document JWT structure for C# validation
- [ ] **10.2.3** Create shared secret/key management strategy
- [ ] **10.2.4** Implement token refresh endpoint
- [ ] **10.2.5** Add support for API key authentication (service-to-service)
- [ ] **10.2.6** Create authentication middleware compatible with .NET

### 10.3 Shared Data Contracts

- [ ] **10.3.1** Export Prisma schema as JSON Schema
- [ ] **10.3.2** Create TypeScript interfaces exportable to C# (via NSwag)
- [ ] **10.3.3** Document all data models in language-agnostic format
- [ ] **10.3.4** Create shared validation rules (JSON Schema)
- [ ] **10.3.5** Implement DTO (Data Transfer Object) pattern
- [ ] **10.3.6** Version data contracts for backwards compatibility

### 10.4 gRPC Preparation (Optional High-Performance)

- [ ] **10.4.1** Define Protocol Buffer (.proto) schemas for core entities
- [ ] **10.4.2** Create gRPC service definitions
- [ ] **10.4.3** Document gRPC integration points
- [ ] **10.4.4** Prepare for bidirectional streaming (real-time updates)

### 10.5 Message Queue Integration

- [ ] **10.5.1** Add RabbitMQ/Azure Service Bus connection support
- [ ] **10.5.2** Create event schemas for async communication
- [ ] **10.5.3** Implement pub/sub pattern for cross-service events
- [ ] **10.5.4** Document message formats for C# consumers
- [ ] **10.5.5** Add dead-letter queue handling

### 10.6 Database Sharing Strategy

- [ ] **10.6.1** Document MySQL schema for C# Entity Framework mapping
- [ ] **10.6.2** Create database views for C# read-only access
- [ ] **10.6.3** Implement row-level security policies
- [ ] **10.6.4** Define data ownership boundaries (which service owns what)
- [ ] **10.6.5** Create migration strategy for shared schema changes

### 10.7 Healthcare Standards APIs

- [ ] **10.7.1** Expose FHIR R4 REST endpoints (`/api/fhir/*`)
- [ ] **10.7.2** Implement HL7 v2.x message receiver endpoint
- [ ] **10.7.3** Create C-CDA document export endpoint
- [ ] **10.7.4** Document healthcare API for C# HL7 FHIR library compatibility
- [ ] **10.7.5** Add SMART on FHIR authorization support

### 10.8 Deployment & Infrastructure

- [ ] **10.8.1** Create Docker Compose for multi-service setup (Node + .NET)
- [ ] **10.8.2** Document Kubernetes deployment for microservices
- [ ] **10.8.3** Create shared configuration management (Consul/etcd ready)
- [ ] **10.8.4** Implement health check endpoints (`/health`, `/ready`)
- [ ] **10.8.5** Add distributed tracing headers (OpenTelemetry)
- [ ] **10.8.6** Create service discovery documentation

### 10.9 C# Project Scaffolding

- [ ] **10.9.1** Create `services/` directory for future C# projects
- [ ] **10.9.2** Document recommended .NET project structure
- [ ] **10.9.3** Create sample C# client for consuming Xoai APIs
- [ ] **10.9.4** Document Entity Framework Core model generation from MySQL
- [ ] **10.9.5** Create integration test suite template for C#

---

## Architecture: Current vs Target

### Current State (CSR-Heavy)
```
Browser → Client Components → tRPC Client → API Route → Database
         (100% JS required)   (React Query)
```

### Target State (SSR-First)
```
Browser → Server Component → Server Action/tRPC Server → Database
         (HTML first)        (validated server-side)
              ↓
         Client Islands (interactive parts only)
```

### Future State (Multi-Service)
```
┌─────────────────────────────────────────────────────────────┐
│                        Load Balancer                        │
└─────────────────────────────────────────────────────────────┘
              ↓                    ↓                    ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Next.js App   │  │  C# API Service │  │  C# Worker Svc  │
│   (Frontend +   │  │  (Business      │  │  (Background    │
│    BFF API)     │  │   Logic)        │  │   Processing)   │
└────────┬────────┘  └────────┬────────┘  └────────┬────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              ↓
              ┌───────────────────────────────┐
              │         MySQL + Redis         │
              │    (Shared Data Layer)        │
              └───────────────────────────────┘
```

---

## Security Checklist Summary

### Authentication & Authorization
- [ ] Server-side session validation
- [ ] CSRF protection
- [ ] MFA support
- [ ] Role-based access control (RBAC)
- [ ] Account lockout policy

### Data Protection
- [ ] AES-256-GCM encryption for PHI
- [ ] TLS 1.3 for transport
- [ ] Input validation (Zod)
- [ ] SQL injection prevention
- [ ] XSS sanitization

### Infrastructure Security
- [ ] Security headers (CSP, HSTS, etc.)
- [ ] Rate limiting
- [ ] DDoS protection ready
- [ ] Audit logging
- [ ] Error handling (no info leakage)

### Compliance
- [ ] HIPAA audit trail
- [ ] Data access logging
- [ ] Encryption at rest
- [ ] Encryption in transit
- [ ] Minimum necessary access