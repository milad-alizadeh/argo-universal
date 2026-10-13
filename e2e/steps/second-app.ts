import type { Page } from '@playwright/test';

// Points a page at the test's Server before it loads, so it runs as another App of the same Server.
export async function connectSecondApp(
  page: Page,
  httpUrl: string,
): Promise<void> {
  await page.addInitScript(
    (url): void => {
      Object.assign(globalThis, { argo: { serverUrl: url } });
    },
    httpUrl.replace(/^http/, 'ws'),
  );
}
