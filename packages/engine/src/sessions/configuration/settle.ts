import type { SessionConfigOption } from '@repo/contracts';
import type { FailureParameters, SessionContext } from '../session-context';
import { withoutHeldChoice } from './held-options';
import { isOfferedConfigChoice } from './offered';
import { storedOptions } from './report';
import { sessionChoicesJob } from './store';
import type { ConfigChoice, ConfigurationStep } from './values';

// How the Agent answered the choice the Session sent: with its options now, or with an error.
export type ChoiceOutcome =
  | { options: SessionConfigOption[] }
  | FailureParameters;

// The caller of an applied choice sees the Agent's options.
function appliedChoice(
  context: SessionContext,
  options: SessionConfigOption[],
): ConfigurationStep {
  const stored = storedOptions(context, options, context.applyingConfig);

  context.applyingConfig?.applied?.resolve(options);

  return { ...stored, change: { ...stored.change, applyingConfig: null } };
}

const invalidChoice = (context: SessionContext): ConfigChoice | null =>
  context.applyingConfig &&
  !isOfferedConfigChoice(context.configOptions, context.applyingConfig)
    ? context.applyingConfig
    : null;

const heldWrites = (
  context: SessionContext,
  invalid: ConfigChoice | null,
  heldConfig: SessionContext['heldConfig'],
): ConfigurationStep['writes'] =>
  invalid?.held ? [{ job: sessionChoicesJob(context, { heldConfig }) }] : [];

const failureChange = (
  context: SessionContext,
  heldConfig: SessionContext['heldConfig'],
): ConfigurationStep['change'] => ({
  applyingConfig: null,
  heldConfig,
  configQueue: context.configQueue.filter((choice) => !choice.held),
});

// A failed choice drops the held choices still queued; one the Agent no longer offers also leaves the stored held choices.
function failedChoice(
  context: SessionContext,
  failure: FailureParameters,
): ConfigurationStep {
  context.applyingConfig?.applied?.reject(failure.error);
  const invalid = invalidChoice(context);
  const heldConfig = withoutHeldChoice(context.heldConfig, invalid);

  return {
    change: failureChange(context, heldConfig),
    writes: heldWrites(context, invalid, heldConfig),
  };
}

export const settleChoice = (
  context: SessionContext,
  outcome: ChoiceOutcome,
): ConfigurationStep =>
  'options' in outcome
    ? appliedChoice(context, outcome.options)
    : failedChoice(context, outcome);
