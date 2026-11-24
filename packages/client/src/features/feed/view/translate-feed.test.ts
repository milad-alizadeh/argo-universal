import {
  permissionOptions,
  type SessionSnapshot,
  type SessionUpdate,
  type ToolCallUpdate,
  type VoiceTranscript,
} from '@repo/contracts';
import { operationFeedRowId } from '@repo/contracts/operations';
import { expect, it } from 'vitest';
import { readRow, workMocks } from '../../../../mocks/feed-view.mocks';
import {
  spawnPromptRow,
  spawnRow,
  subagentSnapshot,
} from '../../../../mocks/subagent-rows.mocks';
import { call } from './feed-row-facts.mocks';
import {
  type FeedTranslator,
  toFeedView,
  translateFeed,
  translatingFeed,
} from './to-feed-view';
import { translateTurn } from './translate-turn';

const recorded = workMocks[0];

if (!recorded) throw new Error('Recorded catalog needs an edit-and-command');

const { snapshot } = recorded;

const recordedRows = recorded.rows;

// The recording once per Turn, with every id its own, until the Feed holds a thousand rows.
const copies = Math.ceil(1000 / recorded.rows.length);

const copy = (turn: number): SessionUpdate[] =>
  recorded.rows.map((row) => ({
    ...row,
    id: `${turn}-${row.id}`,
    turnId: `turn-${turn}`,
    position: turn * 1000 + row.position,
    ...('toolCallId' in row && { toolCallId: `${turn}-${row.toolCallId}` }),
  }));

const rows = Array.from({ length: copies }, (_unused, turn) =>
  copy(turn),
).flat();

const lastTurn = copy(copies - 1).length;

// The Feed's translator, and how many rows it has asked the Turn translator for: it asks of each Turn it draws again.
interface CountingFeed {
  translate: FeedTranslator;
  translated: () => number;
}

function countingFeed(): CountingFeed {
  let total = 0;

  const translate = translatingFeed((turn, snapshot, folded) => {
    total += turn.length;

    return translateTurn(turn, snapshot, folded);
  });

  return { translate, translated: () => total };
}

// A chunk of streamed text replaces the newest row with a new object; the reducer keeps every other row as it was.
function withStreamedChunk(text: string): SessionUpdate[] {
  const newest = rows.at(-1);

  if (newest?.sessionUpdate !== 'agent_message') throw new Error('Needs text');

  return [
    ...rows.slice(0, -1),
    { ...newest, content: [{ type: 'text', text }] },
  ];
}

it('translates only the Turn a streamed chunk changed in a 1000-row Feed', () => {
  expect(rows.length).toBeGreaterThanOrEqual(1000);
  const first = translateFeed(rows, snapshot);
  const counting = countingFeed();

  const next = counting.translate(
    withStreamedChunk('one more'),
    snapshot,
    first.turns,
  );

  expect(counting.translated()).toBe(lastTurn);
  expect(next.view.items).toHaveLength(first.view.items.length);
});

it('translates nothing when no row changed', () => {
  const first = translateFeed(rows, snapshot);
  const counting = countingFeed();

  counting.translate([...rows], snapshot, first.turns);

  expect(counting.translated()).toBe(0);
});

it('draws the same items as translating every row again', () => {
  const first = translateFeed(rows, snapshot);
  const streamed = withStreamedChunk('one more');

  expect(translateFeed(streamed, snapshot, first.turns).view).toEqual(
    toFeedView(streamed, snapshot),
  );
});

// What a draw that keeps its Turns must show: the same as translating every row again, here for a change that reaches a Turn whose own rows did not change.
function expectReuseEqualsFresh(
  before: { rows: SessionUpdate[]; snapshot: SessionSnapshot },
  after: { rows: SessionUpdate[]; snapshot: SessionSnapshot },
): void {
  const first = translateFeed(before.rows, before.snapshot);
  const reused = translateFeed(after.rows, after.snapshot, first.turns);

  expect(reused.view).toEqual(toFeedView(after.rows, after.snapshot));
}

