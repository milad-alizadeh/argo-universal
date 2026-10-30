import type { TerminalOutputResponse } from '@agentclientprotocol/sdk';
import type { PendingPermission, ToolCallUpdate } from '@repo/contracts';
import { assert, expect } from 'vitest';
import type { OperationWaitClock } from '../src/operations';
import { emptySessionInput, startAcpEngine } from './acp-engine';
import { waitForAcpSessionIdle, waitForAcpSnapshot } from './acp-feed';
import { hookRecords } from './hook-plugins';
import {
  autoAllowPlugin,
  permissionScenario,
} from './native-permission-scenario';
import { beginHeldTurn } from './operation-race';
import { runOperation } from './operations';
import { openAccessSession } from './session-access';

export async function permissionJourney(
  operationWaitClock?: OperationWaitClock,
): Promise<PermissionJourney> {
  const outputs: TerminalOutputResponse[] = [];
  const release = Promise.withResolvers<void>();

  const host = await startAcpEngine(
    permissionScenario(outputs, release, operationWaitClock),
  );

  expect(
    await host.caller.plugin.activate({ pluginId: autoAllowPlugin }),
  ).toMatchObject({ state: 'running', error: null });

  const session = await openAccessSession({ host, outputs }, 'Caller');

  const target = await openTarget(host);

  return { host, session, target, release, outputs };
}

const openTarget = async (host: Host): Promise<{ sessionId: string }> => {
  const target = await host.caller.session.new({
    ...emptySessionInput,
    prompt: [{ type: 'text', text: 'Target' }],
  });

  await waitForAcpSessionIdle(host, target.sessionId);

  return target;
};

type Host = Awaited<ReturnType<typeof startAcpEngine>>;

export type PermissionJourney = {
  host: Host;
  session: Awaited<ReturnType<typeof openAccessSession>>;
  target: { sessionId: string };
  release: PromiseWithResolvers<void>;
  outputs: TerminalOutputResponse[];
};

export async function askArchive(
  journey: PermissionJourney,
): Promise<AskedArchive> {
  const { host, session, target } = journey;
  await beginHeldTurn(host, session.sessionId);

  const outcome = archiveOutcome(session, target);

  const { request, configOptions } = await archiveRequest(
    host,
    session,
    outcome,
  );

  await verifyArchivePermission(host, configOptions);

  return { request, outcome };
}

const verifyArchivePermission = async (
  host: Host,
  configOptions: Awaited<
    ReturnType<typeof waitForAcpSnapshot>
  >['configOptions'],
): Promise<void> => {
  expect(configOptions).toContainEqual(
    expect.objectContaining({ configId: 'mode', currentValue: 'bypass' }),
  );
  expect(await hookRecords(host.home, autoAllowPlugin)).toEqual([]);
};

const archiveOutcome = (
  session: PermissionJourney['session'],
  target: PermissionJourney['target'],
): AskedArchive['outcome'] =>
  Promise.allSettled([
    runOperation(session.caller.operations, {
      id: 'session.archive',
      params: target,
      wait: true,
    }),
  ]);

type ArchiveRequest = {
  request: PendingPermission;
  configOptions: Awaited<
    ReturnType<typeof waitForAcpSnapshot>
  >['configOptions'];
};

const archiveRequest = async (
  host: Host,
  session: PermissionJourney['session'],
  outcome: AskedArchive['outcome'],
): Promise<ArchiveRequest> => {
  const pending = archivePending(host, session.sessionId);

  expect(await Promise.race([pending.then(() => 'permission'), outcome])).toBe(
    'permission',
  );
  const { pendingPermission: request, configOptions } = await pending;

  assert(request);

  return { request, configOptions };
};

const archivePending = (
  host: Host,
  sessionId: string,
): ReturnType<typeof waitForAcpSnapshot> =>
  waitForAcpSnapshot(
    host,
    sessionId,
    (value) => value.pendingPermission !== null,
  );

type AskedArchive = {
  request: PendingPermission;
  outcome: Promise<PromiseSettledResult<unknown>[]>;
};

export async function permissionRow(
  journey: PermissionJourney,
  request: PendingPermission,
): Promise<ToolCallUpdate> {
  const row = await journey.host.caller.feed.row({
    sessionId: journey.session.sessionId,
    id: `argo:${request.toolCallId}`,
  });

  assert(row?.sessionUpdate === 'tool_call_update');

  return row;
}

export function answerPermission(
  journey: PermissionJourney,
  request: PendingPermission,
  optionId: string,
): Promise<object> {
  return journey.host.caller.session.answerPermission({
    sessionId: journey.session.sessionId,
    requestId: request.requestId,
    optionId,
  });
}
