import type { SessionConfigOption } from '@repo/contracts';
import { assertEvent } from 'xstate';
import { readAcpConfiguration } from '../acp/acp-configuration';
import {
  acpUpdateEvent,
  setConfigEvent,
  type SessionContext,
  type SessionEvent,
} from '../session-context';
import type { ConfigChoice } from './config-queue-types';

export type { ConfigChoice } from './config-queue-types';

export { holdConfigChoice } from './config-queue-held';

export {
  applyConfigurationReport,
  rejectConfigChoice,
} from './config-queue-report';

type ConfigUpdate = Extract<
  Extract<
    SessionEvent,
    { type: typeof acpUpdateEvent }
  >['notification']['update'],
  { sessionUpdate: 'config_option_update' }
>;

function readOptions(
  context: SessionContext,
  update: ConfigUpdate,
): SessionConfigOption[] | undefined {
  try {
    return readAcpConfiguration(
      update.configOptions,
      context.acpConfigurationRejections,
    );
  } catch {
    return undefined;
  }
}

// The Agent's own report of its options, when this update carries one.
export const readConfigurationUpdate = (
  context: SessionContext,
  event: SessionEvent,
): SessionConfigOption[] | undefined => {
  assertEvent(event, acpUpdateEvent);
  const update = event.notification.update;

  if (update.sessionUpdate !== 'config_option_update') return undefined;

  return readOptions(context, update);
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
