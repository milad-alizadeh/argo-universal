import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fireEvent, screen, waitFor, within } from 'storybook/test';
import sections, { SchedulesInspector } from './session-sections.stories';

const meta = {
  title: 'Tests/Screens/Sessions/Session/Sections/FollowUp',
  parameters: sections.parameters,
  render: sections.component,
  args: sections.args,
} satisfies Meta<typeof sections.component>;

export default meta;

type Story = StoryObj<typeof meta>;

const addFollowUp = 'Add follow-up';

const formTitle = 'Schedule follow-up';

export const ValidatesFollowUp = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ canvas, userEvent }): Promise<void> => {
    await userEvent.click(canvas.getByRole('button', { name: addFollowUp }));

    const form = await screen.findByRole('dialog', {
      name: formTitle,
    });

    const save = within(form).getByRole('button', { name: 'Schedule' });
    await settleOverlays(save);
    await expect(form).toBeVisible();
    await userEvent.click(save);
    await expect(await screen.findByRole('alert')).toHaveTextContent(
      'Enter a Prompt',
    );
  },
} satisfies Story;

export const SchedulesAnInterval = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ args, canvas, userEvent }): Promise<void> => {
    const prompt = 'Check the build';
    await userEvent.click(canvas.getByRole('button', { name: addFollowUp }));

    const form = within(await screen.findByRole('dialog', { name: formTitle }));

    await fireEvent.change(form.getByRole('textbox', { name: 'Prompt' }), {
      target: { value: prompt },
    });
    const cadence = form.getByRole('button', { name: /^Cadence/ });
    await settleOverlays(cadence);
    await userEvent.click(cadence);
    const interval = await screen.findByRole('option', { name: 'Interval' });
    await settleOverlays(interval);
    await userEvent.click(interval);

    const end = await form.findByLabelText('Ends at');
    const local = '2099-06-03T12:00';
    await fireEvent.change(end, { target: { value: local } });
    const save = form.getByRole('button', { name: 'Schedule' });
    await settleOverlays(save);
    await userEvent.click(save);

    await expect(args.content.schedules?.create).toHaveBeenCalledWith({
      prompt: [{ type: 'text', text: prompt }],
      intervalSeconds: 3600,
      endsAt: new Date(local).getTime(),
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
} satisfies Story;

export const EditsAnIntervalEnd = {
  ...SchedulesInspector,
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ args, canvas, userEvent }): Promise<void> => {
    const row = await canvas.findByRole('group', {
      name: 'Check open pull requests',
    });

    const edit = within(row).getByRole('button', { name: 'Edit end' });
    await userEvent.click(edit);

    const form = within(
      await screen.findByRole('dialog', { name: 'Edit follow-up end' }),
    );

    const local = '2099-06-04T13:00';
    await fireEvent.change(form.getByLabelText('Ends at'), {
      target: { value: local },
    });
    const save = form.getByRole('button', { name: 'Save' });
    await settleOverlays(save);
    await userEvent.click(save);
    await expect(args.content?.schedules?.setEnd).toHaveBeenCalledWith(
      'build',
      new Date(local).getTime(),
    );
  },
} satisfies Story;

export const SchedulesOnce = {
  beforeEach: (): Promise<void> => settleLayout('wide'),
  play: async ({ args, canvas, userEvent }): Promise<void> => {
    await userEvent.click(canvas.getByRole('button', { name: addFollowUp }));

    const form = within(await screen.findByRole('dialog', { name: formTitle }));

    const text = 'Check the nightly build once';
    const local = '2099-06-03T12:00';
    await fireEvent.change(form.getByRole('textbox', { name: 'Prompt' }), {
      target: { value: text },
    });
    await fireEvent.change(form.getByLabelText('Run at'), {
      target: { value: local },
    });
    const save = form.getByRole('button', { name: 'Schedule' });
    await settleOverlays(save);
    await userEvent.click(save);

    const create = args.content.schedules?.create;
    await expect(create).toHaveBeenCalledTimes(1);
    await expect(create).toHaveBeenCalledWith({
      prompt: [{ type: 'text', text }],
      onceAt: new Date(local).getTime(),
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
  },
} satisfies Story;
