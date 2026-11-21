import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn, screen } from 'storybook/test';
import { ScheduleFormView } from './schedule-form-view';
import { scheduleFormFixture } from './scheduled-fixtures';

const meta = {
  title: 'Tests/Screens/Scheduled/New Schedule',
  component: ScheduleFormView,
  parameters: { screenPreview: true },
  args: { ...scheduleFormFixture, onSubmit: fn() },
} satisfies Meta<typeof ScheduleFormView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CreatesWithExplicitMainCheckout: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Create Schedule' }),
    );
    await expect(canvas.getByRole('alert')).toHaveTextContent(
      'Enter instructions',
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.type(
      canvas.getByRole('textbox', { name: 'Instructions' }),
      'Review the build',
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Advanced' }));
    await userEvent.click(canvas.getByRole('button', { name: /Checkout/ }));
    const main = await screen.findByRole('option', { name: 'Main Checkout' });
    await settleOverlays(main);
    await userEvent.click(main);
    await userEvent.click(
      canvas.getByRole('button', { name: 'Create Schedule' }),
    );
    await expect(args.onSubmit).toHaveBeenCalledWith({
      projectId: 'argo',
      agent: 'codex',
      checkout: { type: 'main' },
      configOptions: [],
      intervalSeconds: 3600,
      instructions: 'Review the build',
    });
  },
};
