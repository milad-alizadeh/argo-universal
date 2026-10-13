import type { AgentCheck } from '@repo/contracts';
import { ResourceCleanupError } from '../../lib/resource-cleanup-error';

// A check that threw instead of answering: a process that would not exit is a startup failure; anything else is unknown.
export const readinessOfFailure = (error: unknown): AgentCheck =>
  error instanceof ResourceCleanupError
    ? {
        status: 'cant-start',
        reason: 'The Agent did not exit after its readiness check.',
      }
    : {
        status: 'couldnt-check',
        reason: 'Readiness could not be determined.',
      };
