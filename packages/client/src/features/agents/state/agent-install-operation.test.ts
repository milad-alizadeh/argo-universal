import type {
  AgentInstallOperation,
  AgentInstallStatus,
} from '@repo/contracts';
import { expect, it } from 'vitest';
import { currentOperation } from './agent-install-operation';

const operation = (operationId: string): AgentInstallOperation => ({
  agentId: 'example',
  version: '1.2.3',
  operationId,
  status: 'installing',
});

const status = (value: AgentInstallOperation): AgentInstallStatus => ({
  installation: { status: 'not-installed' },
  operation: value,
});

it('another App retry replaces an observed failed operation', () => {
  const saved = operation('first');

  const failed: AgentInstallOperation = {
    ...saved,
    status: 'failed',
    failure: 'Interrupted',
  };

  expect(currentOperation(saved, status(failed))).toEqual(failed);

  const installed: AgentInstallOperation = {
    ...operation('second'),
    status: 'installed',
  };

  expect(currentOperation(saved, status(installed))).toEqual(installed);
});

it('a newly requested operation waits for status to advance beyond the previous operation', () => {
  const previous: AgentInstallOperation = {
    ...operation('previous'),
    status: 'installed',
  };

  const requested = operation('requested');
  expect(
    currentOperation(requested, status(previous), previous.operationId),
  ).toEqual(requested);
});

it('a confirmed missing operation after restart ends the interrupted loading state', () => {
  const saved = operation('interrupted');
  expect(
    currentOperation(saved, {
      installation: { status: 'not-installed' },
      operation: null,
    }),
  ).toMatchObject({
    status: 'failed',
    failure: expect.stringContaining('interrupted'),
  });
});

it('a confirmed durable installation survives loss of volatile operation history', () => {
  const saved = operation('committed');
  expect(
    currentOperation(saved, {
      installation: {
        status: 'installed',
        version: '1.2.3',
        readiness: 'not-checked',
      },
      operation: null,
    }),
  ).toMatchObject({ status: 'installed', version: '1.2.3' });
});

it('an unconfirmed status during a new request retains the accepted operation', () => {
  const saved = operation('pending-query');
  expect(currentOperation(saved)).toEqual(saved);
});

it('an interrupted update keeps the previous installation without reporting success', () => {
  expect(
    currentOperation(operation('update'), {
      installation: {
        status: 'installed',
        version: '1.0.0',
        readiness: 'not-checked',
      },
      operation: null,
    }),
  ).toMatchObject({
    status: 'failed',
    failure: expect.stringContaining('interrupted'),
  });
});

it('opening an update confirmation ignores the previous completed installation', () => {
  const previous: AgentInstallOperation = {
    ...operation('previous'),
    status: 'installed',
  };

  expect(
    currentOperation(undefined, status(previous), previous.operationId),
  ).toBeUndefined();
});
