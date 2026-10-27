import type { StateUpdate } from '@agentclientprotocol/sdk';
import { StopReason } from '@repo/contracts';
import { readAcpUsage } from '../agents';
import { acpTurnUsage } from '../sessions/acp/prompts/usage';
import type { SubagentWorkState } from './work';

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
