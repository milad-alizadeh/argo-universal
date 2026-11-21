import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Dialog } from '@repo/kit/primitives/overlays/dialog';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fireEvent, fn, screen } from 'storybook/test';
import { ScheduleFormPreview } from './schedule-form-preview.mocks';
import { ScheduleFormView } from './schedule-form-view';
import {
  customWeeksTiming,
  scheduleFormFixture,
  weekdaysTiming,
} from './scheduled-fixtures';

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
  args: {
    ...scheduleFormFixture,
    timing: { ...weekdaysTiming, onChange: fn() },
    onSubmit: fn(),
  },
  render: (args): ReactElement => <ScheduleFormPreview {...args} />,
} satisfies Meta<typeof ScheduleFormView>;

export default meta;

type Story = StoryObj<typeof meta>;

const newSchedule = 'New Schedule';

const createSchedule = 'Create Schedule';

const instructions = 'Review the build';

export const CreatesWithExplicitMainCheckout: Story = {
  play: async ({ args, userEvent }) => {
    const dialog = await screen.findByRole('dialog', { name: newSchedule });
    await settleOverlays(dialog);
    await userEvent.click(screen.getByRole('button', { name: createSchedule }));
    await expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter instructions',
    );
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Instructions' }),
      instructions,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Repeat' }));
    const interval = await screen.findByRole('option', { name: 'Interval' });
    await settleOverlays(interval);
    await userEvent.click(interval);
    await userEvent.click(screen.getByRole('link', { name: /^Advanced/ }));
    await userEvent.click(screen.getByRole('button', { name: /Checkout/ }));
    const main = await screen.findByRole('option', { name: 'Main Checkout' });
    await settleOverlays(main);
    await userEvent.click(main);
    await userEvent.click(screen.getByRole('button', { name: 'Done' }));
    await userEvent.click(screen.getByRole('button', { name: createSchedule }));
    await expect(args.onSubmit).toHaveBeenCalledWith({
      projectId: 'argo',
      agent: 'agent-1',
      checkout: { type: 'main' },
      configOptions: [],
      cadence: { type: 'interval', intervalSeconds: 3600 },
      instructions: instructions,
    });
  },
};

export const CreatesEveryTwoWeeksOnSelectedDays: Story = {
  play: async ({ args, userEvent }) => {
    const dialog = await screen.findByRole('dialog', { name: newSchedule });
    await settleOverlays(dialog);
    await userEvent.click(screen.getByRole('button', { name: 'Repeat' }));
    const custom = await screen.findByRole('option', { name: 'Custom' });
    await settleOverlays(custom);
    await userEvent.click(custom);

    const every = screen.getByRole('textbox', { name: 'Every' });
    await userEvent.clear(every);
    await userEvent.type(every, '2');
    await userEvent.click(screen.getByRole('button', { name: /^On days/ }));
    const thursday = await screen.findByRole('button', { name: /Thursday/ });
    await settleOverlays(thursday);
    await userEvent.click(thursday);
    await userEvent.keyboard('{Escape}');

    const time = screen.getByLabelText('Start time');
    await fireEvent.change(time, { target: { value: '10:30' } });
    await userEvent.click(screen.getByRole('button', { name: /^Time zone/ }));
    const utc = await screen.findByRole('radio', { name: /UTC/ });
    await settleOverlays(utc);
    await userEvent.click(utc);
    await expect(screen.getByText(/^Next run · /)).toBeVisible();

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Instructions' }),
      instructions,
    );
    await userEvent.click(screen.getByRole('button', { name: createSchedule }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        cadence: {
          type: 'custom',
          every: 2,
          unit: 'week',
          weekdays: ['monday', 'thursday'],
          localTime: '10:30',
          timeZone: 'UTC',
        },
      }),
    );
  },
};

export const KeepsCreateReachableInAShortWindow: Story = {
  args: { timing: { ...customWeeksTiming, onChange: fn() } },
  play: async ({ userEvent }) => {
    await settleLayout('wide', 530);
    const dialog = await screen.findByRole('dialog', { name: newSchedule });
    await settleOverlays(dialog);

    const create = screen.getByRole('button', { name: createSchedule });
    const initialPosition = create.getBoundingClientRect().top;
    await expect(create.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      window.innerHeight,
    );

    const timeZone = screen.getByRole('button', { name: /^Time zone/ });
    timeZone.scrollIntoView({ block: 'end' });
    await userEvent.click(timeZone);
    const utc = await screen.findByRole('radio', { name: /UTC/ });
    await settleOverlays(utc);
    await userEvent.click(utc);

    await expect(create.getBoundingClientRect().top).toBe(initialPosition);
  },
};
