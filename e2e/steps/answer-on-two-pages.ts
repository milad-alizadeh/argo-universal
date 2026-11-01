import type { Page, WebSocketRoute } from '@playwright/test';
import { z } from 'zod';
import { expect } from '../fixtures';
import { attachArrivalLog } from './attach-arrival-log';
import { expectReply } from './feed';
import { Given, When, Then } from './fixtures';
import { openWidePage } from './frame';
import { sessionWithStatus } from './live-session';
import {
  answerPermission,
  expectClosedForDraft,
  expectOverComposer,
} from './permission';
import { framesMatching, responseIds } from './web-socket-frames';

// The other page's live updates: while held, every subscription frame the Server sends waits, and calls such as an answer still go through.
interface HeldUpdates {
  held: boolean;
  subscriptionIds: Set<number>;
  waiting: (() => void)[];
  // One line per subscribe call and Server message, timed from the page's start, so a late first Session snapshot shows as a gap.
  arrivalLog: string[];
  startedAt: number;
}

interface OtherPage {
  page: Page;
  updates: HeldUpdates;
}

const others = new WeakMap<Page, OtherPage>();

const Subscription = z.object({
  id: z.number(),
  method: z.literal('subscription'),
});

const draft = 'Follow-up draft';

function connect(route: WebSocketRoute, updates: HeldUpdates): void {
  const server = route.connectToServer();
  // Each WebSocket numbers its calls afresh.
  updates.subscriptionIds = new Set();
  route.onMessage((message) => {
    for (const { id } of framesMatching(message, Subscription)) {
      updates.subscriptionIds.add(id);
      updates.arrivalLog.push(
        `+${Date.now() - updates.startedAt}ms subscribe ${id}`,
      );
    }

    server.send(message);
  });
  server.onMessage((message) => deliver(route, updates, message));
}

function recordArrival(
  updates: HeldUpdates,
  ids: number[],
  message: string | Buffer,
): boolean {
  const update = ids.some((id) => updates.subscriptionIds.has(id));

  updates.arrivalLog.push(
    `+${Date.now() - updates.startedAt}ms ${update ? 'update' : 'reply'} ${ids.join(',')} ${message.length}B`,
  );

  return update;
}

function deliver(
  route: WebSocketRoute,
  updates: HeldUpdates,
  message: string | Buffer,
): void {
  const update = recordArrival(updates, responseIds(message), message);

  if (updates.held && update)
    updates.waiting.push((): void => route.send(message));
  else route.send(message);
}

function otherPage(page: Page): OtherPage {
  const other = others.get(page);

  if (!other) throw new Error('No other page is open on this Session');

  return other;
}

When(
  'I open the Session {string} on another page',
  async ({ app, page }, title: string): Promise<void> => {
    const updates: HeldUpdates = {
      held: false,
      subscriptionIds: new Set(),
      waiting: [],
      arrivalLog: [],
      startedAt: Date.now(),
    };

    const other = await openWidePage(app, (opened) =>
      opened.routeWebSocket(/ws:\/\//, (route) => connect(route, updates)),
    );

    others.set(page, { page: other, updates });
    await sessionWithStatus(other, title, 'Needs input').click();
  },
);

Then(
  'both pages show the Permission request {string}',
  async ({ page }, title: string): Promise<void> => {
    await expectOverComposer(page, title);
    const { page: other, updates } = otherPage(page);

    try {
      await expectOverComposer(other, title);
    } catch (error) {
      await attachArrivalLog(updates.arrivalLog);
      throw error;
    }
  },
);

Given('the other page stops receiving live updates', ({ page }): void => {
  otherPage(page).updates.held = true;
});

When(
  'I answer the Permission request with {string} on the other page',
  async ({ page }, option: string): Promise<void> => {
    await answerPermission(otherPage(page).page, option);
  },
);

Then(
  'the other page reads that the request was already answered',
  async ({ page }): Promise<void> => {
    await expect(
      otherPage(page)
        .page.getByRole('status')
        .getByText(/already answered/i),
    ).toBeVisible();
  },
);

When('the other page receives live updates again', ({ page }): void => {
  const { updates } = otherPage(page);
  updates.held = false;

  for (const send of updates.waiting.splice(0)) send();
});

Then(
  'both pages show the Agent reply {string}',
  async ({ page }, reply: string): Promise<void> => {
    await expectReply(page, reply);
    await expectReply(otherPage(page).page, reply);
  },
);

Then(
  'the Permission request {string} closes on both pages',
  async ({ page }, title: string): Promise<void> => {
    await expectClosedForDraft(page, title, draft);
    await expectClosedForDraft(otherPage(page).page, title, draft);
  },
);

Then(
  'the other page shows the Agent reply {string} and the Permission request {string} closes',
  async ({ page }, reply: string, title: string): Promise<void> => {
    const other = otherPage(page).page;
    await expectReply(other, reply);
    await expectClosedForDraft(other, title, draft);
  },
);
