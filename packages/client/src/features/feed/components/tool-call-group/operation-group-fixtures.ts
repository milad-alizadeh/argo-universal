import type { ToolCallUpdate } from '@repo/contracts';
import { recordedAcpContent } from '../../../../lib/product/acp-feed-content.mocks';
import type { FeedGroup } from '../../view/feed-view';
import { toFeedView } from '../../view/to-feed-view';
import { recordedToolCall } from '../tool-call.mocks';

const { snapshot } = recordedAcpContent('agent-1');

const base = recordedToolCall('mcp-raw');

const server = 'argo-688241988e5d4453b682b7a37ad4ac62';

function agentCall(id: string, position: number): ToolCallUpdate {
  return {
    ...base,
    id,
    toolCallId: id,
    title: `${server}: operation_run`,
    name: 'operation_run',
    kind: 'execute',
    position,
    rawInput: { server, tool: 'operation_run', arguments: { id } },
  };
}

const plugin = agentCall('github.discover', 1);

const recorded: ToolCallUpdate = {
  ...plugin,
  id: 'argo:plugin-call',
  toolCallId: 'plugin-call',
  name: 'github.discover',
  title: 'Find pull requests',
  kind: 'other',
  position: 2,
  _meta: { argo: { operationIcon: 'pull-request' } },
};

function operationGroup(rows: ToolCallUpdate[]): FeedGroup {
  const group = toFeedView(rows, snapshot).items.find(
    (item): item is FeedGroup => item.type === 'group',
  );

  if (!group) throw new Error('Operation preview needs a Tool call group');

  return group;
}

export const settledOperations = operationGroup([
  agentCall('session.feed', 0),
  plugin,
  recorded,
]);

export const runningOperations = operationGroup([
  { ...agentCall('session.feed', 0), state: 'open', status: 'in_progress' },
]);
