import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { useState } from 'react';
import { fn } from 'storybook/test';
import type { ElicitationFormProps } from '#features/requests';
import { DesktopShellFrame } from '../../../../mocks/desktop-shell';
import {
  elicitationProps,
  questionsRequest,
  questionsValues,
} from '../../../../mocks/elicitation';
import { useWide } from '../../../lib/generic/use-wide/use-wide';
import { SessionView, type SessionViewProps } from './session-view';
import {
  pullRequestMocks,
  withPullRequests,
} from './session-view-pull-request.mocks';
import {
  emptySession,
  idleSession,
  longSession,
  runningSession,
} from './session-view.mocks';

const meta = {
  title: 'Screens/Sessions/Session',
  parameters: { screenPreview: true },
  args: { view: { state: 'open', ...runningSession } },
  render: ({ view }): React.JSX.Element => <SessionView {...view} />,
} satisfies Meta<{ view: SessionViewProps }>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Overview: Story = { name: 'SessionScreen' };

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

function ElicitationPreview(props: SessionViewProps): React.JSX.Element {
  if (!useWide()) return <InteractiveElicitation {...props} />;

  return (
    <DesktopShellFrame
      onSectionChange={fn()}
      onSidebarShownChange={fn()}
      onInspectorStateChange={fn()}
    >
      <InteractiveElicitation {...props} />
    </DesktopShellFrame>
  );
}

function InteractiveElicitation(props: SessionViewProps): React.JSX.Element {
  const [answered, setAnswered] = useState(false);

  if (props.state !== 'open') return <SessionView {...props} />;

  const elicitation = answered
    ? undefined
    : closableElicitation(props.elicitation, () => setAnswered(true));

  return <SessionView {...props} elicitation={elicitation} />;
}

function closableElicitation(
  props: ElicitationFormProps | undefined,
  close: () => void,
): ElicitationFormProps | undefined {
  if (!props) return;

  return {
    ...props,
    onAnswer: (answer): void => {
      props.onAnswer(answer);
      close();
    },
  };
}
