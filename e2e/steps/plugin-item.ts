import { expect } from '../fixtures';
import { Then } from './fixtures';

// Each property is a FieldGroup row, read as one group of its title and value, beside the content or above it.
const groups = [
  'Status, Open',
  'Assignee, Ana Ruiz',
  'Labels, fixture',
  'Opened, Today',
  'Docs, example.com',
];

Then(
  'the Plugin item shows its content and properties',
  async ({ page }): Promise<void> => {
    await expect(page.getByText('Fixture item content.')).toBeVisible();

    for (const name of groups)
      await expect(page.getByRole('group', { name })).toBeVisible();
  },
);
