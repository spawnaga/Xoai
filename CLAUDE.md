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

**Tests:** 222 passing ✅

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