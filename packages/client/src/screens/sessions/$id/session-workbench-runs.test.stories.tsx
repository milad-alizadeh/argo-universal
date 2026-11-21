import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn, waitFor } from 'storybook/test';
import { workbenchRuns } from '../../../features/sessions/components/session-workbench-runs-fixtures';
import type { OpenSessionViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/WorkbenchRuns',
  parameters: { screenPreview: true },
  render: ({ runs }): ReactElement => (
    <FramedSessionPreview state="open" {...idleSession} runs={runs} />
  ),
  beforeEach: (): Promise<void> => settleLayout(2560),
  args: {
    runs: {
      runs: workbenchRuns,
      onStart: fn(),
      onStop: fn(),
      onRestart: fn(),
      renderTerminal: () => null,
    },
  },
} satisfies Meta<Pick<OpenSessionViewProps, 'runs'>>;

export default meta;

type Story = StoryObj<typeof meta>;

export const OpensSiblingTerminalsAndClosesWithoutStopping: Story = {
  play: async ({ args, canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: 'Open web Terminal' }),
    );
    await expect(
      await canvas.findByRole('tabpanel', { name: 'web' }),
    ).toBeVisible();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open docs Terminal' }),
    );
    await expect(canvas.getByRole('tab', { name: 'web' })).toBeVisible();
    await expect(canvas.getByRole('tab', { name: 'docs' })).toBeVisible();

    await userEvent.click(canvas.getByRole('button', { name: 'Close docs' }));

    await waitFor(() =>
      expect(canvas.queryByRole('tab', { name: 'docs' })).toBeNull(),
    );
    await expect(
      await canvas.findByRole('tabpanel', { name: 'web' }),
    ).toBeVisible();
    await expect(args.runs?.onStop).not.toHaveBeenCalled();
  },
};
