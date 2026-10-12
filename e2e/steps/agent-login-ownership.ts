import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { serverUrlFor } from '../server-port';
import { browseAgents } from './agent-catalog';
import { When } from './fixtures';

When(
  'a copied App window tries sign-in for {string}',
  async ({ page, server }, name: string): Promise<void> => {
    const copied = await copyAppWindow(page, server.httpUrl);
    try {
      await visitAgent(copied, name);
      await openSignIn(copied);
      await expectForeignLogin(copied);
    } finally {
      await copied.close();
    }
  },
);

async function expectForeignLogin(page: Page): Promise<void> {
  const dialog = page.getByRole('dialog', {
    name: 'Sign-in already in progress',
  });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Cancel' })).toHaveCount(0);
  await expect(
    dialog.getByRole('button', { name: 'I’ve finished' }),
  ).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
}

async function copyAppWindow(page: Page, httpUrl: string): Promise<Page> {
  const opened = page.waitForEvent('popup');
  await page.evaluate("window.open('', '_blank')");
  const copied = await opened;
  await copied.addInitScript(
    (serverUrl): void => {
      Object.assign(globalThis, { argo: { serverUrl } });
    },
    serverUrlFor(Number(new URL(httpUrl).port)),
  );
  await copied.goto('/');
  return copied;
}

When(
  'a copied App window tries sign-in after the initiating App closes for {string}',
  async ({ page, server }, name: string): Promise<void> => {
    const copied = await copyAppWindow(page, server.httpUrl);
    await page.close();
    await expect(
      copied.getByRole('button', { name: /^(Settings|Open navigation)$/ }),
    ).toBeVisible();
    await copied.reload();
    try {
      await visitAgent(copied, name);
      await openSignIn(copied);
      await expectForeignLogin(copied);
    } finally {
      await copied.close();
    }
  },
);

When(
  'I reopen the App and return to protocol sign-in for {string}',
  async ({ page }, name: string): Promise<void> => {
    await page.evaluate("history.replaceState(null, '', '/')");
    await page.reload();
    await visitAgent(page, name);
    await openSignIn(page);
  },
);

async function visitAgent(page: Page, name: string): Promise<void> {
  await browseAgents(page);
  await page.getByRole('link', { name: new RegExp(`^${name},`) }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
}
async function openSignIn(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Sign in', exact: true }).click();
}
