# Xoai Healthcare Platform

A unified, HIPAA-compliant healthcare platform built with modern web technologies. Xoai combines AI-powered clinical decision support with comprehensive healthcare interoperability standards.

## Features

- **HIPAA-Compliant Security** - AES-256-GCM encryption for Protected Health Information (PHI)
- **Healthcare Interoperability** - FHIR R4, HL7 v2.x, and C-CDA support
- **Medical Terminology** - ICD-10/11, SNOMED CT, LOINC, NDC, RxNorm, CPT coding systems
- **Role-Based Access Control** - Support for doctors, nurses, pharmacists, and administrators
- **AI-Powered Features** - Symptom analysis and drug interaction checking
- **Comprehensive Audit Logging** - Full traceability for compliance
- **Modern UI** - Professional design with gradients, animations, and glass effects

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
└── docker-compose.yml          # Local development services
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8.15.0+
- Docker & Docker Compose
- MySQL 8.0 (or use Docker)
- Redis 7 (or use Docker)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/xoai.git
cd xoai
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Start the database services:
```bash
docker-compose up -d
```

5. Generate Prisma client and push schema:
```bash
pnpm db:generate
pnpm db:push
```

6. Start the development server:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Environment Variables

```env
# Database
DATABASE_URL=mysql://xoai_user:xoai_password@localhost:3306/xoai

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Google Cloud (optional)
GOOGLE_PROJECT_ID=your-project
GOOGLE_GEMINI_API_KEY=your-key

# OpenAI (optional)
OPENAI_API_KEY=your-key

# Security
ENCRYPTION_KEY=your-32-byte-hex-key
```

## Available Commands

```bash
# Development
pnpm dev              # Start development server
pnpm build            # Build all packages
pnpm lint             # Lint code
pnpm type-check       # TypeScript checking
pnpm test             # Run tests
pnpm format           # Format with Prettier

# Database
pnpm db:generate      # Generate Prisma client
pnpm db:push          # Push schema to database
pnpm db:studio        # Open Prisma Studio

# Data Migration (MongoDB to MySQL)
pnpm migrate:all      # Run complete migration
```

## Application Pages

### Public Pages
- **Landing Page** (`/`) - Hero section, features, CTA
- **Login** (`/login`) - Split-screen with branding
- **Register** (`/register`) - Split-screen with benefits

### Dashboard Pages
- **Dashboard Home** (`/dashboard`) - Stats, quick actions, recent patients
- **Patients** (`/dashboard/patients`) - Patient management with search/filters
- **Encounters** (`/dashboard/encounters`) - Patient visits and encounters
- **Observations** (`/dashboard/observations`) - Vitals and clinical data
- **Medications** (`/dashboard/medications`) - Prescription management

## Healthcare Standards Support

### FHIR R4
- Patient, Encounter, Observation, MedicationRequest resources
- Bundle export/import
- RESTful search operations

### HL7 v2.x
- ADT (Admission, Discharge, Transfer) messages
- ORM (Order) messages
- ORU (Observation Result) messages

### Medical Coding
- **ICD-10/11** - Diagnosis coding
- **SNOMED CT** - Clinical terminology
- **LOINC** - Laboratory observations
- **NDC** - National Drug Codes
- **RxNorm** - Drug terminology
- **CPT** - Procedure coding

## Security & Compliance

- HIPAA-compliant data handling
- AES-256-GCM encryption for PHI
- Role-based access control
- Comprehensive audit logging
- Secure session management

## Testing

```bash
# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run specific package tests
pnpm --filter @xoai/api test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is proprietary software. All rights reserved.

## Support

For support, please contact the development team or open an issue in the repository.
