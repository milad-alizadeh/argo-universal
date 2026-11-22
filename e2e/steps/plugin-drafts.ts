import { expect } from '../fixtures';
import { When, Then } from './fixtures';
import { onPhone } from './frame';

Then('the Draft bar is shown', async ({ page }): Promise<void> => {
  await expect(page.getByRole('toolbar', { name: 'Draft' })).toBeVisible();
});

Then('no Draft bar is shown', async ({ page }): Promise<void> => {
  await expect(page.getByRole('toolbar', { name: 'Draft' })).toHaveCount(0);
});

// A wide Frame lists the states as tabs; a phone folds them into the State menu.
When(
  'I choose the {string} Draft state',
  async ({ page }, state: string): Promise<void> => {
    const bar = page.getByRole('toolbar', { name: 'Draft' });

    if (!onPhone(page)) {
      await bar.getByRole('button', { name: stateChoice(state) }).click();

      return;
    }

    await bar.getByRole('button', { name: 'State' }).click();
    await page.getByRole('menuitemradio', { name: stateChoice(state) }).click();
  },
);

Then(
  'the {string} region tag reads {string}',
  async ({ page }, region: string, text: string): Promise<void> => {
    await expect(
      page
        .getByRole('group', { name: `${region} Variant` })
        .getByText(text, { exact: true }),
    ).toBeVisible();
  },
);

// A region's tag shows its controls while the pointer is on the region.
When(
  'I step the {string} region to the next Variant',
  async ({ page }, region: string): Promise<void> => {
    await page.getByRole('group', { name: `${region} Variant` }).hover();
    await page
      .getByRole('button', { name: `Next ${region} Variant`, exact: true })
      .click();
  },
);

// The state can have a missing marker beside the label.
function stateChoice(state: string): RegExp {
  return new RegExp(`^${RegExp.escape(state)}(?:[ ·]+missing)?$`, 'i');
}

Then(
  'the Draft page has no drawing failure toast',
  async ({ page }): Promise<void> => {
    await expect(page.getByText('Drafts could not draw a view')).toHaveCount(0);
  },
);
