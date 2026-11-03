import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { drawsNothing } from '@argo/plugin-kit/testing';
import { expect, it } from 'vitest';
import { issueTitle, project, refusedTitle, tracker } from './journey-fixture';
import {
  attach,
  mountFor,
  sessionId,
  trackerWithAttachedIssue,
} from './session-slot-fixture';

const cardPage = '/session-issue';

const tabPage = '/session-issue/full';

it("shows the Session's Issue on the Workbench card", async () => {
  const test = await trackerWithAttachedIssue();
  const card = await mountFor(test, cardPage, sessionId);
  const row = await card.find('Fixture issue from GitHub');

  expect(row.props.subtitle).toBe('#42 · Open');
}, 20_000);

it('draws nothing on the card when the Session has no Issue, or the card has no Session', async () => {
  const { test } = await tracker();
  const empty = await mountFor(test, cardPage, sessionId);
  const none = await mountFor(test, cardPage);

  for (const card of [empty, none]) {
    await card.ready();
    expect(drawsNothing(card.tree)).toBe(true);
  }
}, 20_000);

it('follows the Session as an Agent attaches another Issue, and draws nothing once it detaches', async () => {
  const test = await trackerWithAttachedIssue();
  const card = await mountFor(test, cardPage, sessionId);

  await card.find(issueTitle);
  // The Plugin's clock stands still in a test; the second Issue is attached later, as it would be.
  await test.clock.advance(1000);
  await attach(test, 'attach', 43);
  expect((await card.find(refusedTitle)).props.subtitle).toBe('#43 · Open');

  await attach(test, 'detach', 43);
  expect((await card.find(issueTitle)).props.subtitle).toBe('#42 · Open');
  await attach(test, 'detach');
  await card.waitFor(() => drawsNothing(card.tree), 'the card emptied');
}, 20_000);

it('keeps the card for an attached Issue that cannot load, and says why', async () => {
  const { test } = await tracker([{ ...project, originUrl: null }]);

  await attach(test, 'attach');

  const card = await mountFor(test, cardPage, sessionId);

  expect(await card.find('#42 could not load')).toBeDefined();
  expect(drawsNothing(card.tree)).toBe(false);
}, 20_000);

it('keeps its own messages on the Inspector tab', async () => {
  const { test } = await tracker();
  const tab = await mountFor(test, tabPage, sessionId);

  expect(await tab.find('No Issue attached')).toBeDefined();
}, 20_000);

it("opens the Session's full Issue as the Inspector tab", async () => {
  const test = await trackerWithAttachedIssue();
  const tab = await mountFor(test, tabPage, sessionId);

  expect(await tab.find('Start Session')).toBeDefined();
  expect(await tab.find('fixture')).toBeDefined();
  expect(tab.findText('Fixture issue from GitHub')).toBeDefined();
}, 20_000);

type Declared = {
  header: { target: { type: string; cardId: string } }[];
  cards: { id: string; page: string; tab: string }[];
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

it("declares a header action that opens the Issue tracker's Workbench card, and draws the card's page and tab", async () => {
  const { header, cards } = declared();
  const { test } = await tracker();

  expect(header.map(({ target }) => target)).toEqual([
    { type: 'card', cardId: cards[0]?.id },
  ]);
  expect(cards.map(({ page, tab }) => [page, tab])).toEqual([
    [cardPage, tabPage],
  ]);

  for (const path of [cardPage, tabPage]) {
    const view = await mountFor(test, path, sessionId);

    await view.ready();
    expect(view.tree).not.toBeNull();
  }
}, 20_000);
