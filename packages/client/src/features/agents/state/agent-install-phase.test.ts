import type { AgentInstallOperation } from '@repo/contracts';
import { expect, it } from 'vitest';
import {
  installationFailure,
  installationPhase,
  visibleInstallOperation,
} from './agent-install-phase';
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

it('a dismissed completion opens a confirmation even before the next release offer refreshes', () => {
  const operation = { ...recovered, status: 'installed' as const };
  const input = {
    operation,
    dismissedOperationId: operation.operationId,
    version: operation.version,
  };
  expect(visibleInstallOperation(input)).toBeUndefined();
  expect(
    installationPhase({
      operation: visibleInstallOperation(input),
      pending: false,
    }),
  ).toBe('confirm');
});
