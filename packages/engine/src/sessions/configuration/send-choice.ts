import type { SessionConfigOption } from '@repo/contracts';
import type { createRejectionCounter } from '@repo/machine-log';
import type { AcpSessionLease, createAcpResponseReaders } from '../../agents';
import { readAcpConfiguration } from '../acp/acp-configuration';
import {
  hasChoice,
  isOfferedConfigChoice,
  requireOfferedChoice,
  takeNextChoice,
  type AgentConfigValue,
} from './choices';

// The Agent session a choice goes to, with the readers that check its reply.
export type ConfigurationTarget = {
  lease: AcpSessionLease;
  readers: ReturnType<typeof createAcpResponseReaders>;
  rejections: ReturnType<typeof createRejectionCounter>;
};

const choiceParameters = (
  configId: string,
  value: AgentConfigValue['value'],
): AgentConfigValue & { type?: 'boolean' } => ({
  configId,
  value,
  ...(typeof value === 'boolean' && { type: 'boolean' }),
});

// The one sender of `session/set_config_option`; the Agent replies with every option it now offers.
export async function sendConfigChoice(
  target: ConfigurationTarget,
  { configId, value }: AgentConfigValue,
): Promise<SessionConfigOption[]> {
  const response = await target.lease.agent.request<unknown>(
    'session/set_config_option',
    { sessionId: target.lease.sessionId, ...choiceParameters(configId, value) },
  );

  const { configOptions } =
    target.readers['session/set_config_option'].parse(response);

  return readAcpConfiguration(configOptions, target.rejections);
}

/*
 * `required` choices must be offered and must stick, as a Session's durable choices must; other choices the
 * Agent no longer offers are skipped, as Agent options picked before Send are.
 */
type ChoiceList = {
  options: SessionConfigOption[];
  choices: AgentConfigValue[];
  required: boolean;
};

const admits = (
  options: SessionConfigOption[],
  choice: AgentConfigValue,
  required: boolean,
): boolean => {
  if (required) requireOfferedChoice(options, choice);

  return isOfferedConfigChoice(options, choice) && !hasChoice(options, choice);
};

function requireRestored(
  options: SessionConfigOption[],
  choice: AgentConfigValue,
): void {
  if (!hasChoice(options, choice))
    throw new Error(
      `The Agent did not restore ${choice.configId}=${String(choice.value)}`,
    );
}

async function applyChoice(
  target: ConfigurationTarget,
  list: ChoiceList,
  choice: AgentConfigValue,
): Promise<SessionConfigOption[]> {
  if (!admits(list.options, choice, list.required)) return list.options;

  const options = await sendConfigChoice(target, choice);

  if (list.required) requireRestored(options, choice);

  return options;
}

// Sends each choice the Agent does not already run with, in Starting choices order: the model first.
export async function applyChoices(
  target: ConfigurationTarget,
  list: ChoiceList,
  signal: AbortSignal,
): Promise<SessionConfigOption[]> {
  const pending = [...list.choices];
  let { options } = list;

  for (let choice = takeNextChoice(pending, options); choice;) {
    signal.throwIfAborted();
    options = await applyChoice(target, { ...list, options }, choice);
    choice = takeNextChoice(pending, options);
  }

  signal.throwIfAborted();

  return options;
}
