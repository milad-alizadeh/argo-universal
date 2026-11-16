import type { WireNode } from '@repo/contracts/plugins/wire';
import { QueryClient } from '@tanstack/react-query';
import { expect, it } from 'vitest';
import { staleSlotAnswers } from './slot-answers';

const render = ['plugins', 'render'];

type Answer =
  | { type: 'replacement'; pluginId: string; root: WireNode }
  | { type: 'core'; input: { slotId: string } };

const replacement = (pluginId: string): Answer => ({
  type: 'replacement',
  pluginId,
  root: { key: 'root', type: 'Text', props: {}, children: [], slots: {} },
});

function kept(answers: Record<string, Answer>): QueryClient {
  const client = new QueryClient();

  for (const [id, answer] of Object.entries(answers))
    client.setQueryData([...render, { id }], answer);

  return client;
}

const invalidated = (client: QueryClient, id: string): boolean =>
  client.getQueryState([...render, { id }])?.isInvalidated === true;

it("draws a Plugin's replacements again once it reloads or an Operation of it ran, and leaves another Plugin's alone", () => {
  const client = kept({
    mine: replacement('tracker'),
    theirs: replacement('other'),
  });

  staleSlotAnswers(client, render, 'tracker');

  expect(invalidated(client, 'mine')).toBe(true);
  expect(invalidated(client, 'theirs')).toBe(false);
});

it('leaves an answer core drew, which no Plugin owns', () => {
  const client = kept({
    core: { type: 'core', input: { slotId: 'feed.row' } },
  });

  staleSlotAnswers(client, render, 'tracker');

  expect(invalidated(client, 'core')).toBe(false);
});
