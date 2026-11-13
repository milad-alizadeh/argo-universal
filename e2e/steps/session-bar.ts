import { expect } from '../fixtures';
import { Then, When } from './fixtures';

Then(
  'the Session bar reads {string}',
  async ({ page }, line: string): Promise<void> => {
    await expect(page.getByText(line, { exact: true })).toBeVisible();
  },
);

When(
  'I press Open for the {word} Plugin on the Session bar',
  async ({ page }, name: string): Promise<void> => {
    /*
     * A wide window draws the line as a Workbench card, a phone on the strip in the Session's layout (#2012); the
     * header's own actions live in the window band, outside both.
     */
    await page
      .getByTestId('desktop-workbench')
      .or(page.getByTestId('session-layout'))
      .getByRole('button', { name: `Open ${name}`, exact: true })
      .click();
  },
);
