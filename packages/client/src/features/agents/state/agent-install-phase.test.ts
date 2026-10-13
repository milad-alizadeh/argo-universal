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
const lostResponse = {
  ...idle,
  operation: recovered,
  failure: disconnected,
  requestId: 1,
};
describe('an accepted Server operation after a lost start response', () => {
  it('keeps the installation running', () => {
    expect(installationRunning(lostResponse)).toBe(true);
  });
  it('holds back the transport failure', () => {
    expect(installationNotice(lostResponse)).toBeUndefined();
  });
});
describe('a failed request the Server reports no new work for', () => {
  const input = {
    ...lostResponse,
    previousOperationId: recovered.operationId,
  };
  it('stops the installation', () => {
    expect(installationRunning(input)).toBe(false);
  });
  it('reports its transport explanation', () => {
    expect(installationNotice(input)).toEqual({
      key: 'request:1',
      result: 'failed',
      failure: disconnected,
    });
  });
});
describe('a failed request before the Server status confirms nothing started', () => {
  const input = {
    ...idle,
    failure: disconnected,
    failureConfirmed: false,
    requestId: 1,
  };
  it('keeps its progress', () => {
    expect(installationRunning(input)).toBe(true);
  });
  it('holds back its failure', () => {
    expect(installationNotice(input)).toBeUndefined();
  });
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
describe('a pending request', () => {
  const input = { ...idle, pending: true, failure: disconnected };
  it('shows progress', () => {
    expect(installationRunning(input)).toBe(true);
  });
  it('shows no notice', () => {
    expect(installationNotice(input)).toBeUndefined();
  });
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
      expect(installationNotice(input)).toEqual(notice);
    },
  );
  it.each([installed, failed])('is no longer running', (operation) => {
    expect(installationRunning({ ...idle, operation })).toBe(false);
  });
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
