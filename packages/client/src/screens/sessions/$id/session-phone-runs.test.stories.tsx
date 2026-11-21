import { settleOverlays } from '@repo/kit/mocks/settle-overlays';
import { settleLayout } from '@repo/kit/mocks/story-layout';
import { withStack } from '@repo/kit/story-stack';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { ReactElement } from 'react';
import { expect, fn } from 'storybook/test';
import { workbenchRuns } from '../../../../mocks/run-configurations';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { idleSession } from './session-detail-view.mocks';
import { openWorkbench } from './session-workbench-sheet.test.mocks';

const start = fn<(name: string) => void>();

const stop = fn<(name: string) => void>();

const runs = {
  runs: workbenchRuns,
  onStart: start,
  onStop: stop,
  onRestart: fn(),
  renderTerminal: (): null => null,
};

const meta = {
  title: 'Tests/Screens/Sessions/Session/PhoneRuns',
  parameters: { screenPreview: true },
  decorators: [withStack()],
  beforeEach: (): Promise<void> => settleLayout('phone'),
  render: (): ReactElement => (
    <FramedSessionPreview state="open" {...idleSession} runs={runs} />
  ),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const ControlsRunsAndOpensTheTerminalInTheSheet: Story = {
  play: async (context) => {
    const sheet = await openWorkbench(context);
    const row = sheet.getByRole('link', { name: /Runs.*1/ });

    await settleOverlays(row);
    await context.userEvent.click(row);

    await expect(
      await sheet.findByRole('heading', { name: 'Runs' }),
    ).toBeVisible();

    const play = sheet.getByRole('button', { name: 'Start docs' });

    await settleOverlays(play);
    await context.userEvent.click(play);
    await context.userEvent.click(
      sheet.getByRole('button', { name: 'Stop web' }),
    );

    await expect(start).toHaveBeenCalledWith('docs');
    await expect(stop).toHaveBeenCalledWith('web');

    await context.userEvent.click(
      sheet.getByRole('button', { name: 'Open web Terminal' }),
    );

    await expect(
      await sheet.findByRole('heading', { name: 'web' }),
    ).toBeVisible();
    await expect(sheet.getByText('http://localhost:3100')).toBeVisible();
    await expect(
      sheet.queryByRole('link', { name: 'http://localhost:3100' }),
    ).toBeNull();
  },
};
