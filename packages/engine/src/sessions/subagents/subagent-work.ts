import type {
  SessionConfigOption,
  SessionNotification,
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

type ChildWork = Pick<SubagentRouting, 'write'>;

function recordChildModel(
  { write }: ChildWork,
  id: string,
  options: SessionConfigOption[],
): void {
  const model = options.find((option) => option.category === 'model');

  if (model?.type === 'select') {
    write(new TurnUpdateJob({ id, set: { model: model.currentValue } }));
  }
}

export function deliverChildUpdate(
  input: ChildWork,
  children: ReadonlyMap<string, ChildFeed>,
  notification: SessionNotification,
): void {
  const child = children.get(notification.sessionId);

  if (child) updateChild(input, child, notification);
}

function updateChild(
  input: ChildWork,
  child: ChildFeed,
  { update, sessionId }: SessionNotification,
): void {
  if (update.sessionUpdate === 'config_option_update' && child.turnId)
    return recordChildModel(input, child.turnId, update.configOptions);

  child.feed.send({
    type: 'feed.acpUpdate',
    acpSessionId: sessionId,
    update,
    turnId: child.turnId,
  });
}
