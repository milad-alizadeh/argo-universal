import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { scrollToOldestHistoryMessage } from './feed-history-scroll';
import {
  connect,
  latestConnection,
  releasePrefetches,
  type HeldRefresh,
} from './feed-history-transport';
import { Given, When, Then } from './fixtures';
import { reloadApp } from './frame';

const refreshes = new WeakMap<Page, HeldRefresh>();

const feedScroll = 'feed-scroll';

Given('the Feed history refresh can be delayed', async ({ page }) => {
  const refresh: HeldRefresh = {
    connections: [],
    armed: false,
    delayPrefetch: true,
  };

  refreshes.set(page, refresh);
  await page.routeWebSocket(/ws:\/\//, (route) => connect(route, refresh));
  await reloadApp(page);
});

When(
  'the initial history prefetch finishes at the newest message',
  async ({ page }) => {
    const refresh = refreshes.get(page);

    if (!refresh) throw new Error('The history transport was not prepared');
    await expect
      .poll(() => latestConnection(refresh).heldPrefetches.length)
      .toBeGreaterThan(0);
    await page.getByTestId(feedScroll).evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    releasePrefetches(refresh);
    await expect(
      page.getByRole('progressbar', { name: 'Loading earlier' }),
    ).toHaveCount(0);
  },
);

When(
  'the Connection reconnects with its history refresh delayed',
  async ({ page }) => {
    const refresh = refreshes.get(page);

    if (!refresh) throw new Error('The history transport was not prepared');
    refresh.armed = true;
    refresh.delayPrefetch = false;
    const connections = refresh.connections;
    refresh.connections = [];
    await Promise.all(connections.map(({ route }) => route.close()));
    await expect
      .poll(() => refresh.connections.length, { timeout: 15_000 })
      .toBeGreaterThan(0);
    await expect(page.getByText('Reconnecting…')).toHaveCount(0);
  },
);

When(
  'I scroll to the top while the history refresh is delayed',
  async ({ page }) => {
    await page.getByTestId(feedScroll).evaluate((element) => {
      element.scrollTop = 0;
    });
  },
);

Then(
  'the oldest history message loads before the refresh finishes',
  async ({ page }) => {
    try {
      await scrollToOldestHistoryMessage(page);
    } finally {
      refreshes.get(page)?.release?.();
    }
  },
);
