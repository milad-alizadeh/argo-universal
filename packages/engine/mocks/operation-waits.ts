import type { PendingPermission } from '@repo/contracts';
import { waitForAcpSnapshot } from './acp-feed';
import { fixtureRegistry } from './agent-fixtures';
import { permissionJourney, answerPermission } from './native-permission';
import { beginHeldTurn } from './operation-race';
import { operationRaceHost } from './operation-race';
import { TestOperationWaitClock } from './operation-wait-clock';
import { publishControlAddress } from './operations';

// CLI tests use the real Engine/ACP/Permission path and control only its observation clock.
export async function startPermissionWaitHost(): Promise<{
  home: string;
  token: string;
  target: { sessionId: string };
  permission: () => Promise<void>;
  advance: (milliseconds: number) => void;
  waitStarted: () => Promise<void>;
  answer: (optionId: string) => Promise<void>;
}> {
  const clock = new TestOperationWaitClock();
  const journey = await permissionJourney(clock);
  await beginHeldTurn(journey.host, journey.session.sessionId);
  publishControlAddress(journey.host);

  const pending = async (): Promise<PendingPermission> => {
    const snapshot = await waitForAcpSnapshot(
      journey.host,
      journey.session.sessionId,
      (value) => value.pendingPermission !== null,
    );

    if (!snapshot.pendingPermission) throw new Error('No Permission request');

    return snapshot.pendingPermission;
  };

  return {
    home: journey.host.home,
    token: journey.session.token,
    target: journey.target,
    permission: async () => {
      await pending();
    },
    advance: (milliseconds) => clock.advance(milliseconds),
    waitStarted: () => clock.waitUntilScheduled(),
    answer: async (optionId) => {
      await answerPermission(journey, await pending(), optionId);
    },
  };
}

export { openingWaitHost } from './operation-opening';

export async function startRegistryWaitHost(): Promise<{
  home: string;
  token: string;
  calls: () => number;
  answer: () => Promise<void>;
  result: () => ReturnType<
    Awaited<
      ReturnType<typeof operationRaceHost>
    >['host']['caller']['registry']['get']
  >;
}> {
  let calls = 0;

  const registry = fixtureRegistry([
    { agent: 'mock', label: 'Registry '.repeat(10_000), logo: '' },
  ]);

  const { host, session } = await operationRaceHost(undefined, async () => {
    calls++;

    return JSON.stringify(registry);
  });

  await beginHeldTurn(host, session.sessionId);
  publishControlAddress(host);
  const initialCalls = calls;

  return {
    home: host.home,
    token: session.token,
    calls: () => calls - initialCalls,
    result: () => host.caller.registry.get(),
    answer: async () => {
      const snapshot = await waitForAcpSnapshot(
        host,
        session.sessionId,
        (value) => value.pendingPermission !== null,
      );

      if (!snapshot.pendingPermission)
        throw new Error('No Registry Permission');
      await host.caller.session.answerPermission({
        sessionId: session.sessionId,
        requestId: snapshot.pendingPermission.requestId,
        optionId: 'allow_once',
      });
    },
  };
}
