import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { expect, it } from 'vitest';
import { tracker } from './journey-fixture';
import {
  issuePage,
  mountFor,
  sessionId,
  trackerWithAttachedIssue,
} from './session-slot-fixture';

const cardPage = '/session-issue';

it("shows the Session's Issue on the Workbench card", async () => {
  const test = await trackerWithAttachedIssue();
  const card = await mountFor(test, cardPage, sessionId);
  const row = await card.find('Fixture issue from GitHub');

  expect(row.props.subtitle).toBe('#42 · Open');
  expect(row.props.onPress).toEqual({ action: 'navigate', path: issuePage });

  const issue = await mountFor(test, issuePage, sessionId);
  expect(await issue.find('Start Session')).toBeDefined();
  expect(await issue.find('fixture')).toBeDefined();
  expect(issue.findText('Fixture issue from GitHub')).toBeDefined();
}, 20_000);

it('says when the Session has no Issue, or the card has no Session', async () => {
  const test = await tracker();
  const empty = await mountFor(test, cardPage, sessionId);
  const none = await mountFor(test, cardPage);

  expect(await empty.find('No Issue attached')).toBeDefined();
  expect(await none.find('No Session')).toBeDefined();
}, 20_000);

type Declared = {
  header: { target: { type: string; cardId: string } }[];
  cards: { id: string; page: string; tab?: string }[];
};

function declared(): Declared {
  const manifest = JSON.parse(
    readFileSync(
      fileURLToPath(new URL('./plugin.json', import.meta.url)),
      'utf8',
    ),
  );

  const slots = manifest.contributes.declared;

  return {
    header: slots['argo/session/header/v1'],
    cards: slots['argo/session/workbench/v1'],
  };
}

it("declares a header action that opens the Issue tracker's Workbench card, and draws only the card's page", async () => {
  const { header, cards } = declared();
  const test = await tracker();

  expect(header.map(({ target }) => target)).toEqual([
    { type: 'card', cardId: cards[0]?.id },
  ]);
  expect(cards.map(({ page, tab }) => [page, tab])).toEqual([
    [cardPage, undefined],
  ]);

  for (const path of [cardPage]) {
    const view = await mountFor(test, path, sessionId);

    await view.ready();
    expect(view.tree).not.toBeNull();
  }
}, 20_000);
