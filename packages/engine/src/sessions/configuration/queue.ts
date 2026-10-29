import {
  setConfigEvent,
  type SessionCommand,
  type SessionContext,
  type SessionWrite,
} from '../session-context';

export type ConfigChoice = Extract<
  SessionCommand,
  { type: typeof setConfigEvent }
>;

// What a configuration step changes in the Session, and what it asks the writer to store.
export type ConfigChange<Keys extends keyof SessionContext> = {
  change: Pick<SessionContext, Keys>;
  writes: SessionWrite[];
};

export const queueConfigChoice = (
  context: SessionContext,
  choice: ConfigChoice,
): Pick<SessionContext, 'configQueue'> => ({
  configQueue: [...context.configQueue, choice],
});

export const releaseHeldConfig = (
  context: SessionContext,
): Pick<SessionContext, 'configQueue'> => ({
  configQueue: [
    ...context.configQueue,
    ...context.heldConfig.map((choice): ConfigChoice => ({
      type: setConfigEvent,
      ...choice,
      held: true,
    })),
  ],
});

export const takeConfigChoice = (
  context: SessionContext,
): Pick<SessionContext, 'applyingConfig' | 'configQueue'> => ({
  applyingConfig: context.configQueue[0] ?? null,
  configQueue: context.configQueue.slice(1),
});

export const acknowledgeConfigChoice = (
  context: SessionContext,
): Pick<SessionContext, 'applyingConfig'> => {
  context.applyingConfig?.applied?.resolve(context.configOptions);

  return { applyingConfig: null };
};

const rejectChoice = (choice: ConfigChoice | null, error: Error): void =>
  choice?.applied?.reject(error);

export const rejectPendingConfig = (
  context: SessionContext,
): Pick<SessionContext, 'configQueue' | 'applyingConfig'> => {
  const error = new Error('Session closed before configuration completed');
  rejectChoice(context.applyingConfig, error);

  for (const config of context.configQueue) rejectChoice(config, error);

  return { configQueue: [], applyingConfig: null };
};
