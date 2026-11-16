import { expect } from '../fixtures';
import { expectListedAgent } from './agents';
import { Given, Then } from './fixtures';

Given('Agent {int} predicts the next Prompt', expectListedAgent);

const suggestionTimeout = { timeout: 45_000 };

Then(
  'the Composer offers the suggestion {string}',
  async ({ page }, suggestion: string): Promise<void> => {
    await expect(page.getByText(suggestion, { exact: true })).toBeVisible(
      suggestionTimeout,
    );
  },
);
