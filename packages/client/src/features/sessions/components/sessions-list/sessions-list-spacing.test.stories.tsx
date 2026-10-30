import { settleLayout } from '@repo/kit/mocks/story-layout';
import { expect, waitFor, within } from 'storybook/test';
import {
  meta as sessionsMeta,
  type Story,
} from '../../../../../mocks/sessions-list/sessions-list-story-context.test.mocks';
import { orphanSessions } from './sessions-list-nested-fixtures';
import {
  compactStatusSessions,
  flatSessions,
  mixedParent,
  mixedSessions,
  standaloneSession,
  statusSessions,
} from './sessions-list-spacing-fixtures';

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

/*
 * Every row's logo sits `expectedGap` from its title, whatever its status, Agent or title length, and its content stays
 * inside the row. The age ends each row, so a long title truncates instead of pushing it out.
 */
function rowsAt(
  args: typeof statusSessions,
  width: number,
  expectedGap: number,
): Story {
  return {
    args,
    beforeEach: () => settleLayout(width),
    play: async ({ canvas }) => {
      for (const session of args.sessions) {
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
    },
  };
}

function flatRows(width: number, expectedGap: number): Story {
  const rows = rowsAt(flatSessions, width, expectedGap);

  return {
    ...rows,
    play: async (context) => {
      await rows.play?.(context);

      const title = context.canvas.getByText(selectedTitle);
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

// Running, failed, idle, unread and waiting Sessions of both Agents keep one gap.
export const StatusRowsWide = rowsAt(statusSessions, 1440, 10);

export const StatusRowsPhone = rowsAt(statusSessions, 390, 8);

// A Compact row is one line with its lanes 10 apart, the same logo-to-title gap as a Regular row.
export const CompactRowsWide = rowsAt(compactStatusSessions, 1440, 10);

export const CompactRowsPhone = rowsAt(compactStatusSessions, 390, 8);

// A parent and a childless Session in one group start their titles on one edge, with the tree lane between logo and text.
export const MixedTreeRows: Story = {
  args: mixedSessions,
  beforeEach: () => settleLayout('wide'),
  play: async ({ canvas }) => {
    const parent = await canvas.findByText(mixedParent.title);
    const leaf = await canvas.findByText(standaloneSession.title);

    await waitFor(() =>
      expect(leaf.getBoundingClientRect().left).toBeCloseTo(
        parent.getBoundingClientRect().left,
        0,
      ),
    );
  },
};

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
