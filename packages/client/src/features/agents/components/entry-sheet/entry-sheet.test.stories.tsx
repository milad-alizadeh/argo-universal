import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, within } from 'storybook/test';
import { layoutWidths } from '../../../../lib/generic/each-layout';
import { settleViewport } from '../../../../lib/generic/settle-viewport';
import { EntrySheet } from './entry-sheet';

const meta = {
  title: 'Tests/Screens/Settings/Entry sheet',
  component: EntrySheet,
  args: {
    title: 'Argument',
    fields: [
      { label: 'Argument', value: '--acp', onChangeText: fn(), errors: [] },
    ],
    onSave: fn(),
    dirty: false,
    onClose: fn(),
    onRemove: fn(),
    removeLabel: 'Remove argument',
  },
  parameters: { screenPreview: true },
} satisfies Meta<typeof EntrySheet>;

export default meta;

type Story = StoryObj<typeof meta>;

const editor = (): Promise<HTMLElement> =>
  within(document.body).findByRole('dialog', { name: 'Argument' });

// A wide window's dialog offers Cancel beside Save; it closes without saving.
export const CancelsOnAWideWindow: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ args, userEvent }) => {
    const dialog = within(await editor());
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await expect(args.onClose).toHaveBeenCalled();
    await expect(args.onSave).not.toHaveBeenCalled();
  },
};

// A phone's sheet has Save across its foot with Remove under it, and no Cancel.
export const HasNoCancelOnAPhone: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
  play: async () => {
    const dialog = within(await editor());
    await expect(dialog.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(
      dialog.getByRole('button', { name: 'Remove argument' }),
    ).toBeVisible();
    await expect(dialog.queryByRole('button', { name: 'Cancel' })).toBeNull();
  },
};

// Escape closes a sheet that holds nothing yet.
export const EscapeClosesAnUntouchedSheet: Story = {
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ args, userEvent }) => {
    await editor();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).toHaveBeenCalled();
  },
};

// Typed input is not lost to Escape: the sheet stays open.
export const EscapeKeepsATouchedSheet: Story = {
  args: { dirty: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.wide),
  play: async ({ args, userEvent }) => {
    await editor();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(await editor()).toBeInTheDocument();
  },
};

// With the backdrop no longer a way out, a phone's touched sheet offers Cancel to discard its input.
export const OffersCancelOnAPhoneOnceTouched: Story = {
  args: { dirty: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
  play: async ({ args, userEvent }) => {
    const dialog = within(await editor());
    await userEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    await expect(args.onClose).toHaveBeenCalled();
  },
};

// A narrow window's sheet holds typed input against Escape as the wide dialog does.
export const EscapeKeepsATouchedSheetOnAPhone: Story = {
  args: { dirty: true },
  beforeEach: (): Promise<void> => settleViewport(layoutWidths.phone),
  play: async ({ args, userEvent }) => {
    await editor();
    await userEvent.keyboard('{Escape}');
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(await editor()).toBeInTheDocument();
  },
};
