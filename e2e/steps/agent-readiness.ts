import type { Locator, Page } from '@playwright/test';
import { expect } from '../fixtures';
import { browseAgents } from './agent-catalog';
import { readAgent } from './agents';
import { Then, When, test } from './fixtures';
import type { SetupState } from './scenario-agents';
import { agentWork } from './timeouts';

// Evidence for the PR: each Readiness status as the user sees it.
const capture = async (page: Page, name: string): Promise<void> => {
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    animations: 'disabled',
  });
};

const exact = { exact: true };

// The Agents list stays mounted beside (wide) or under (phone) the Agent page with the same words, so only shown text counts.
export const shown = (page: Page, text: string): Locator =>
  page.getByText(text, exact).filter({ visible: true }).first();

Then(
  'Example Agent is Ready on its page and in the Agents list',
  async ({ page }): Promise<void> => {
    await expect(
      page.getByRole('heading', { name: 'Example Agent', level: 1 }),
    ).toBeVisible();
    await expect(shown(page, 'Ready')).toBeVisible(agentWork);
    await expect(page.getByText('Checking…', exact)).toHaveCount(0);
    await capture(page, 'agent-readiness-ready');
    await page.goBack();
    await expect(
      page.getByRole('link', { name: /^Example Agent,.*Ready$/ }),
    ).toBeVisible();
  },
);

When(
  'I open Agent {int} from the Agents list',
  async ({ page, server }, ordinal: number): Promise<void> => {
    const { label } = await readAgent(page, server.httpUrl, ordinal);
    await browseAgents(page);
    await page.getByRole('link', { name: new RegExp(`^${label},`) }).click();
    await expect(
      page.getByRole('heading', { name: label, level: 1 }),
    ).toBeVisible();
  },
);

Then(
  'the Agent page shows {string} with {string}',
  async ({ page }, headline: string, action: string): Promise<void> => {
    await expect(shown(page, headline)).toBeVisible();
    await expect(shown(page, action)).toBeVisible();
    await expect(page.getByText('Unavailable', exact)).toHaveCount(0);
    await capture(page, `agent-readiness-${headline}`);
  },
);

// The reason each fixture state's check reports; a credential in it never reaches the App.
const fixtureReasons = {
  'sign-in needed': /^The Agent requires sign-in\.$/,
  "can't start": /failed ACP initialize/,
} satisfies Partial<Record<SetupState, RegExp>>;

Then(
  'Agent {int} shows its {string} reason without any credential',
  async (
    { page, server },
    ordinal: number,
    state: keyof typeof fixtureReasons,
  ): Promise<void> => {
    const { reason = '' } = await readAgent(page, server.httpUrl, ordinal);
    expect(reason).toMatch(fixtureReasons[state]);
    await expect(shown(page, reason)).toBeVisible();

    for (const secret of ['sk-fixture-secret', 'Bearer'])
      await expect(page.getByText(secret)).toHaveCount(0);
  },
);
