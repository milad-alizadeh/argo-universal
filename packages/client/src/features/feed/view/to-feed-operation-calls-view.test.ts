import {
  permissionOptions,
  type SessionSnapshot,
  type SessionUpdate,
  type ToolCallUpdate,
  type VoiceTranscript,
} from '@repo/contracts';
import { operationFeedRowId } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { recordedAcpContent } from '../../../lib/product/acp-feed-content.mocks';
import { call } from './feed-row-facts.mocks';
import type { OperationParams } from './operation-call';
import { toFeedView } from './to-feed-view';

const { snapshot } = recordedAcpContent('agent-1');

const server = 'argo-688241988e5d4453b682b7a37ad4ac62';

const turnId = 'turn-1';

// The Agent's own ACP row for an operation_run call.
const agentCall = (
  n: number,
  params: OperationParams,
  position: number,
): ToolCallUpdate =>
  call({
    id: `["tool_call_update","acp",["upstream","toolu_${n}"]]`,
    toolCallId: `toolu_${n}`,
    turnId,
    position,
    name: 'operation_run',
    title: `${server}: operation_run`,
    kind: 'other',
    state: 'settled',
    status: 'completed',
    rawInput: { id: 'session.feed', params },
  });

// The Engine's row for the same call: one id, the Operation's name and its params.
const engineCall = (
  n: number,
  params: OperationParams,
  position: number,
): ToolCallUpdate =>
  call({
    id: operationFeedRowId(`call-${n}`),
    toolCallId: `call-${n}`,
    turnId,
    position,
    name: 'session.feed',
    title: 'Read Session messages',
    kind: 'other',
    state: 'settled',
    status: 'completed',
    rawInput: params,
  });

const voiceLine = (position: number): VoiceTranscript => ({
  id: 'voice',
  sessionId: 'session',
  turnId: null,
  position,
  revision: 1,
  state: 'settled',
  sessionUpdate: 'voice_transcript',
  messageId: 'voice',
  content: [{ type: 'text', text: "I'll pull that up." }],
});

const calledRowIds = (
  rows: SessionUpdate[],
  shown: SessionSnapshot = snapshot,
): string[][] =>
  toFeedView(rows, shown).items.flatMap((item) => {
    if (item.type === 'group')
      return [
        item.items.flatMap((a) => (a.type === 'tool_call' ? [a.row.id] : [])),
      ];

    return item.type === 'tool_call' ? [[item.row.id]] : [];
  });

const first = { sessionId: 'a', limit: 3 };

const second = { sessionId: 'b', limit: 3 };

const engineIds = [operationFeedRowId('call-1'), operationFeedRowId('call-2')];

it.each([
  { name: 'stored together', between: [] },
  { name: 'split by a Voice line', between: [voiceLine(3)] },
])('draws a pair of parallel calls once when $name', ({ between }) => {
  expect(
    calledRowIds([
      agentCall(1, first, 1),
      agentCall(2, second, 2),
      ...between,
      engineCall(1, first, 4),
      engineCall(2, second, 5),
    ]),
  ).toEqual([engineIds]);
});

it('matches params whatever their key order', () => {
  expect(
    calledRowIds([
      agentCall(1, { limit: 3, sessionId: 'a' }, 1),
      engineCall(1, first, 2),
    ]),
  ).toEqual([[operationFeedRowId('call-1')]]);
});

it('keeps the Agent call a Permission request waits on', () => {
  const waiting = agentCall(1, first, 1);

  const pending = {
    ...snapshot,
    pendingPermission: {
      requestId: 'request-1',
      toolCallId: waiting.toolCallId,
      title: 'Allow call?',
      options: permissionOptions,
    },
  };

  expect(
    calledRowIds([waiting, engineCall(1, first, 2)], pending).flat(),
  ).toContain(waiting.id);
});

it('keeps an Agent call the Engine never recorded, and one whose params differ', () => {
  const lone = agentCall(1, { sessionId: 'a' }, 1);
  const other = agentCall(2, { sessionId: 'b' }, 2);

  expect(
    calledRowIds([lone, other, engineCall(1, { sessionId: 'c' }, 3)]),
  ).toEqual([[lone.id, other.id, operationFeedRowId('call-1')]]);
});

it('folds each Engine row into one Agent call, not several', () => {
  const params = { sessionId: 'a' };

  expect(
    calledRowIds([
      agentCall(1, params, 1),
      agentCall(2, params, 2),
      engineCall(1, params, 3),
    ]),
  ).toEqual([[agentCall(2, params, 2).id, operationFeedRowId('call-1')]]);
});
