import { fileURLToPath } from 'node:url';
import { expect, onTestFinished } from 'vitest';
import { startPluginTest } from './index';
import { itemsText, serviceFixture } from './sign-in-fixture';
import type { PluginTest, PluginTestOptions } from './test-types';

export { itemsText };

export const projects = [
  { id: 'one', name: 'One', originUrl: null },
  { id: 'two', name: 'Two', originUrl: null },
];

export const wait = { timeout: 15_000 };

export const signInLabel = 'Sign in to Service';

export const rejectedText = 'no longer accepts';

const directory = fileURLToPath(
  new URL('../mocks/sign-in-plugins', import.meta.url),
);

export async function start(
  plugin: 'device' | 'redirect',
  options: Pick<PluginTestOptions, 'network' | 'openBrowser'>,
): Promise<PluginTest> {
  const test = await startPluginTest({
    directory,
    pluginId: `sign-in-${plugin}`,
    version: '0.0.0',
    clockStart: 1_000_000,
    projects,
    ...options,
  });

  onTestFinished(() => test.close());

  return test;
}

const clockStep = 5_000;

export type View = Awaited<ReturnType<PluginTest['mount']>>;

export async function clockUntil(
  test: PluginTest,
  view: View,
  text: string,
): Promise<void> {
  await expect
    .poll(async () => {
      await test.clock.advance(clockStep);

      return JSON.stringify(view.trees.at(-1));
    }, wait)
    .toContain(text);
}

export const surface = { platform: 'web' } as const;

export const hasText = (view: View, text: string): boolean =>
  JSON.stringify(view.trees.at(-1)).includes(text);

export type Service = Awaited<ReturnType<typeof serviceFixture>>;

export async function started(): Promise<{
  test: PluginTest;
  service: Service;
}> {
  const service = await serviceFixture();
  const test = await start('device', { network: service.network });

  return { test, service };
}

async function pressSignIn(page: View): Promise<void> {
  await expect.poll(() => page.findText(signInLabel), wait).toBeDefined();
  await page.press(signInLabel);
}

// What "Add account" opens: the sign-in page with no Project, finished as this person.
export async function addAccount(
  { test, service }: { test: PluginTest; service: Service },
  login: string,
): Promise<void> {
  const page = await test.mount({ page: '/sign-in', surface });

  service.person.login = login;
  await pressSignIn(page);
  await clockUntil(test, page, 'Signed in as');
}

export type Run = { test: PluginTest; service: Service };

export const items = (test: PluginTest, projectId?: string): Promise<View> =>
  test.mount({ page: '/', surface, projectId });

export const labels = ({ test }: Run): string[] =>
  test.accounts.list().map(({ label }) => label);

// Finishes the sign-in a page offers, as this person, and waits for the page's items.
export async function signInOn(
  { test, service }: Run,
  page: View,
  login: string,
): Promise<void> {
  service.person.login = login;
  await pressSignIn(page);
  await clockUntil(test, page, itemsText);
}
