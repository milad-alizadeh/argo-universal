import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen, waitFor } from 'storybook/test';
import { allToasts, findToast } from '../../../../mocks/find-toast';
import {
  ActionToastExample,
  ErrorToastExample,
  archivedWithUndo,
  failedOpen,
} from './toast-example.mocks';

const meta = {
  title: 'Tests/Toast',
  component: ErrorToastExample,
} satisfies Meta<typeof ErrorToastExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ShowsTheFailureOnce: Story = {
  play: async () => {
    await findToast(failedOpen.title);
    await expect(await allToasts(failedOpen.title)).toHaveLength(1);
  },
};

export const ShowsTheMessageUnderTheTitle: Story = {
  play: async () => {
    await expect(await findToast(failedOpen.message)).toBeVisible();
  },
};

const onUndo = fn();

// A toast with an action: pressing it runs the action once and closes the toast. The web only; phones show no action toast.
export const ActionRunsAndCloses: Story = {
  render: () => <ActionToastExample onUndo={onUndo} />,
  beforeEach: () => {
    onUndo.mockClear();
  },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Archive' }));
    await findToast(archivedWithUndo.title);
    await userEvent.click(
      screen.getByRole('button', { name: archivedWithUndo.action }),
    );
    await expect(onUndo).toHaveBeenCalledTimes(1);
    await waitFor(async () =>
      expect(await allToasts(archivedWithUndo.title)).toHaveLength(0),
    );
  },
};
