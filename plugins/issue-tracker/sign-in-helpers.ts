import type { FixtureRequest } from '@argo/plugin-kit/testing';
import { expect } from 'vitest';
import type { GitHubFixture } from './github-fixture';
import type { OpenPage, Tracked } from './journey-fixture';

export const signInLabel = 'Sign in to GitHub';

// Every call to GitHub's API but the sign-in's own `/user`.
export const apiCalls = (github: GitHubFixture): FixtureRequest[] =>
  github.requests.filter(
    ({ host, path }) => host === 'api.github.com' && path !== '/user',
  );

export const signedInText = 'Signed in as octocat';

const stepLimit = 6;

const stepMs = 1000;

// The device flow polls on the Plugin's clock; each step lets one poll through.
export async function until(
  { test }: Tracked,
  page: OpenPage,
  text: string,
): Promise<void> {
  for (let step = 0; step < stepLimit && !page.findText(text); step += 1) {
    await test.clock.advance(stepMs);
    await page.draw();
  }

  expect(page.findText(text)).toBeDefined();
}

// Opens the sign-in page as a paired Device's App does, and asks for a code.
export async function showsCode(tracked: Tracked): Promise<OpenPage> {
  const page = await tracked.test.pages.open({ path: '/sign-in' });

  await page.press(signInLabel);
  await page.draw();
  expect(page.findText('WDJB-MJHT')).toBeDefined();

  return page;
}
