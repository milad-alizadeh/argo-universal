import type { Page, WebSocketRoute } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, Then, When } from './fixtures';
import { reloadApp } from './frame';
import { mutate } from './server-query';

type WireFrame = string | Buffer;

// The answers to the App's plugins.view subscriptions, held back from the App for as long as `holding` is on.
interface HeldViews {
  viewIds: Set<unknown>;
  holding: boolean;
  held: (() => void)[];
}

const holds = new WeakMap<Page, HeldViews>();

const framesIn = (frame: WireFrame): { id?: unknown; method?: string; params?: { path?: string } }[] => {
  const parsed: unknown = JSON.parse(String(frame));

  return Array.isArray(parsed) ? parsed : [parsed as object];
};

function relay(route: WebSocketRoute, views: HeldViews): void {
  const server = route.connectToServer();

  route.onMessage((frame) => {
    for (const { id, method, params } of framesIn(frame))
      if (method === 'subscription' && params?.path === 'plugins.view')
        views.viewIds.add(id);

    server.send(frame);
  });
  server.onMessage((frame) => {
    const isView = framesIn(frame).some(({ id }) => views.viewIds.has(id));

    if (views.holding && isView) views.held.push(() => route.send(frame));
    else route.send(frame);
  });
}

function heldViews(page: Page): HeldViews {
  const views = holds.get(page);

  if (!views) throw new Error('The Plugin view stream was not prepared');

  return views;
}

Given(
  "the Server's answers to Plugin pages can be held",
  async ({ page }): Promise<void> => {
    const views: HeldViews = { viewIds: new Set(), holding: false, held: [] };

    holds.set(page, views);
    await page.routeWebSocket(/ws:\/\//, (route) => relay(route, views));
    await reloadApp(page);
  },
);

When("the Server's answers to Plugin pages are held", ({ page }): void => {
  heldViews(page).holding = true;
});

When(
  "the Server's answers to Plugin pages arrive",
  async ({ page }): Promise<void> => {
    const views = heldViews(page);

    // A view that opens answers with its snapshot, so there is always something to let through.
    await expect.poll(() => views.held.length).toBeGreaterThan(0);
    views.holding = false;

    for (const send of views.held.splice(0)) send();
  },
);

Then(
  'no Plugin page has answered',
  async ({ page }): Promise<void> => {
    await expect.poll(() => heldViews(page).held.length).toBeGreaterThan(0);
  },
);

When(
  'the {} Plugin is turned back on on the Server',
  async ({ page, app }, title: string): Promise<void> => {
    await mutate({
      page,
      httpUrl: app.httpUrl,
      procedure: 'plugin.setEnabled',
      input: { pluginId: title.toLowerCase(), enabled: true },
    });
  },
);

Then(
  'the Plugin page does not read {string}',
  async ({ page }, text: string): Promise<void> => {
    await expect(page.getByText(text).locator('visible=true')).toHaveCount(0);
  },
);
