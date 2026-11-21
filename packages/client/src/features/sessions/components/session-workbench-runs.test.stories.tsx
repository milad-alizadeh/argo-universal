import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect, fn } from 'storybook/test';
import {
  partiallyReadyGroup,
  stoppedGroup,
  stoppedRuns,
  workbenchRuns,
} from '../../../../mocks/run-configurations';
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

export const StartsDefaultGroup: Story = {
  args: {
    runs: stoppedRuns,
    defaultGroup: { status: stoppedGroup, onStart: fn(), onStop: fn() },
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Start dev group' }),
    );

    await expect(args.defaultGroup?.onStart).toHaveBeenCalledTimes(1);
    await expect(args.onStart).not.toHaveBeenCalled();
    await expect(args.onOpen).not.toHaveBeenCalled();
  },
};

export const StopsPartiallyReadyDefaultGroup: Story = {
  args: {
    defaultGroup: { status: partiallyReadyGroup, onStart: fn(), onStop: fn() },
  },
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Stop dev group' }),
    );

    await expect(args.defaultGroup?.onStop).toHaveBeenCalledTimes(1);
    await expect(args.onStop).not.toHaveBeenCalled();
    await expect(args.onOpen).not.toHaveBeenCalled();
  },
};
