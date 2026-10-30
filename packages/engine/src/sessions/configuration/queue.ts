import { setConfigEvent, type SessionContext } from '../session-context';
import type { ConfigChoice, ConfigurationStep } from './values';

const changing = (change: Partial<SessionContext>): ConfigurationStep => ({
  change,
  writes: [],
});

export const queueChoice = (
  context: SessionContext,
  choice: ConfigChoice,
): ConfigurationStep =>
  changing({ configQueue: [...context.configQueue, choice] });

// Held choices join the queue once the Turn that held them is over.
export const releaseHeldChoices = (
  context: SessionContext,
): ConfigurationStep =>
  changing({
    configQueue: [
      ...context.configQueue,
      ...context.heldConfig.map((choice): ConfigChoice => ({
        type: setConfigEvent,
        ...choice,
        held: true,
      })),
    ],
  });

// The first queued choice becomes the one the Session sends to the Agent.
export const beginChoice = (context: SessionContext): ConfigurationStep =>
  changing({
    applyingConfig: context.configQueue[0] ?? null,
    configQueue: context.configQueue.slice(1),
  });

const rejectChoice = (choice: ConfigChoice | null, error: Error): void =>
  choice?.applied?.reject(error);

// A closing Session refuses every choice it has not applied yet.
export const abandonChoices = (context: SessionContext): ConfigurationStep => {
  const error = new Error('Session closed before configuration completed');
  rejectChoice(context.applyingConfig, error);

  for (const config of context.configQueue) rejectChoice(config, error);

  return changing({ configQueue: [], applyingConfig: null });
};
