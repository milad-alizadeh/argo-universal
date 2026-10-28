import type { PendingPermission } from '@repo/contracts';
import { waitForAcpSnapshot } from './acp-feed';
import { permissionJourney, answerPermission } from './native-permission';
import { beginHeldTurn } from './operation-race';
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
