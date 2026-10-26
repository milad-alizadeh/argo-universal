import { layoutWidths } from '@repo/kit/each-layout';
import { settleViewport } from '@repo/kit/settle-viewport';
import type { StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor, within } from 'storybook/test';
import { ChangesInspectorSheet, manyFiles } from './changes-inspector.mocks';
import {
  allChanges,
  comparisonDialog,
  fileHeader,
  picker,
  testMeta,
} from './changes-inspector.test.mocks';

const meta = { ...testMeta, title: 'Tests/Frame/ChangesInspector/Comparison' };

export default meta;

type Story = StoryObj<typeof meta>;

const comparisonPopover = { name: comparisonDialog };

// One story per width, so each starts from a fresh spy and a closed picker.
function picksUncommitted(width: number): Story {
  return {
    args: { onComparisonChange: fn() },
    play: async ({ args, userEvent }) => {
      await settleViewport(width);
      await userEvent.click(await picker(allChanges));
      await userEvent.click(
        await screen.findByRole('radio', { name: 'Uncommitted Changes' }),
      );
      await expect(args.onComparisonChange).toHaveBeenCalledWith({
        kind: 'uncommitted',
      });
    },
  };
}

export const PicksUncommittedWide = picksUncommitted(layoutWidths.wide);

// Wide, the branches are listed under Compare Against in a popover by the picker, and a search narrows them.
export const SearchesBranchesInAPopover: Story = {
  args: { onComparisonChange: fn() },
  play: async ({ args, userEvent }) => {
    await settleViewport(layoutWidths.wide);
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
    await expect(args.onComparisonChange).toHaveBeenCalledWith({
      kind: 'branch',
      branch: 'fix/diff-scroll',
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', comparisonPopover)).toBeNull(),
    );
  },
};

// The phone sheet titles itself Changes and owns its segmented header instead of the desktop comparison controls.
export const PhoneHasTheGitHeader: Story = {
  args: { files: manyFiles },
  render: (args) => <ChangesInspectorSheet {...args} />,
  play: async () => {
    await settleViewport(layoutWidths.phone);
    await screen.findByRole('dialog', { name: 'Inspector' });
    await expect(
      screen.getByRole('button', { name: 'Files', pressed: true }),
    ).toBeVisible();
    await expect(screen.getByRole('button', { name: 'Change' })).toBeDisabled();
    await expect(
      screen.getByRole('heading', { name: 'Changes' }),
    ).toBeVisible();
    await expect(
      screen.queryByRole('button', { name: 'Close Inspector' }),
    ).toBeNull();
    await expect(
      screen.queryByRole('button', { name: /^Comparison/ }),
    ).toBeNull();
    const last = fileHeader('/repo/src/module-60/index.ts');
    last.scrollIntoView();
    await waitFor(() => expect(last).toBeVisible());
    await expect(
      screen.getByRole('button', { name: 'Files', pressed: true }),
    ).toBeVisible();
  },
};
