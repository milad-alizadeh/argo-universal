import type { ToolCallUpdate } from '@repo/contracts';
import { recordedAcpContent } from '../../../../lib/product/acp-feed-content.mocks';
import type { FeedGroup } from '../../view/feed-view';
import { toFeedView } from '../../view/to-feed-view';
import { recordedToolCall } from '../tool-call.mocks';
import type { ToolCallGroupProps } from './tool-call-group';
import { renderOperationActivity } from './tool-call-group-preview.mocks';

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
    state: 'settled',
    status: 'completed',
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

// The Agent called operation_run before loading its schema and named no Operation.
const untargeted: ToolCallUpdate = {
  ...agentCall('untargeted-call', 3),
  status: 'failed',
  rawInput: { server, tool: 'operation_run', arguments: {} },
};

const feedParams = (sessionId: string) => ({ sessionId, limit: 3 });

// Two parallel `session.feed` calls: the Agent's row for each and the Engine's row for the same call.
const parallelFeedCalls = ['first', 'second'].flatMap((sessionId, index) => {
  const params = feedParams(sessionId);

  const agent: ToolCallUpdate = {
    ...agentCall(`toolu-${index}`, index),
    rawInput: {
      server,
      tool: 'operation_run',
      arguments: { id: 'session.feed', params },
    },
  };

  const engine: ToolCallUpdate = {
    ...agent,
    id: `argo:feed-${index}`,
    toolCallId: `feed-${index}`,
    name: 'session.feed',
    title: 'Read Session messages',
    kind: 'other',
    position: index + 2,
    rawInput: params,
    _meta: { argo: { operationIcon: 'message' } },
  };

  return [agent, engine];
});

function operationGroup(rows: ToolCallUpdate[]): FeedGroup {
  const group = toFeedView(rows, snapshot).items.find(
    (item): item is FeedGroup => item.type === 'group',
  );

  if (!group) throw new Error('Operation preview needs a Tool call group');

  return group;
}

type OperationStoryArgs = Pick<
  ToolCallGroupProps,
  'group' | 'initialOpen' | 'renderActivity'
>;

export const settledOperations = {
  group: operationGroup([
    agentCall('session.feed', 0),
    plugin,
    recorded,
    untargeted,
  ]),
  initialOpen: true,
  renderActivity: renderOperationActivity,
} satisfies OperationStoryArgs;

export const runningOperations = {
  renderActivity: renderOperationActivity,
  group: operationGroup([
    { ...agentCall('session.feed', 0), state: 'open', status: 'in_progress' },
  ]),
} satisfies OperationStoryArgs;

// The Agent's rows and the Engine's rows arrive together, as stored; the Feed draws each call once.
export const parallelOperations = {
  group: operationGroup(
    parallelFeedCalls.toSorted((a, b) => a.id.localeCompare(b.id)),
  ),
  initialOpen: true,
  renderActivity: renderOperationActivity,
} satisfies OperationStoryArgs;
