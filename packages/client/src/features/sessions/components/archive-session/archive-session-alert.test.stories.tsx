import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import { layoutWidths } from '#lib/generic/each-layout';
import { settleViewport } from '#lib/generic/settle-viewport';
import {
  ArchiveSessionAlert,
  archiveSessionCopy,
} from './archive-session-alert';

const onArchive = fn();

const onClose = fn();

const meta = {
  title: 'Tests/ArchiveSessionAlert',
  component: ArchiveSessionAlert,
  args: { open: true, onArchive, onClose },
} satisfies Meta<typeof ArchiveSessionAlert>;

export default meta;

type Story = StoryObj<typeof meta>;

type Layout = 'phone' | 'wide';

const body = within(document.body);

async function openAlert(): Promise<ReturnType<typeof within>> {
  return within(
    await body.findByRole('dialog', { name: archiveSessionCopy.title }),
  );
}

function atWidth(layout: Layout): () => Promise<void> {
  return async () => {
    onArchive.mockClear();
    onClose.mockClear();
    await settleViewport(layoutWidths[layout]);
  };
}

// The alert says what archiving removes and what it keeps.
export const SaysWhatArchiveRemoves: Story = {
  beforeEach: atWidth('wide'),
  play: async () => {
    const alert = await openAlert();
    await waitFor(() =>
      expect(alert.getByText(archiveSessionCopy.message)).toBeVisible(),
    );
  },
};

// Archive archives the Session and closes the alert.
function archiveAt(layout: Layout): Story {
  return {
    beforeEach: atWidth(layout),
    play: async ({ userEvent }) => {
      const alert = await openAlert();
      await userEvent.click(
        alert.getByRole('button', { name: archiveSessionCopy.archive }),
      );
      await expect(onArchive).toHaveBeenCalledTimes(1);
      await expect(onClose).toHaveBeenCalledTimes(1);
    },
  };
}

export const ArchiveOnPhone: Story = archiveAt('phone');

export const ArchiveWide: Story = archiveAt('wide');

// Cancel keeps the Session.
function cancelAt(layout: Layout): Story {
  return {
    beforeEach: atWidth(layout),
    play: async ({ userEvent }) => {
      const alert = await openAlert();
      await userEvent.click(
        alert.getByRole('button', { name: archiveSessionCopy.cancel }),
      );
      await expect(onClose).toHaveBeenCalledTimes(1);
      await expect(onArchive).not.toHaveBeenCalled();
    },
  };
}

export const CancelKeepsOnPhone: Story = cancelAt('phone');

export const CancelKeepsWide: Story = cancelAt('wide');
