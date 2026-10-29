import type { SessionConfigOption } from '@repo/contracts';
import { readAcpConfiguration } from '../acp/acp-configuration';
import {
  acpUpdateEvent,
  type FailureParameters,
  type SessionContext,
  type SessionEvent,
  type SessionWrite,
} from '../session-context';
import { isOfferedConfigChoice, toConfigValues } from './choices';
import { withoutHeldChoice } from './held';
import type { ConfigChange, ConfigChoice } from './queue';
import { agentOptionsJob, sessionChoicesJob } from './store';

const readOptions = (
  context: SessionContext,
  options: Parameters<typeof readAcpConfiguration>[0],
): SessionConfigOption[] | undefined => {
  try {
    return readAcpConfiguration(options, context.acpConfigurationRejections);
  } catch {
    return undefined;
  }
};

// The Agent's own report of its options, when this update carries a readable one.
function reportedOptions(
  context: SessionContext,
  event: SessionEvent,
): SessionConfigOption[] | undefined {
  if (event.type !== acpUpdateEvent) return undefined;
  const { update } = event.notification;

  return update.sessionUpdate === 'config_option_update'
    ? readOptions(context, update.configOptions)
    : undefined;
}

type Report = ConfigChange<'configOptions' | 'configValues' | 'heldConfig'>;

type StoredChoices = Pick<SessionContext, 'configValues' | 'heldConfig'>;

const reportWrites = (
  context: SessionContext,
  options: SessionConfigOption[],
  choices: StoredChoices,
): SessionWrite[] => [
  { job: agentOptionsJob(context, options) },
  { job: sessionChoicesJob(context, choices) },
];

const heldChoice = (choice: ConfigChoice | null): ConfigChoice | null =>
  choice?.held ? choice : null;

// The held choice the Agent just answered leaves the held choices.
function storedReport(
  context: SessionContext,
  options: SessionConfigOption[],
  answered: ConfigChoice | null,
): Report {
  const choices = {
    configValues: toConfigValues(options),
    heldConfig: withoutHeldChoice(context.heldConfig, heldChoice(answered)),
  };

  return {
    change: { configOptions: options, ...choices },
    writes: reportWrites(context, options, choices),
  };
}

/*
 * The Agent's options are now those it answered a choice with, or those an update reports: remember them and
 * store them on the Session and its Agent. An update without readable options changes nothing.
 */
export function reportConfiguration(
  context: SessionContext,
  event: SessionEvent,
  answered?: SessionConfigOption[],
): Report | undefined {
  if (answered) return storedReport(context, answered, context.applyingConfig);
  const options = reportedOptions(context, event);

  return options && storedReport(context, options, null);
}

const invalidChoice = (context: SessionContext): ConfigChoice | null =>
  context.applyingConfig &&
  !isOfferedConfigChoice(context.configOptions, context.applyingConfig)
    ? context.applyingConfig
    : null;

type Rejection = ConfigChange<'applyingConfig' | 'heldConfig' | 'configQueue'>;

const rejectionChange = (
  context: SessionContext,
  heldConfig: SessionContext['heldConfig'],
): Rejection['change'] => ({
  applyingConfig: null,
  heldConfig,
  configQueue: context.configQueue.filter((choice) => !choice.held),
});

const invalidHeldWrites = (
  context: SessionContext,
  invalid: ConfigChoice | null,
  heldConfig: SessionContext['heldConfig'],
): SessionWrite[] =>
  invalid?.held ? [{ job: sessionChoicesJob(context, { heldConfig }) }] : [];

// A failed choice drops the held choices still queued; one the Agent no longer offers also leaves the stored held choices.
export const rejectConfigChoice = (
  context: SessionContext,
  failure: FailureParameters,
): Rejection => {
  context.applyingConfig?.applied?.reject(failure.error);
  const invalid = invalidChoice(context);
  const heldConfig = withoutHeldChoice(context.heldConfig, invalid);

  return {
    change: rejectionChange(context, heldConfig),
    writes: invalidHeldWrites(context, invalid, heldConfig),
  };
};
