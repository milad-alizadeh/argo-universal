import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import {
  elicitationProps,
  questionsRequest,
  questionsValues,
} from '../../../../mocks/elicitation';
import {
  SessionDetailView,
  type SessionDetailViewProps,
} from './session-detail-view';
import { ElicitationPreview } from './session-detail-view-elicitation.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import {
  pullRequestMocks,
  withPullRequests,
} from './session-detail-view-pull-request.mocks';
import { subagentsSession } from './session-detail-view-subagents.mocks';
import {
  emptySession,
  idleSession,
  longSession,
  runningSession,
} from './session-detail-view.mocks';

const meta = {
  title: 'Screens/Sessions/Session',
  /*
   * No `component`: its stories pass the whole view as one `view` arg, which a SessionDetailView
   * meta cannot type. Ticket #1203 flattens the wrapper; the Docs page comes with it.
   */
  tags: ['!autodocs'],
  parameters: { screenPreview: true },
  args: { view: { state: 'open', ...runningSession } },
  render: ({ view }): React.JSX.Element => <SessionDetailView {...view} />,
} satisfies Meta<{ view: SessionDetailViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'SessionDetailScreen' };

export const ChecksRunning: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(runningSession, [pullRequestMocks.checksRunning]),
    },
  },
};

export const ChecksFailing: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(runningSession, [pullRequestMocks.checksFailing]),
    },
  },
};

// Every check passed, so Merge PR is ready.
export const ChecksPassed: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(idleSession, [pullRequestMocks.checksPassed]),
    },
  },
};

export const SeveralPullRequests: Story = {
  args: {
    view: {
      state: 'open',
      ...withPullRequests(runningSession, [
        pullRequestMocks.checksRunning,
        pullRequestMocks.followUp,
      ]),
    },
  },
};

export const Idle: Story = {
  args: { view: { state: 'open', ...idleSession } },
};

export const LoadingEarlier: Story = {
  args: {
    view: {
      state: 'open',
      ...longSession,
      feed: { ...longSession.feed, loadingOlder: true },
    },
  },
};

export const LongFeed: Story = {
  args: { view: { state: 'open', ...longSession } },
};

// A long Feed in the Frame: the rail's toggle collapses and expands the sidebar while the Feed keeps its layout and only slides.
export const LongFeedInFrame: Story = {
  args: { view: { state: 'open', ...longSession } },
  render: ({ view }): React.JSX.Element => <FramedSessionPreview {...view} />,
};

export const Empty: Story = {
  args: { view: { state: 'open', ...emptySession } },
};

// The Connection is down: the draft stays editable but Send waits.
export const Disconnected: Story = {
  args: {
    view: {
      state: 'open',
      ...idleSession,
      composer: { ...idleSession.composer, sendable: false },
    },
  },
};

// Archived: the Feed reads as before; a banner takes the Composer's place.
export const Archived: Story = {
  args: { view: { state: 'open', ...idleSession, archived: true } },
};

// Files dragged over the window: the pane below the header shows where they land, and the Feed recedes behind the label.
export const DraggingFiles: Story = {
  play: async ({ canvasElement }) => {
    const transfer = new DataTransfer();

    transfer.items.add(new File(['# Notes'], 'notes.md'));
    canvasElement.dispatchEvent(
      new DragEvent('dragenter', { bubbles: true, dataTransfer: transfer }),
    );
  },
};

export const Opening: Story = { args: { view: { state: 'opening' } } };

// The page behind the failure's toast stays blank, whether or not the Server gave a reason.
export const Failed: Story = { args: { view: { state: 'failed' } } };

export const Elicitation: Story = {
  args: {
    view: {
      state: 'open',
      ...runningSession,
      header: { ...runningSession.header, status: 'needs_input' },
      composer: {
        ...runningSession.composer,
        configuration: runningSession.composer.configuration && {
          ...runningSession.composer.configuration,
          turnRunning: true,
        },
      },
      elicitation: elicitationProps({
        request: questionsRequest,
        values: questionsValues,
      }),
    },
  },
  render: ({ view }): React.JSX.Element => <ElicitationPreview {...view} />,
};

// The header opens the same Subagents list as the phone Composer, inside the Frame's Inspector.
export const Subagents: Story = {
  args: { view: subagentsSession },
  render: ({ view }): React.JSX.Element => <FramedSessionPreview {...view} />,
};
