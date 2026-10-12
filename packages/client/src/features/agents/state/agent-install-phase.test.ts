import type { AgentInstallOperation } from '@repo/contracts';
import { expect, it } from 'vitest';
import { installationFailure, installationPhase } from './agent-install-phase';
const disconnected = 'Network disconnected';
const recovered: AgentInstallOperation = {
  agentId: 'example',
  operationId: 'accepted',
  version: '1.2.3',
  status: 'installing',
};
it('an accepted Server operation supersedes a lost start response', () => {
  const input = {
    operation: recovered,
    pending: false,
    failure: disconnected,
  };
  expect(installationPhase(input)).toBe('installing');
  expect(installationFailure(input)).toBeUndefined();
});
it('a failed request preserves its transport explanation until the Server reports new work', () => {
  const input = {
    operation: recovered,
    previousOperationId: recovered.operationId,
    pending: false,
    failure: disconnected,
  };
  expect(installationPhase(input)).toBe('failed');
  expect(installationFailure(input)).toBe(disconnected);
});
