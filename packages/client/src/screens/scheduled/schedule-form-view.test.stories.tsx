import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { Dialog } from '@repo/kit/primitives/overlays/dialog';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, screen } from 'storybook/test';
import { ScheduleFormView } from './schedule-form-view';
import { scheduleFormFixture } from './scheduled-fixtures';

const meta = {
  title: 'Tests/Screens/Scheduled/New Schedule',
  component: ScheduleFormView,
  parameters: { screenPreview: true },
  decorators: [
    (Story): ReactElement => (
      <Dialog open>
        <Story />
      </Dialog>
    ),
  ],
  args: { ...scheduleFormFixture, onSubmit: fn() },
} satisfies Meta<typeof ScheduleFormView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CreatesWithExplicitMainCheckout: Story = {
  play: async ({ args, userEvent }) => {
    const dialog = await screen.findByRole('dialog', { name: 'New Schedule' });
    await settleOverlays(dialog);
    await userEvent.click(
      screen.getByRole('button', { name: 'Create Schedule' }),
    );
    await expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter instructions',
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Instructions' }),
      'Review the build',
    );
    await userEvent.click(screen.getByRole('link', { name: /^Advanced/ }));
    await userEvent.click(screen.getByRole('button', { name: /Checkout/ }));
    const main = await screen.findByRole('option', { name: 'Main Checkout' });
    await settleOverlays(main);
    await userEvent.click(main);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Create Schedule' }),
    );
    await expect(args.onSubmit).toHaveBeenCalledWith({
      projectId: 'argo',
      agent: 'agent-1',
      checkout: { type: 'main' },
      configOptions: [],
      intervalSeconds: 3600,
      instructions: 'Review the build',
    });
  },
};
