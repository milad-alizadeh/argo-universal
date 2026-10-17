import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { readAgent } from './agents';
import { Given } from './fixtures';
import { expectMessage, messageLabel } from './new-session';
import { agentId } from './scenario-agents';

// The Agent's scenario is chosen from this step; here the Server only has to list it.
Given(
  /^Agent (\d+) asks (?:for an Elicitation|to leave plan mode)$/,
  async ({ page, server }, ordinal: string): Promise<void> => {
    expect(
      await readAgent(page, server.httpUrl, Number(ordinal)),
    ).toMatchObject({
      id: agentId(Number(ordinal)),
    });
  },
);

// Once the Input request settles, the Composer takes the next prompt.
export async function expectComposerAccepts(
  page: Page,
  draft: string,
): Promise<void> {
  await page.getByRole('textbox', { name: messageLabel }).fill(draft);
  await expectMessage(page, draft);
  await expect(
    page.getByRole('button', { name: 'Send', exact: true }),
  ).toBeEnabled();
}
