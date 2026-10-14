import type { AgentCheck, AgentRegistration } from '@repo/contracts';
import type { SavedReadiness } from '../agent-storage';
import { sanitizeReason } from '../readiness/sanitize-reason';

// A program that answered ACP initialize is saved; it may still need a sign-in.
const savable = new Set<AgentCheck['status']>([
  'ready',
  'sign-in-needed',
  'account-not-supported',
]);

export const isSavable = (check: AgentCheck): boolean =>
  savable.has(check.status);

export const checkedReadiness = (
  checkedAt: number,
  check: AgentCheck,
): SavedReadiness => ({
  readinessStatus: check.status,
  readinessReason:
    check.reason === undefined ? null : sanitizeReason(check.reason),
  readinessCheckedAt: checkedAt,
  readinessAgentVersion: check.agentVersion ?? null,
});

export const rejectedDefinition = (check: AgentCheck): AgentRegistration => ({
  status: 'failed',
  failure: sanitizeReason(check.reason ?? 'Readiness could not be determined.'),
});
