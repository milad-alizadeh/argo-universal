import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, screen, waitFor, within } from 'storybook/test';
import {
  allChanges,
  changesOnMain,
  findFileHeader,
  largeFile,
  manyChanges,
  MemoryChangesInspector,
  picker,
  scrollToFile,
} from './session-changes.test.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangesComparison',
  globals: { mode: 'light' },
  args: { catalog: changesOnMain },
  render: (args): JSX.Element => <MemoryChangesInspector {...args} />,
} satisfies Meta<typeof MemoryChangesInspector>;

export default meta;

type Story = StoryObj<typeof meta>;

const comparisonPopover = { name: 'Comparison' };

const uncommitted = 'Uncommitted Changes';

async function markFirstViewed(
  canvas: ReturnType<typeof within>,
  userEvent: Parameters<NonNullable<Story['play']>>[0]['userEvent'],
): Promise<void> {
  await findFileHeader(largeFile);

  const [mark] = canvas.getAllByRole('checkbox', { name: 'Viewed' });

  if (!mark) throw new Error('Missing Viewed mark');
  await userEvent.click(mark);
  await expect(canvas.getByText('1/4 viewed')).toBeVisible();
}

/*
 * Another comparison starts the Viewed marks over and names itself in the empty state; it stays picked when the window
 * narrows to a phone, whose sheet has no picker.
 */
export const PicksUncommitted: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await markFirstViewed(canvas, userEvent);
    await userEvent.click(await picker(allChanges));
    await userEvent.click(
      await screen.findByRole('radio', { name: uncommitted }),
    );
    await expect(await picker(uncommitted)).toBeVisible();
    await expect(await canvas.findByText(/^No uncommitted/)).toBeVisible();
    await userEvent.click(await picker(uncommitted));
    await userEvent.click(
      await screen.findByRole('radio', { name: allChanges }),
    );
    await expect(await canvas.findByText('0/4 viewed')).toBeVisible();
    await settleLayout('phone');
    await expect(
      screen.queryByRole('button', { name: /^Comparison/ }),
    ).toBeNull();
  },
};

// Wide, the branches are listed under Compare Against in a popover by the picker, and a search narrows them.
export const SearchesBranchesInAPopover: Story = {
  play: async ({ canvas, userEvent }) => {
    await settleLayout('wide');
    await userEvent.click(await picker(allChanges));

    const popover = await screen.findByRole('dialog', comparisonPopover);

    await userEvent.type(
      within(popover).getByRole('searchbox', { name: 'Search Comparison' }),
      'fix',
    );
    await waitFor(() =>
      expect(within(popover).getAllByRole('radio')).toHaveLength(1),
    );
    await userEvent.click(
      within(popover).getByRole('radio', { name: 'fix/diff-scroll' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('dialog', comparisonPopover)).toBeNull(),
    );
    await expect(await picker('Compare Against fix/diff-scroll')).toBeVisible();
    // The pill names the branch too; the empty message is the other match.
    await waitFor(() =>
      expect(
        canvas
          .getAllByText(/fix\/diff-scroll/)
          .filter((element) => !element.closest('button')),
      ).toHaveLength(1),
    );
  },
};

// The phone sheet titles itself Changes and leads with its Git segments instead of the desktop comparison controls.
export const PhoneHasTheGitHeader: Story = {
  args: { catalog: manyChanges },
  play: async () => {
    await settleLayout('phone');
    await expect(
      await screen.findByRole('button', { name: 'Files', pressed: true }),
    ).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Change' })).toBeDisabled();
    await expect(
      screen.getByRole('heading', { name: 'Changes' }),
    ).toBeVisible();
    await expect(
      screen.queryByRole('button', { name: /^Comparison/ }),
    ).toBeNull();
    const last = await scrollToFile('/repo/src/module-60/index.ts');
    await waitFor(() => expect(last).toBeVisible());
    await expect(
      screen.getByRole('button', { name: 'Files', pressed: true }),
    ).toBeVisible();
  },
};
