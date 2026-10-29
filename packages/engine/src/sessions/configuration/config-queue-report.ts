import type { SessionConfigOption } from '@repo/contracts';
import { isOfferedConfigChoice } from '../admission/config-admission';
import { AgentOptionsJob } from '../agent-options/agent-options-storage';
import type {
  FailureParameters,
  SessionContext,
  SessionWrite,
} from '../session-context';
import { SessionRowUpdateJob } from '../session-storage/session-storage';
import { toConfigValues } from './config-choices';
import type { ConfigChange, ConfigChoice } from './config-queue-types';
import { withoutHeldChoice } from './held-configuration';

const isHeld = (choice: ConfigChoice | null): boolean => Boolean(choice?.held);

const appliedHeldChoice = (
  context: SessionContext,
  answeredChoice: boolean,
): ConfigChoice | null =>
  answeredChoice && isHeld(context.applyingConfig)
    ? context.applyingConfig
    : null;

const optionsWrite = (
  context: SessionContext,
  options: SessionConfigOption[],
): SessionWrite => ({
  job: new AgentOptionsJob(
    { agent: context.agent, projectId: context.projectId },
    options,
    { authoritative: true },
  ),
});

const configWrite = (
  context: SessionContext,
  configValues: SessionContext['configValues'],
  heldConfig: SessionContext['heldConfig'],
): SessionWrite => ({
  job: new SessionRowUpdateJob({
    id: context.sessionId,
    set: { configValues, heldConfig },
  }),
});

type ConfigValues = Pick<SessionContext, 'configValues' | 'heldConfig'>;

const reportWrites = (
  context: SessionContext,
  options: SessionConfigOption[],
  values: ConfigValues,
): SessionWrite[] => [
  optionsWrite(context, options),
  configWrite(context, values.configValues, values.heldConfig),
];

const rejectionChange = (
  context: SessionContext,
  heldConfig: SessionContext['heldConfig'],
): ConfigChange<'applyingConfig' | 'heldConfig' | 'configQueue'>['change'] => ({
  applyingConfig: null,
  heldConfig,
  configQueue: context.configQueue.filter((choice) => !choice.held),
});

const invalidChoice = (context: SessionContext): ConfigChoice | null =>
  context.applyingConfig &&
  !isOfferedConfigChoice(context.configOptions, context.applyingConfig)
    ? context.applyingConfig
    : null;

const invalidWrites = (
  context: SessionContext,
  invalid: ConfigChoice | null,
  heldConfig: SessionContext['heldConfig'],
): SessionWrite[] =>
  invalid?.held
    ? [
        {
          job: new SessionRowUpdateJob({
            id: context.sessionId,
            set: { heldConfig },
          }),
        },
      ]
    : [];

// The Agent's options are now `options`: remember them and store them on the Session and its Agent.
export const applyConfigurationReport = (
  context: SessionContext,
  options: SessionConfigOption[],
  answeredChoice: boolean,
): ConfigChange<'configOptions' | 'configValues' | 'heldConfig'> => {
  const configValues = toConfigValues(options);

  const applied = appliedHeldChoice(context, answeredChoice);

  const heldConfig = withoutHeldChoice(context.heldConfig, applied);

  return {
    change: { configOptions: options, configValues, heldConfig },
    writes: reportWrites(context, options, { configValues, heldConfig }),
  };
};

// A failed choice drops the held choices still queued; one the Agent no longer offers also leaves the stored held choices.
export const rejectConfigChoice = (
  context: SessionContext,
  failure: FailureParameters,
): ConfigChange<'applyingConfig' | 'heldConfig' | 'configQueue'> => {
  context.applyingConfig?.applied?.reject(failure.error);

  const invalid = invalidChoice(context);

  const heldConfig = withoutHeldChoice(context.heldConfig, invalid);

  return {
    change: rejectionChange(context, heldConfig),
    writes: invalidWrites(context, invalid, heldConfig),
  };
};
