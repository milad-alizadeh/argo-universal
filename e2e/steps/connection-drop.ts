import type { Page, WebSocketRoute } from '@playwright/test';
import { expect } from '../fixtures';
import { Given, When } from './fixtures';
import { reloadApp } from './frame';

// Each page's open WebSockets, which a drop closes under the App.
const connections = new WeakMap<Page, WebSocketRoute[]>();

// Pages whose Connection stays down: each new WebSocket closes at once.
const heldDown = new WeakSet<Page>();

Given(
  "the App's Connection can be dropped",
  async ({ page }): Promise<void> => {
    connections.set(page, []);
    await page.routeWebSocket(/ws:\/\//, (route): void => {
      if (heldDown.has(page)) {
        void route.close();

        return;
      }

      route.connectToServer();
      connections.get(page)?.push(route);
    });
    await reloadApp(page);
  },
);

export async function dropConnection(page: Page): Promise<void> {
  const routes = connections.get(page) ?? [];
  connections.set(page, []);
  await Promise.all(routes.map((route) => route.close()));
}

// The App opens a new WebSocket once it notices.
export async function awaitReconnection(page: Page): Promise<void> {
  await expect
    .poll(() => connections.get(page)?.length ?? 0, { timeout: 15_000 })
    .toBeGreaterThan(0);
  await expect(page.getByText('Reconnecting…')).toHaveCount(0, {
    timeout: 15_000,
  });
}

When('the Connection drops and comes back', async ({ page }): Promise<void> => {
  await dropConnection(page);
  await awaitReconnection(page);
});

When('the Connection drops and stays down', async ({ page }): Promise<void> => {
  heldDown.add(page);
  await dropConnection(page);
});

When('the Connection comes back', async ({ page }): Promise<void> => {
  heldDown.delete(page);
  await awaitReconnection(page);
});
