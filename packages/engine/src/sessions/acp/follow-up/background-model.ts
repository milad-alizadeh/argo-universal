import type { SetSessionConfigOptionRequest } from '@agentclientprotocol/sdk';
import type {
  SessionConfigOption,
  SuggestionModelChoice,
} from '@repo/contracts';
import {
  readSuggestionModel,
  requireInstalledAgent,
  type AcpSessionLease,
  type DeferredAgentLaunch,
} from '../../../agents';
import { modelValues } from '../../../agents/servers/suggestion-models';
import type { BackgroundRequest } from './background-request';

export async function backgroundLaunch({
  context,
  controller,
}: BackgroundRequest): Promise<DeferredAgentLaunch> {
  const { installedAgents } = context.input.acp;

  return installedAgents.launch(
    requireInstalledAgent(installedAgents, context.agent),
    context.projectId,
    { signal: controller.signal },
  );
}

type PredictionModel = { configId: string; value: string };

// The Agent's suggestion model when this background session offers it; otherwise the Session's own model, as before.
export function predictionModel(
  input: BackgroundRequest,
  lease: AcpSessionLease,
): PredictionModel | undefined {
  const { database } = input.context.input;
  const choice = readSuggestionModel(database, input.context.agent);

  return chosenModel(choice, lease) ?? sessionModel(input, lease);
}

function chosenModel(
  choice: SuggestionModelChoice,
  lease: AcpSessionLease,
): PredictionModel | undefined {
  if (choice.type !== 'model') return undefined;

  const option = offeringOption(lease, choice.value);

  return option && { configId: option.id, value: choice.value };
}

// The background session's model option, when it offers this value.
const offeringOption = (
  lease: AcpSessionLease,
  value: string,
): { id: string } | undefined =>
  lease.response.configOptions?.find(
    (candidate) =>
      candidate.category === 'model' &&
      modelValues(candidate).some((model) => model.value === value),
  );

function sessionModel(
  input: BackgroundRequest,
  lease: AcpSessionLease,
): PredictionModel | undefined {
  const option = input.context.configOptions
    .filter(
      (candidate): candidate is ModelOption => candidate.type === 'select',
    )
    .find(
      (candidate) =>
        candidate.category === 'model' && hasModel(lease, candidate),
    );

  return option && { configId: option.configId, value: option.currentValue };
}

function hasModel(
  lease: AcpSessionLease,
  option: SessionConfigOption,
): boolean {
  return (
    lease.response.configOptions?.some(
      (candidate) => candidate.id === option.configId,
    ) === true
  );
}

export async function applyPredictionModel(
  input: BackgroundRequest,
  lease: AcpSessionLease,
  model: PredictionModel,
): Promise<void> {
  input.context.acpResponseReaders['session/set_config_option'].parse(
    await lease.agent.request<unknown>(
      'session/set_config_option',
      modelParams(lease, model),
      { cancellationSignal: input.controller.signal },
    ),
  );
}

function modelParams(
  lease: AcpSessionLease,
  model: PredictionModel,
): SetSessionConfigOptionRequest {
  return {
    sessionId: lease.sessionId,
    configId: model.configId,
    value: model.value,
  };
}

type ModelOption = Extract<SessionConfigOption, { type: 'select' }>;
