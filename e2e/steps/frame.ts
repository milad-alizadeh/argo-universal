import type { Page } from '@playwright/test';
import { type App, expect } from '../fixtures';
import { Given } from './fixtures';

export const phone = { width: 390, height: 844 };

// Room for the sidebar, Workbench and Inspector without automatic folding.
export const wide = { width: 1920, height: 800 };

// The Frame's test ID names the Size class it lays out.
export const compactFrame = 'compact-frame';

export const wideFrame = 'wide-frame';

// A phone Frame stacks each page over its list; a wide one keeps the list beside it.
export const onPhone = (page: Page): boolean =>
  (page.viewportSize()?.width ?? 0) <= phone.width;

const isBlank = (page: Page): boolean => page.url() === 'about:blank';

// The web export serves only its root, so a reload starts there; a blank web page is first loaded here, so a test boots the App once.
export async function reloadApp(page: Page): Promise<void> {
  await page.goto(isBlank(page) ? '/' : new URL('/', page.url()).href);
}

// For a scenario with no Frame step: the App opens in the project's viewport.
export async function openAppOnce(page: Page): Promise<void> {
  if (isBlank(page)) await page.goto('/');
}

/*
 * The web export is one page, and the test host answers a deeper path with Not Found: it serves that
 * page instead, as a real host does, so a step can open the App on any URL.
 */
export async function serveOnePage(page: Page): Promise<void> {
  const root = new URL('/', page.url()).href;

  await page.route(
    (url) => url.href.startsWith(root) && url.pathname !== '/',
    (route) =>
      route.request().resourceType() === 'document'
        ? route.fallback({ url: root })
        : route.fallback(),
  );
}

export async function openConnection(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('link', { name: /^Connection(?:,|$)/ }).click();
  await expect(page).toHaveURL(/\/settings\/connection$/);
}

// The App opens in this Frame; a Frame that changes later keeps the page it shows.
async function openApp(
  page: Page,
  size: { width: number; height: number },
): Promise<void> {
  await page.setViewportSize(size);
  await reloadApp(page);
}

Given('a wide Frame', async ({ page }): Promise<void> => {
  await openApp(page, wide);
});

Given('a phone Frame', async ({ page }): Promise<void> => {
  await openApp(page, phone);
});

// Another page on the same Server, opened wide at the App's root; only the web App can open one. `prepare` runs before the App loads, such as to route its WebSocket.
export async function openWidePage(
  app: Pick<App, 'openPage'>,
  prepare?: (page: Page) => Promise<void>,
): Promise<Page> {
  if (!app.openPage) throw new Error('This scenario needs the web App');
  const other = await app.openPage();
  await other.setViewportSize(wide);
  await prepare?.(other);
  await other.goto('/');

  return other;
}
