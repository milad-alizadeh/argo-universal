import { expect, it } from 'vitest';
import type { FeedStreamEvent } from '../feed';
import { FeedHappenings } from './feed-happenings';

const first = 't1';

const prompted = 'voice.prompted';

type Row = Extract<FeedStreamEvent, { type: 'row.upsert' }>['row'];

const voicePrompt = (turnId: string | null): Row => ({
  id: 'p1',
  sessionId: 's1',
  position: 1,
  revision: 1,
  turnId,
  state: 'settled',
  sessionUpdate: 'prompt_message',
  messageId: 'm1',
  content: [{ type: 'text', text: 'Do it' }],
  _meta: { argo: { sender: { type: 'voice' } } },
});

const upsert = (row: Row): FeedStreamEvent => ({
  type: 'row.upsert',
  rev: 1,
  row,
});

it('reports a voice Prompt once it is in a Turn', () => {
  expect(new FeedHappenings().read([upsert(voicePrompt(first))])).toEqual([
    { type: prompted, turnId: first },
  ]);
});

it('waits for a voice Prompt with no Turn yet, and reports it when a change gives it one', () => {
  const happenings = new FeedHappenings();

  expect(happenings.read([upsert(voicePrompt(null))])).toEqual([]);
  expect(
    happenings.read([
      { type: 'row.patch', rev: 2, id: 'p1', set: { turnId: 't2' } },
    ]),
  ).toEqual([{ type: prompted, turnId: 't2' }]);
});

it('reports a voice Prompt that later arrives whole with its Turn', () => {
  const happenings = new FeedHappenings();
  happenings.read([upsert(voicePrompt(null))]);

  expect(happenings.read([upsert(voicePrompt('t3'))])).toEqual([
    { type: prompted, turnId: 't3' },
  ]);
});
