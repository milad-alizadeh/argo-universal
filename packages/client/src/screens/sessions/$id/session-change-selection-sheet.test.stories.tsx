import { settleLayout } from '@repo/kit/mocks/story-layout';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { type JSX, useState } from 'react';
import { expect, screen } from 'storybook/test';
import { useSessionPanels } from '#features/sessions';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  pullRequestMocks,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { idleSession } from './session-detail-view.mocks';

// The Session page itself on a phone, with its Changes sheet open: the real header, Feed and sheet.
function SessionWithChangesSheet(): JSX.Element {
  const panels = useSessionPanels(['changes']);
  const [opened, setOpened] = useState(false);

  if (!opened) {
    panels.select('changes');
    setOpened(true);
  }

  const view = withPullRequests(idleSession, [pullRequestMocks.checksRunning]);

  return (
    <FramedSessionPreview state="open" {...view} inspectorPanels={panels} />
  );
}

const meta = {
  title: 'Tests/Screens/Sessions/Session/ChangeSelectionSheet',
  parameters: { screenPreview: true },
  render: (): JSX.Element => <SessionWithChangesSheet />,
  beforeEach: (): Promise<void> => settleLayout('phone'),
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const title = pullRequestMocks.checksRunning.title;

// The PR is in the sheet; the Session's header stays on identity and state (ADR-0039).
export const HeaderHoldsNoPullRequestText: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(
      await screen.findByRole('button', { name: 'Change' }),
    );
    await expect(
      await screen.findByRole('button', { name: /^Show Change #45,/ }),
    ).toBeVisible();
    await expect(canvas.queryByText(/#45/)).toBeNull();
    await expect(canvas.queryByText(title)).toBeNull();
  },
};
