import type { StateUpdate } from '@agentclientprotocol/sdk';
import { StopReason } from '@repo/contracts';
import { readAcpUsage } from '../../../agents';
import type { SubagentWorkState } from '../../subagents/work';
import { acpTurnUsage } from '../prompts/usage';

export function subagentWorkState(
  state: StateUpdate | null | undefined,
): SubagentWorkState {
  if (!state) return {};

  if (state.state !== 'idle') return { state: state.state };

  return {
    state: 'idle',
    stopReason: StopReason.safeParse(state.stopReason).data,
    usage: acpTurnUsage(readAcpUsage(state)),
  };
}
