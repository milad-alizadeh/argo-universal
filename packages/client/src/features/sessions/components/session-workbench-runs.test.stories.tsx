import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import { workbenchRuns } from '../../../../mocks/run-configurations';
import { WorkbenchRuns } from './session-workbench-runs';

const meta = {
  title: 'Tests/Sessions/SessionWorkbenchRuns',
  component: WorkbenchRuns,
  args: {
    runs: workbenchRuns,
    onOpen: fn(),
    onStart: fn(),
    onStop: fn(),
  },
} satisfies Meta<typeof WorkbenchRuns>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ControlsRunWithoutOpeningIt: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Start docs' }));
    await userEvent.click(canvas.getByRole('button', { name: 'Stop web' }));

    await expect(args.onStart).toHaveBeenCalledTimes(1);
    await expect(args.onStart).toHaveBeenCalledWith('docs');
    await expect(args.onStop).toHaveBeenCalledTimes(1);
    await expect(args.onStop).toHaveBeenCalledWith('web');
    await expect(args.onOpen).not.toHaveBeenCalled();

    await userEvent.click(
      canvas.getByRole('button', { name: 'Open web Terminal' }),
    );

    await expect(args.onOpen).toHaveBeenCalledTimes(1);
    await expect(args.onOpen).toHaveBeenCalledWith('web');
  },
};
