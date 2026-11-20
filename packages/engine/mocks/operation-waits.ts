import type { PendingPermission } from '@repo/contracts';
import { waitForAcpSnapshot } from './acp-feed';
import { fixtureRegistry } from './agent-fixtures';
import {
  permissionJourney,
  protectArchiveTarget,
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
  await protectArchiveTarget(journey);
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
  release: () => void;
  waitStarted: () => Promise<void>;
  advance: (milliseconds: number) => void;
  result: () => ReturnType<
    Awaited<
      ReturnType<typeof operationRaceHost>
    >['host']['caller']['registry']['get']
  >;
};

export async function startRegistryWaitHost(): Promise<RegistryWaitHost> {
  const clock = new TestOperationWaitClock();
  const fetch = registryWaitFetch();
  const { host, session } = await operationRaceHost(clock, fetch.read);

  publishControlAddress(host);
  fetch.begin();

  return {
    home: host.home,
    token: session.token,
    calls: fetch.calls,
    result: () => host.caller.registry.get(),
    release: fetch.release,
    ...waitClockActions(clock),
  };
}

type RegistryFetch = {
  read: () => Promise<string>;
  begin: () => void;
  calls: () => number;
  release: () => void;
};

function registryWaitFetch(): RegistryFetch {
  const held = Promise.withResolvers<void>();

  const state = { calls: 0, holding: false };

  return {
    read: () => heldRegistry(state, held.promise, largeRegistry),
    begin: () => {
      state.holding = true;
    },
    calls: () => state.calls,
    release: () => held.resolve(),
  };
}

async function heldRegistry(
  state: { calls: number; holding: boolean },
  gate: Promise<void>,
  registry: string,
): Promise<string> {
  if (state.holding) {
    state.calls++;
    await gate;
  }

  return registry;
}

const largeRegistry = JSON.stringify(
  fixtureRegistry([
    { agent: 'mock', label: 'Registry '.repeat(10_000), logo: '' },
  ]),
);

function waitClockActions(
  clock: TestOperationWaitClock,
): Pick<RegistryWaitHost, 'waitStarted' | 'advance'> {
  return {
    waitStarted: () => clock.waitUntilScheduled(),
    advance: (milliseconds) => clock.advance(milliseconds),
  };
}
