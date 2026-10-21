import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect } from 'storybook/test';
import { settleViewport } from '#lib/generic/settle-viewport';
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

export const ChecksStayWithTheChangesSummary: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByLabelText('CI Checks 8/10, 2 running'),
    ).toBeVisible();
    await expect(canvas.queryByTestId('session-header-bar')).toBeNull();
    await expect(canvas.getByTestId('session-workbench')).toBeVisible();
  },
};
