import { expect } from '../fixtures';
import { markLocalStart } from './agent-requests';
import { readAgent } from './agents';
import { Given, When, Then } from './fixtures';
import {
  chooseAgent,
  chooseLocalCheckout,
  openingLabel,
  openNewSession,
  waitForEmptySession,
} from './new-session';

// The Agent first, so its Session is the only one Local opens; its New worktree options read ends before Local is chosen.
Given(
  'a Local New Session with Agent {int}',
  async ({ page, server, app }, ordinal: number): Promise<void> => {
    const { name: label } = await readAgent(page, server.httpUrl, ordinal);
    await openNewSession(page);
    await chooseAgent(page, label);
    await waitForEmptySession(page);
    markLocalStart(app.requestLogPath);
    await chooseLocalCheckout(page);
    await waitForEmptySession(page);
  },
);

const loadingShownKey = 'e2e-loading-shown';

// Runs in the page, which these steps type without the DOM library.
const watchLoading = `new MutationObserver((records, observer) => {
  if (!document.querySelector('[role="progressbar"][aria-label="${openingLabel}"]')) return;
  sessionStorage.setItem('${loadingShownKey}', 'true');
  observer.disconnect();
}).observe(document, { childList: true, subtree: true });`;

// Records whether New Session shows Loading on any page the App loads from now on.
When("I watch for New Session's Loading", async ({ page }): Promise<void> => {
  await page.addInitScript({ content: watchLoading });
});

Then('New Session never showed Loading', async ({ page }): Promise<void> => {
  expect(
    await page.evaluate<string | null>(
      `sessionStorage.getItem('${loadingShownKey}')`,
    ),
  ).toBeNull();
});
