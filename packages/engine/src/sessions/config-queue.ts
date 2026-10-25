import type { SessionConfigOption } from '@repo/contracts';
import { assertEvent } from 'xstate';
import { readAcpConfiguration } from './acp/acp-configuration';
import { isOfferedConfigChoice } from './admission/config-admission';
import { AgentOptionsJob } from './agent-options-storage';
import { toConfigValues } from './configuration/config-choices';
import {
  withHeldConfiguration,
  withoutHeldChoice,
} from './configuration/held-configuration';
import {
  acpUpdateEvent,
  setConfigEvent,
  type FailureParameters,
  type SessionCommand,
  type SessionContext,
  type SessionEvent,
  type SessionWrite,
} from './session-context';
import { SessionRowUpdateJob } from './session-storage';

export type ConfigChoice = Extract<
  SessionCommand,
  { type: typeof setConfigEvent }
>;

type ConfigChange<Keys extends keyof SessionContext> = {
  change: Pick<SessionContext, Keys>;
  writes: SessionWrite[];
};

// The Agent's own report of its options, when this update carries one.
export const readConfigurationUpdate = (
  context: SessionContext,
  event: SessionEvent,
): SessionConfigOption[] | undefined => {
  assertEvent(event, acpUpdateEvent);
  const update = event.notification.update;

  if (update.sessionUpdate !== 'config_option_update') return undefined;

  try {
    return readAcpConfiguration(
      update.configOptions,
      context.acpConfigurationRejections,
    );
  } catch {
    return undefined;
  }
};

export const queueConfigChoice = (
  context: SessionContext,
  choice: ConfigChoice,
): Pick<SessionContext, 'configQueue'> => ({
  configQueue: [...context.configQueue, choice],
});

// A choice made while a Turn runs is stored with the Session and applies when the Agent is idle; its caller sees the held value once the row commits.
export const holdConfigChoice = (
  context: SessionContext,
  choice: ConfigChoice,
): ConfigChange<'heldConfig'> => {
  const heldConfig = [
    ...context.heldConfig.filter(
      ({ configId }) => configId !== choice.configId,
    ),
    { configId: choice.configId, value: choice.value },
  ];

  return {
    change: { heldConfig },
    writes: [
      {
        job: new SessionRowUpdateJob({
          id: context.sessionId,
          set: { heldConfig },
        }),
        committed: {
          resolve: () =>
            choice.applied?.resolve(
              withHeldConfiguration(context.configOptions, heldConfig),
            ),
          reject: (cause: unknown) => choice.applied?.reject(cause),
        },
      },
    ],
  };
};

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

// The Agent's options are now `options`: remember them and store them on the Session and its Agent.
export const applyConfigurationReport = (
  context: SessionContext,
  options: SessionConfigOption[],
  answeredChoice: boolean,
): ConfigChange<'configOptions' | 'configValues' | 'heldConfig'> => {
  const configValues = toConfigValues(options);

  const applied =
    answeredChoice && context.applyingConfig?.held
      ? context.applyingConfig
      : null;

  const heldConfig = withoutHeldChoice(context.heldConfig, applied);

  return {
    change: { configOptions: options, configValues, heldConfig },
    writes: [
      {
        job: new AgentOptionsJob(
          { agent: context.agent, projectId: context.projectId },
          options,
          { authoritative: true },
        ),
      },
      {
        job: new SessionRowUpdateJob({
          id: context.sessionId,
          set: { configValues, heldConfig },
        }),
      },
    ],
  };
};

export const acknowledgeConfigChoice = (
  context: SessionContext,
): Pick<SessionContext, 'applyingConfig'> => {
  context.applyingConfig?.applied?.resolve(context.configOptions);

  return { applyingConfig: null };
};

// A failed choice drops the held choices still queued; one the Agent no longer offers also leaves the stored held choices.
export const rejectConfigChoice = (
  context: SessionContext,
  failure: FailureParameters,
): ConfigChange<'applyingConfig' | 'heldConfig' | 'configQueue'> => {
  context.applyingConfig?.applied?.reject(failure.error);

  const invalid =
    context.applyingConfig &&
    !isOfferedConfigChoice(context.configOptions, context.applyingConfig)
      ? context.applyingConfig
      : null;

  const heldConfig = withoutHeldChoice(context.heldConfig, invalid);

  return {
    change: {
      applyingConfig: null,
      heldConfig,
      configQueue: context.configQueue.filter((choice) => !choice.held),
    },
    writes: invalid?.held
      ? [
          {
            job: new SessionRowUpdateJob({
              id: context.sessionId,
              set: { heldConfig },
            }),
          },
        ]
      : [],
  };
};

export const rejectPendingConfig = (
  context: SessionContext,
): Pick<SessionContext, 'configQueue' | 'applyingConfig'> => {
  const error = new Error('Session closed before configuration completed');
  context.applyingConfig?.applied?.reject(error);

  for (const config of context.configQueue) config.applied?.reject(error);

  return { configQueue: [], applyingConfig: null };
};
