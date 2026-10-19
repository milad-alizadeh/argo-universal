import type { InitializeResponse } from '@agentclientprotocol/sdk';
import type { AgentLaunch } from '../../agent-launch';

/*
 * Grok accepts ACP image blocks but omits image:true in initialize.
 * https://github.com/phuryn/grok-build-vscode/blob/main/research/vision-input.md
 */
export function vendorInitialization(
  launch: Pick<AgentLaunch, 'registryId'>,
  initialization: InitializeResponse,
): InitializeResponse {
  if (launch.registryId !== 'grok-build') return initialization;

  return withImagePrompts(initialization);
}

function withImagePrompts(
  initialization: InitializeResponse,
): InitializeResponse {
  return {
    ...initialization,
    agentCapabilities: {
      ...initialization.agentCapabilities,
      promptCapabilities: {
        ...initialization.agentCapabilities?.promptCapabilities,
        image: true,
      },
    },
  };
}
