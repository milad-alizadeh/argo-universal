import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { ChangesInspectorSheet } from './changes-inspector.mocks';
import {
  allChanges,
  compareAgainst,
  fileHeader,
  largeFile,
  picker,
  testMeta,
} from './changes-inspector.test.mocks';

const meta = { ...testMeta, title: 'Tests/ChangesInspector' };

export default meta;

type Story = StoryObj<typeof meta>;

const compareAgainstDialog = { name: compareAgainst };

// One story per width, so each starts from a fresh spy and a closed menu.
function picksUncommitted(width: number): Story {
  return {
    args: { onComparisonChange: fn() },
    play: async ({ args, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(await picker(allChanges));
      await userEvent.click(
        await screen.findByRole('menuitemradio', {
          name: 'Uncommitted Changes',
        }),
      );
      await expect(args.onComparisonChange).toHaveBeenCalledWith({
        kind: 'uncommitted',
      });
    },
  };
}

export const PicksUncommittedPhone = picksUncommitted(layoutWidths.phone);

export const PicksUncommittedWide = picksUncommitted(layoutWidths.wide);

// Wide, Compare Against opens its branches in a popover by the picker.
export const CompareAgainstInAPopover: Story = {
  args: { onComparisonChange: fn() },
  play: async ({ args, userEvent }) => {
    await settleViewport(layoutWidths.wide);
    await userEvent.click(await picker(allChanges));
    await userEvent.click(
      await screen.findByRole('menuitemradio', compareAgainstDialog),
    );

    const popover = await screen.findByRole('dialog', compareAgainstDialog);

    await userEvent.type(
      within(popover).getByRole('searchbox', { name: 'Search Branches' }),
      'fix',
    );
    await waitFor(() =>
      expect(within(popover).getAllByRole('radio')).toHaveLength(1),
    );
    await userEvent.click(
      within(popover).getByRole('radio', { name: 'fix/diff-scroll' }),
    );
    await expect(args.onComparisonChange).toHaveBeenCalledWith({
      kind: 'branch',
      branch: 'fix/diff-scroll',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', compareAgainstDialog)).toBeNull(),
    );
  },
};

// On a phone, Compare Against pushes its branches as a page of the Inspector sheet.
export const CompareAgainstInTheSheet: Story = {
  args: { onComparisonChange: fn() },
  render: (args) => <ChangesInspectorSheet {...args} />,
  play: async ({ args, userEvent }) => {
    await settleViewport(layoutWidths.phone);
    await screen.findByRole('dialog', { name: 'Inspector' });
    await userEvent.click(await picker(allChanges));
    await userEvent.click(
      await screen.findByRole('menuitemradio', compareAgainstDialog),
    );
    await expect(
      await screen.findByRole('heading', compareAgainstDialog),
    ).toBeVisible();
    await userEvent.click(screen.getByRole('radio', { name: 'release/2.4' }));
    await expect(args.onComparisonChange).toHaveBeenCalledWith({
      kind: 'branch',
      branch: 'release/2.4',
    });
    await waitFor(() => expect(fileHeader(largeFile)).toBeVisible());
  },
};
