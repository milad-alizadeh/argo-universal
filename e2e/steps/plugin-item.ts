import { expect } from '../fixtures';
import { Then } from './fixtures';

Then(
  'the Plugin item shows its content and Metadata',
  async ({ page }): Promise<void> => {
    await expect(page.getByText('Fixture item content.')).toBeVisible();

    // A field is a group beside the content; a Link, or a Pill under a phone's title, is the pressable control itself.
    for (const name of [
      'Status, Open',
      'Assignee, Ana Ruiz',
      'Labels, fixture',
      'Opened, Today',
      'Docs, example.com',
    ])
      await expect(
        page
          .getByRole('group', { name })
          .or(page.getByRole('button', { name })),
      ).toBeVisible();
  },
);
