import type { PendingPermission } from '@repo/contracts';
import { waitForAcpSnapshot } from './acp-feed';
import { fixtureRegistry } from './agent-fixtures';
import {
  permissionJourney,
  answerPermission,
  type PermissionJourney,
} from './native-permission';
import { beginHeldTurn } from './operation-race';
import { operationRaceHost } from './operation-race';
import { TestOperationWaitClock } from './operation-wait-clock';
import { publishControlAddress } from './operations';

// CLI tests use the real Engine/ACP/Permission path and control only its observation clock.
type PermissionWaitHost = {
  home: string;
  token: string;
  target: { sessionId: string };
  permission: () => Promise<void>;
  advance: (milliseconds: number) => void;
  waitStarted: () => Promise<void>;
  answer: (optionId: string) => Promise<void>;
};

export async function startPermissionWaitHost(): Promise<PermissionWaitHost> {
  const clock = new TestOperationWaitClock();
  const journey = await permissionJourney(clock);
  await beginHeldTurn(journey.host, journey.session.sessionId);
  publishControlAddress(journey.host);

  return permissionWaitHost(journey, clock);
}

const permissionWaitHost = (
  journey: PermissionJourney,
  clock: TestOperationWaitClock,
): PermissionWaitHost => {
  const pending = (): Promise<PendingPermission> =>
    pendingPermission(journey.host, journey.session.sessionId);

  return {
    home: journey.host.home,
    token: journey.session.token,
    target: journey.target,
    ...permissionWaitActions(journey, clock, pending),
  };
};

type PermissionActions = Pick<
  PermissionWaitHost,
  'permission' | 'advance' | 'waitStarted' | 'answer'
>;

const permissionWaitActions = (
  journey: PermissionJourney,
  clock: TestOperationWaitClock,
  pending: () => Promise<PendingPermission>,
): PermissionActions => ({
  permission: async () => {
    await pending();
  },
  advance: (milliseconds) => clock.advance(milliseconds),
  waitStarted: () => clock.waitUntilScheduled(),
  answer: async (optionId) => {
    await answerPermission(journey, await pending(), optionId);
  },
});

const pendingPermission = async (
  host: PermissionJourney['host'],
  sessionId: string,
): Promise<PendingPermission> => {
  const snapshot = await waitForAcpSnapshot(
    host,
    sessionId,
    (value) => value.pendingPermission !== null,
  );

  if (!snapshot.pendingPermission) throw new Error('No Permission request');

  return snapshot.pendingPermission;
};

export { openingWaitHost } from './operation-opening';

type RegistryWaitHost = {
  home: string;
  token: string;
  calls: () => number;
  answer: () => Promise<void>;
  result: () => ReturnType<
    Awaited<
      ReturnType<typeof operationRaceHost>
    >['host']['caller']['registry']['get']
  >;
};

export async function startRegistryWaitHost(): Promise<RegistryWaitHost> {
  const counter = registryCounter();
  const { host, session } = await operationRaceHost(undefined, counter.fetch);
  await beginHeldTurn(host, session.sessionId);
  publishControlAddress(host);

  return registryWaitHost(host, session, counter);
}

type RegistryCounter = { fetch: () => Promise<string>; calls: () => number };

const registryCounter = (): RegistryCounter => {
  let calls = 0;

  const registry = fixtureRegistry([
    { agent: 'mock', label: 'Registry '.repeat(10_000), logo: '' },
  ]);

  return {
    calls: () => calls,
    fetch: async (): Promise<string> => {
      calls++;

      return JSON.stringify(registry);
    },
  };
};

const registryWaitHost = (
  host: PermissionJourney['host'],
  session: PermissionJourney['session'],
  counter: RegistryCounter,
): RegistryWaitHost => {
  const initialCalls = counter.calls();

  return {
    home: host.home,
    token: session.token,
    calls: () => counter.calls() - initialCalls,
    result: () => host.caller.registry.get(),
    answer: () => answerRegistry(host, session.sessionId),
  };
};

const answerRegistry = async (
  host: PermissionJourney['host'],
  sessionId: string,
): Promise<void> => {
  const request = await registryPermission(host, sessionId);

  await host.caller.session.answerPermission({
    sessionId,
    requestId: request.requestId,
    optionId: 'allow_once',
  });
};

const registryPermission = async (
  host: PermissionJourney['host'],
  sessionId: string,
): Promise<PendingPermission> => {
  const snapshot = await waitForAcpSnapshot(
    host,
    sessionId,
    (value) => value.pendingPermission !== null,
  );

  if (!snapshot.pendingPermission) throw new Error('No Registry Permission');

  return snapshot.pendingPermission;
};
