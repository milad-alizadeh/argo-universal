import type { AgentInstallOperation } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import {
  installationNotice,
  installationRunning,
  type InstallPhaseInput,
} from './agent-install-phase';
const disconnected = 'Network disconnected';
const recovered: AgentInstallOperation = {
  agentId: 'example',
  operationId: 'accepted',
  version: '1.2.3',
  status: 'installing',
};
const idle: InstallPhaseInput = {
  pending: false,
  failureConfirmed: true,
  watched: [],
};
const installed: AgentInstallOperation = { ...recovered, status: 'installed' };
const failed: AgentInstallOperation = {
  ...recovered,
  status: 'failed',
  failure: 'Node.js is required on the Server',
};
it('an accepted Server operation supersedes a lost start response', () => {
  const input = {
    ...idle,
    operation: recovered,
    failure: disconnected,
    requestId: 1,
  };
  expect(installationRunning(input)).toBe(true);
  expect(installationNotice(input)).toBeUndefined();
});
it('a failed request reports its transport explanation until the Server reports new work', () => {
  const input = {
    ...idle,
    operation: recovered,
    previousOperationId: recovered.operationId,
    failure: disconnected,
    requestId: 1,
  };
  expect(installationRunning(input)).toBe(false);
  expect(installationNotice(input)).toEqual({
    key: 'request:1',
    result: 'failed',
    failure: disconnected,
  });
});
it('a failed request keeps its progress until the Server status confirms nothing started', () => {
  const input = {
    ...idle,
    failure: disconnected,
    failureConfirmed: false,
    requestId: 1,
  };
  expect(installationRunning(input)).toBe(true);
  expect(installationNotice(input)).toBeUndefined();
});
it('a recovered operation reports the outcome of the request whose response was lost', () => {
  expect(
    installationNotice({
      ...idle,
      operation: installed,
      failure: disconnected,
      requestId: 1,
    }),
  ).toEqual({ key: 'accepted', result: 'installed', version: '1.2.3' });
});
it('a pending request shows progress and no notice', () => {
  const input = { ...idle, pending: true, failure: disconnected };
  expect(installationRunning(input)).toBe(true);
  expect(installationNotice(input)).toBeUndefined();
});
describe('a settled operation', () => {
  it.each([
    [
      'installed',
      installed,
      { key: 'accepted', result: 'installed', version: '1.2.3' },
    ],
    [
      'failed',
      failed,
      { key: 'accepted', result: 'failed', failure: failed.failure },
    ],
  ] as const)(
    'notifies once it is %s after this page watched it run',
    (_, operation, notice) => {
      const input = { ...idle, operation, watched: ['accepted'] };
      expect(installationRunning(input)).toBe(false);
      expect(installationNotice(input)).toEqual(notice);
    },
  );
  it.each([installed, failed])(
    'stays quiet when it settled before this page saw it run',
    (operation) => {
      expect(installationNotice({ ...idle, operation })).toBeUndefined();
    },
  );
  it('stays quiet when it was cancelled', () => {
    const cancelled: AgentInstallOperation = {
      ...recovered,
      status: 'cancelled',
    };
    expect(
      installationNotice({
        ...idle,
        operation: cancelled,
        watched: ['accepted'],
      }),
    ).toBeUndefined();
  });
});
