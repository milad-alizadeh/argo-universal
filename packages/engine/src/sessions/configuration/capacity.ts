import type { SessionContext } from '../session-context';

const pendingConfigurationLimit = 32;

// A Session queues and holds at most 32 choices at once.
export const hasRoomForChoice = (
  context: Pick<SessionContext, 'configQueue' | 'heldConfig'>,
): boolean =>
  context.configQueue.length + context.heldConfig.length <
  pendingConfigurationLimit;
