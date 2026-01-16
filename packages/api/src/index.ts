// tRPC API package
export * from './trpc';
export * from './router';
export * from './context';
export * from './routers';

// Re-export medscab types used in router responses for proper type portability
export type {
  Drug,
  DrugSearchResult,
  InteractionCheckResult,
  ContraindicationCheckResult,
  AllergyCheckResult,
  DURCheckResult,
  DosingGuidelinesResult,
} from '@xoai/medscab';