const inTurn = (row: SessionUpdate, turnId: string | null): SessionUpdate => ({
  ...row,
  turnId,
});

it('draws a Permission request that resolves as the Tool call it was', () => {
  const recorded = readRow(recordedRows);

  const pending: ToolCallUpdate = {
    ...recorded,
    status: 'pending',
    state: 'open',
  };

  const asking: SessionSnapshot = {
    ...snapshot,
    pendingPermission: {
      requestId: 'request-1',
      toolCallId: pending.toolCallId,
      title: 'Allow read?',
      options: permissionOptions,
    },
  };

  const before = { rows: [pending], snapshot: asking };
  const after = { rows: [pending], snapshot };

  expectReuseEqualsFresh(before, after);
  expect(toFeedView(before.rows, before.snapshot).items).toEqual([
    expect.objectContaining({ title: 'Awaiting approval' }),
  ]);
  expect(
    translateFeed(
      after.rows,
      after.snapshot,
      translateFeed(before.rows, before.snapshot).turns,
    ).view.items,
  ).not.toEqual(toFeedView(before.rows, before.snapshot).items);
});

it('folds a Subagent prompt when its spawn pages in above in an earlier Turn', () => {
  const prompt = inTurn(spawnPromptRow, 'turn-b');
  const spawn = inTurn(spawnRow, 'turn-a');

  expectReuseEqualsFresh(
    { rows: [prompt], snapshot: subagentSnapshot },
    { rows: [spawn, prompt], snapshot: subagentSnapshot },
  );
  expect(
    toFeedView([spawn, prompt], subagentSnapshot).items.map(
      (item) => item.type,
    ),
  ).toEqual(['subagent']);
});

const params = { sessionId: 'a', limit: 3 };

const operationCall = (
  turnId: string | null,
  kind: 'agent' | 'engine',
  position: number,
): ToolCallUpdate =>
  kind === 'agent'
    ? call({
        id: '["tool_call_update","acp",["upstream","toolu_1"]]',
        toolCallId: 'toolu_1',
        turnId,
        position,
        name: 'operation_run',
        title: 'argo: operation_run',
        kind: 'other',
        state: 'settled',
        status: 'completed',
        rawInput: { id: 'session.feed', params },
      })
    : call({
        id: operationFeedRowId('call-1'),
        toolCallId: 'call-1',
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

it('pairs a call with its record across a row that has no Turn', () => {
  const agent = operationCall('turn-1', 'agent', 1);
  const after = [agent, voiceLine(2), operationCall('turn-1', 'engine', 3)];

  expectReuseEqualsFresh(
    { rows: [agent], snapshot },
    { rows: after, snapshot },
  );
  expect(
    toFeedView(after, snapshot).items.flatMap((item) =>
      item.type === 'tool_call' ? [item.row.id] : [],
    ),
  ).toEqual([operationFeedRowId('call-1')]);
});

it('leaves a call and a record of different Turns unpaired', () => {
  const agent = operationCall('turn-1', 'agent', 1);
  const after = [agent, operationCall('turn-2', 'engine', 2)];

  expectReuseEqualsFresh(
    { rows: [agent], snapshot },
    { rows: after, snapshot },
  );
  expect(
    toFeedView(after, snapshot).items.flatMap((item) =>
      item.type === 'tool_call' ? [item.row.id] : [],
    ),
  ).toHaveLength(2);
});

it('draws a Turn that gains rows at its head as translating it again', () => {
  const turn = copy(0).map((row) => inTurn(row, 'turn-head'));
  const [, ...newer] = turn;

  expectReuseEqualsFresh({ rows: newer, snapshot }, { rows: turn, snapshot });
  expect(
    translateFeed(turn, snapshot, translateFeed(newer, snapshot).turns).turns,
  ).toHaveLength(1);
});
