import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { replies } from './agent-requests';
import { expectListedAgent } from './agents';
import { Given, When, Then } from './fixtures';
import { expectComposerAccepts } from './input-requests';
import { messageLabel } from './new-session';

const composer = (page: Page): Locator => page.getByTestId('composer-column');

Given('Agent {int} asks to leave plan mode', expectListedAgent);

Given('Agent {int} asks permission to edit README.md', expectListedAgent);

// The request card takes the Composer's place; the Composer's textbox stays mounted beneath it.
export async function expectOverComposer(
  page: Page,
  title: string,
): Promise<void> {
  await expect(composer(page).getByText(title, { exact: true })).toBeVisible();
  await expect(
    composer(page).getByRole('textbox', {
      name: messageLabel,
      includeHidden: true,
    }),
  ).toHaveCount(1);
}

export async function answerPermission(
  page: Page,
  option: string,
): Promise<void> {
  await composer(page)
    .getByRole('button', { name: option, exact: true })
    .click();
}

export async function expectClosedForDraft(
  page: Page,
  title: string,
  draft: string,
): Promise<void> {
  await expect(composer(page).getByText(title, { exact: true })).toHaveCount(0);
  await expectComposerAccepts(page, draft);
}

// A request to leave plan mode is a Permission request that shows its plan.
const requestCards = ['the plan', 'the Permission request'];

for (const request of requestCards)
  Then(
    `${request} {string} opens over the Composer`,
    async ({ page }, title: string): Promise<void> => {
      await expectOverComposer(page, title);
    },
  );

When('I show the plan', async ({ page }): Promise<void> => {
  await composer(page).getByRole('button', { name: 'Show plan' }).click();
});

Then(
  'the plan reads {string}',
  async ({ page }, text: string): Promise<void> => {
    await expect(composer(page).getByText(text, { exact: true })).toBeVisible();
  },
);

When(
  'I answer the Permission request with {string}',
  async ({ page }, option: string): Promise<void> => {
    await answerPermission(page, option);
  },
);

// The App replies with one of the Agent's own options, never free text (Spec 0009).
Then(
  'the Agent receives the selected option {string}',
  async ({ app }, optionId: string): Promise<void> => {
    await expect
      .poll(() => replies(app.requestLogPath).map(({ result }) => result))
      .toEqual([{ outcome: { outcome: 'selected', optionId } }]);
  },
);

Then(
  'the Tool call {string} reads {string}',
  async ({ page }, title: string, outcome: string): Promise<void> => {
    const feed = page.getByTestId('feed-scroll');
    await expect(feed.getByText(title, { exact: true })).toBeVisible();
    await expect(feed.getByText(outcome, { exact: true })).toBeVisible();
  },
);

for (const request of requestCards)
  Then(
    `${request} {string} closes and the Composer accepts {string}`,
    async ({ page }, title: string, draft: string): Promise<void> => {
      await expectClosedForDraft(page, title, draft);
    },
  );
