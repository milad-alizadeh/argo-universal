import type {
  SessionConfigOption,
  StateUpdate,
} from '@agentclientprotocol/sdk';
import { StopReason } from '@repo/contracts';
import { readAcpUsage } from '../../agents';
import { acpTurnUsage } from '../acp/prompts/usage';
import { TurnUpdateJob } from '../session-storage';
import type { ChildFeed } from './child-feed';
import type { SubagentRouting } from './routing-types';
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

export function updateChildModel(
  { write }: Pick<SubagentRouting, 'write'>,
  child: ChildFeed,
  options: SessionConfigOption[],
): ChildFeed {
  const model = options.find((option) => option.category === 'model');

  return model?.type === 'select'
    ? withModel(write, child, model.currentValue)
    : child;
}

function withModel(
  write: SubagentRouting['write'],
  child: ChildFeed,
  model: string,
): ChildFeed {
  if (model === child.model) return child;

  if (child.turnId)
    write(new TurnUpdateJob({ id: child.turnId, set: { model } }));

  return { ...child, model };
}
