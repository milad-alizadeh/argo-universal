import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import {
  elicitationProps,
  questionsRequest,
  questionsValues,
} from '../../../../mocks/elicitation';
import { SessionDetailView } from './session-detail-view';
import { sessionPageBar } from './session-detail-view-bar.mocks';
import { ElicitationPreview } from './session-detail-view-elicitation.mocks';
import { FramedSessionPreview } from './session-detail-view-framed.mocks';
import { subagentsSession } from './session-detail-view-subagents.mocks';
import {
  emptySession,
  idleSession,
  longSession,
  runningSession,
} from './session-detail-view.mocks';
import {
  desktopPluginActions,
  phonePluginActions,
  pluginActionsSession,
} from './session-header-actions.mocks';

const meta = {
  title: 'Screens/Sessions/Session',
  component: SessionDetailView,
  parameters: { screenPreview: true },
  argTypes: {
    state: { control: 'select', options: ['open', 'opening', 'failed'] },
  },
} satisfies Meta<typeof SessionDetailView>;

export default meta;

type Story = StoryObj<typeof meta>;

// A Turn running: the header's clock, the Feed's live line, and the Composer offering Stop.
export const Running: Story = { args: { state: 'open', ...runningSession } };

// Every recording in turn, so the Feed scrolls under a pinned header and Composer.
export const LongFeed: Story = { args: { state: 'open', ...longSession } };

// A long Feed in the Frame: the rail's toggle collapses and expands the sidebar while the Feed keeps its layout and only slides.
export const LongFeedInFrame: Story = {
  args: { state: 'open', ...longSession },
  render: (args): React.JSX.Element => <FramedSessionPreview {...args} />,
};

// The Plugins' Session bar under the header: the first Plugin in Slot order shows; two more wait behind "+2".
export const SessionBar: Story = {
  args: {
    state: 'open',
    ...longSession,
    bar: sessionPageBar,
  },
  render: (args): React.JSX.Element => <FramedSessionPreview {...args} />,
};

export const Empty: Story = {
  args: { state: 'open', ...emptySession },
  render: (args): React.JSX.Element => <FramedSessionPreview {...args} />,
};

// The Connection is down: the draft stays editable but Send waits.
export const Disconnected: Story = {
  args: {
    state: 'open',
    ...idleSession,
    composer: { ...idleSession.composer, sendable: false },
  },
};

// Archived: the Feed reads as before; a banner takes the Composer's place.
export const Archived: Story = {
  args: { state: 'open', ...idleSession, archived: true },
};

// Files dragged over the window: the pane below the header shows where they land, and the Feed recedes behind the label.
export const DraggingFiles: Story = {
  args: { state: 'open', ...runningSession },
  play: async ({ canvasElement }) => {
    const transfer = new DataTransfer();

    transfer.items.add(new File(['# Notes'], 'notes.md'));
    canvasElement.dispatchEvent(
      new DragEvent('dragenter', { bubbles: true, dataTransfer: transfer }),
    );
  },
};

export const Opening: Story = { args: { state: 'opening' } };

// The page behind the failure's toast stays blank, whether or not the Server gave a reason.
export const Failed: Story = { args: { state: 'failed' } };

// The Elicitation's sheet takes the Composer's place until the reader answers.
export const Elicitation: Story = {
  args: {
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
  render: (args): React.JSX.Element => <ElicitationPreview {...args} />,
};

// The header opens the same Subagents list as the phone Composer, inside the Frame's Inspector.
export const Subagents: Story = {
  args: subagentsSession,
  render: (args): React.JSX.Element => <FramedSessionPreview {...args} />,
};

// Plugins' header actions as a desktop places them: the first beside "…", the rest inside it after Rename and Archive.
export const PluginActions: Story = {
  args: pluginActionsSession(desktopPluginActions()),
  render: (args): React.JSX.Element => <FramedSessionPreview {...args} />,
};

// As iOS and Android place them: every Plugin action inside "…".
export const PluginActionsOnPhone: Story = {
  args: pluginActionsSession(phonePluginActions()),
  render: (args): React.JSX.Element => <FramedSessionPreview {...args} />,
};
