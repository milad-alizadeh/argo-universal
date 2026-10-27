import { layoutWidths, settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, waitFor, within } from 'storybook/test';
import {
  ArchiveSessionAlert,
  archiveSessionCopy,
} from './archive-session-alert';

const onArchive = fn();

const onClose = fn();

const meta = {
  title: 'Tests/Sessions/ArchiveSessionAlert',
  component: ArchiveSessionAlert,
  args: { open: true, onArchive, onClose },
} satisfies Meta<typeof ArchiveSessionAlert>;

export default meta;

type Story = StoryObj<typeof meta>;

const body = within(document.body);

async function openAlert(): Promise<ReturnType<typeof within>> {
  return within(
    await body.findByRole('dialog', { name: archiveSessionCopy.title }),
  );
}

// Only phones ask before archiving; the Alert primitive's own tests cover the wide layout.
async function atPhoneWidth(): Promise<void> {
  onArchive.mockClear();
  onClose.mockClear();
  await settleLayout('phone');
}

// The alert says what archiving removes and what it keeps.
export const SaysWhatArchiveRemoves: Story = {
  beforeEach: atPhoneWidth,
  play: async () => {
    const alert = await openAlert();
    await waitFor(() =>
      expect(alert.getByText(archiveSessionCopy.message)).toBeVisible(),
    );
  },
};

// Archive archives the Session and closes the alert.
export const ArchiveArchives: Story = {
  beforeEach: atPhoneWidth,
  play: async ({ userEvent }) => {
    const alert = await openAlert();
    await userEvent.click(
      alert.getByRole('button', { name: archiveSessionCopy.archive }),
    );
    await expect(onArchive).toHaveBeenCalledTimes(1);
    await expect(onClose).toHaveBeenCalledTimes(1);
  },
};

// Cancel keeps the Session.
export const CancelKeeps: Story = {
  beforeEach: atPhoneWidth,
  play: async ({ userEvent }) => {
    const alert = await openAlert();
    await userEvent.click(
      alert.getByRole('button', { name: archiveSessionCopy.cancel }),
    );
    await expect(onClose).toHaveBeenCalledTimes(1);
    await expect(onArchive).not.toHaveBeenCalled();
  },
};
