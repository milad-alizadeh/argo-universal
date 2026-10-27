import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type { JSX } from 'react';
import { expect, within } from 'storybook/test';
import { fewChanges, useMemoryChanges } from './session-changes.test.mocks';
import type { SessionDetailViewProps } from './session-detail-view';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  pullRequestMocks,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

const meta = {
  title: 'Tests/Screens/Sessions/Session/Workbench',
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
  beforeEach: (): Promise<void> => settleLayout(1920),
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

const firstChangeLabel = 'Open files of Change #45';

// The Inspector's own glyph label for the same Changes.
const stageLabels = ['Open Change #45', 'Open Change #46'];

export const ChecksStayWithTheChangesSummary: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByLabelText('CI Checks 3/5, 2 running'),
    ).toBeVisible();
    await expect(canvas.getByTestId('session-workbench')).toBeVisible();
  },
};

export const SeveralPullRequestsInInspector: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: firstChangeLabel }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }));
    const panel = within(canvas.getByRole('tabpanel', { name: 'Changes' }));

    for (const label of stageLabels) {
      await expect(panel.getByLabelText(label)).toBeVisible();
    }
  },
};

// The Session page with its changed files read from an in-memory Server.
function WithChangedFiles(view: SessionDetailViewProps): JSX.Element {
  const changes = useMemoryChanges(fewChanges);

  return (
    <FramedSessionPreview
      {...(view.state === 'open' ? { ...view, changes } : view)}
    />
  );
}

export const SwitchesChangeAndFiles: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, [pullRequestMocks.checksPassed]),
    },
  },
  render: ({ view }): JSX.Element => <WithChangedFiles {...view} />,
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await canvas.findByRole('button', { name: firstChangeLabel }),
    );
    await userEvent.click(canvas.getByRole('button', { name: 'Files' }));
    await expect(
      canvas.getAllByRole('button', { name: /^Diff for/ }).length,
    ).toBeGreaterThan(0);
    await expect(canvas.queryByRole('button', { name: 'Back' })).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Change' }));
    await expect(
      canvas.queryByRole('button', { name: /^Diff for/ }),
    ).toBeNull();
  },
};
