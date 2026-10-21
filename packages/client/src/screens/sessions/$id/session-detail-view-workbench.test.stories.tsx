import { settleViewport } from '@repo/kit/settle-viewport';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, within } from 'storybook/test';
import { changesArgs } from '../../../features/frame/components/changes-inspector/changes-inspector.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  pullRequestMocks,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/SessionDetailView/Workbench',
  parameters: { screenPreview: true },
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, [
        pullRequestMocks.checksRunning,
        { ...pullRequestMocks.checksPassed, number: 46 },
      ]),
    },
  },
  render: ({ view }): JSX.Element => <FramedSessionPreview {...view} />,
  beforeEach: (): Promise<void> => settleViewport(1920),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

const firstChangeLabel = 'Open Change #45';

export const ChecksStayWithTheChangesSummary: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByLabelText('CI Checks 3/5, 2 running'),
    ).toBeVisible();
    await expect(canvas.queryByTestId('session-header-bar')).toBeNull();
    await expect(canvas.getByTestId('session-workbench')).toBeVisible();
  },
};

export const SeveralPullRequestsInStage: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: firstChangeLabel }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }));
    const stage = within(canvas.getByRole('tabpanel', { name: 'Changes' }));

    await expect(stage.getByLabelText(firstChangeLabel)).toBeVisible();
    await expect(stage.getByLabelText('Open Change #46')).toBeVisible();
  },
};

export const MergesFromChangeDetail: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, [pullRequestMocks.checksPassed]),
      changes: changesArgs,
    },
  },
  play: async ({ canvas, userEvent, args }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: firstChangeLabel }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Files' }));
    await expect(
      canvas.getAllByRole('button', { name: /^Diff for/ }).length,
    ).toBeGreaterThan(0);
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
    await expect(canvas.queryByRole('button', { name: 'Merge' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }));
    await expect(
      await canvas.findByRole('button', { name: 'Merge' }),
    ).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Files' }));
    await expect(canvas.queryByRole('button', { name: 'Merge' })).toBeNull();
    await expect(
      canvas.getAllByRole('button', { name: /^Diff for/ }).length,
    ).toBeGreaterThan(0);
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }));
    const merge = await canvas.findByRole('button', { name: 'Merge' });

    await userEvent.click(merge);

    if (args.view.state !== 'open') throw new Error('Open Session required');

    await expect(args.view.header.onMerge).toHaveBeenCalledWith(45, 'squash');
  },
};
