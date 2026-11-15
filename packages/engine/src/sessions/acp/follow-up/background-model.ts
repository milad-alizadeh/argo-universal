import type { SetSessionConfigOptionRequest } from '@agentclientprotocol/sdk';
import type { SessionConfigOption } from '@repo/contracts';
import {
  requireInstalledAgent,
  type AcpSessionLease,
  type DeferredAgentLaunch,
} from '../../../agents';
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

export function predictionModel(
  input: BackgroundRequest,
  lease: AcpSessionLease,
): ModelOption | undefined {
  return input.context.configOptions
    .filter((option): option is ModelOption => option.type === 'select')
    .find((option) => option.category === 'model' && hasModel(lease, option));
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
  model: ModelOption,
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
  model: ModelOption,
): SetSessionConfigOptionRequest {
  return {
    sessionId: lease.sessionId,
    configId: model.configId,
    value: model.currentValue,
  };
}

type ModelOption = Extract<SessionConfigOption, { type: 'select' }>;
