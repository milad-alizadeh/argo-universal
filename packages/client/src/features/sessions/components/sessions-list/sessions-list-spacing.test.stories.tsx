import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, waitFor, within } from 'storybook/test';
import {
  meta as sessionsMeta,
  type Story,
} from '../../../../../mocks/sessions-list/sessions-list-story-context.test.mocks';
import { orphanSessions } from './sessions-list-nested-fixtures';
import { flatSessions } from './sessions-list-spacing-fixtures';

const meta = {
  ...sessionsMeta,
  title: 'Tests/Sessions/SessionsList/Spacing',
};

export default meta;

// A filtered child is a top-level result, with the sidebar's normal 10px logo-to-text gap.
export const FilteredLeaf: Story = {
  args: orphanSessions,
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas }) => {
    const row = await canvas.findByRole('button', {
      name: 'Review the change, Idle',
    });

    const title = within(row).getByText('Review the change');
    const logo = within(row).getByTestId('session-logo');

    await expectLogoGap(title, logo, 10);
  },
};

const [selected] = flatSessions.sessions;

if (!selected) throw new Error('The spacing fixture needs a selected Session');

const selectedTitle = selected.title;

function flatRows(width: number, expectedGap: number): Story {
  return {
    args: flatSessions,
    beforeEach: () => settleLayout(width),
    play: async ({ canvas }) => {
      for (const session of flatSessions.sessions) {
        const title = await canvas.findByText(session.title);
        const row = title.closest<HTMLElement>('[role="button"]');

        if (!row)
          throw new Error('A Session title must belong to its row button');

        const logo = within(row).getByTestId('session-logo');

        await expect(title).toBeVisible();
        await expect(logo).toBeVisible();
        await expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
        await expect(within(row).getByText(/^(now|\d+[smhdw])$/)).toBeVisible();
        await expectLogoGap(title, logo, expectedGap);
      }

      const title = canvas.getByText(selectedTitle);
      await expect(title.scrollWidth).toBeGreaterThan(title.clientWidth);
      await expect(title.closest('[role="button"]')).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    },
  };
}

// Phone glyphs remain 20px in the existing 16px sidebar slot; their visible gap stays 8px.
export const FlatRowsPhone = flatRows(390, 8);

export const FlatRowsWide = flatRows(1440, 10);

async function expectLogoGap(
  title: HTMLElement,
  logo: HTMLElement,
  expected: number,
): Promise<void> {
  await waitFor(async () => {
    const gap =
      title.getBoundingClientRect().left - logo.getBoundingClientRect().right;

    await expect(gap).toBeCloseTo(expected, 0);
  });
}
