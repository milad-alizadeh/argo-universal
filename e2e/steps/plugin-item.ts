import type { Page } from '@playwright/test';
import { expect } from '../fixtures';
import { Then } from './fixtures';

const groups = [
  'Status, Open',
  'Assignee, Ana Ruiz',
  'Labels, fixture',
  'Opened, Today',
];

const docs = 'Docs, example.com';

// Beside the content the Link's field is a group; as a Pill under a phone's title it is the pressable Pill itself.
const docsField = (page: Page): ReturnType<Page['getByRole']> =>
  page
    .getByRole('group', { name: docs })
    .or(page.getByRole('button', { name: docs }));

Then(
  'the Plugin item shows its content and Metadata',
  async ({ page }): Promise<void> => {
    await expect(page.getByText('Fixture item content.')).toBeVisible();

    for (const name of groups)
      await expect(page.getByRole('group', { name })).toBeVisible();

    await expect(docsField(page)).toBeVisible();
  },
);
