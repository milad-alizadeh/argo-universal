import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { SessionNewView } from './session-new-view';
import { readyNewSession, startingNewSession } from './session-new-view.mocks';

const meta = {
  title: 'Screens/Sessions/New Session',
  component: SessionNewView,
  parameters: { screenPreview: true },
  argTypes: {
    state: { control: 'select', options: ['ready', 'loading', 'load-failed'] },
  },
} satisfies Meta<typeof SessionNewView>;

export default meta;

type Story = StoryObj<typeof meta>;

// Waiting for a first prompt: the empty Composer, the Agent and the Project the Session will start in.
export const Ready: Story = { args: { state: 'ready', ...readyNewSession } };

// The first prompt is sent: a Feed takes the empty page's place while the Session opens.
export const Starting: Story = {
  args: { state: 'ready', ...readyNewSession, ...startingNewSession },
};

export const Loading: Story = { args: { state: 'loading' } };

export const LoadFailure: Story = { args: { state: 'load-failed' } };

// No Agent is installed, so there is nothing to start a Session with and Send stays off.
export const ZeroAgents: Story = {
  args: {
    state: 'ready',
    ...readyNewSession,
    canOpen: false,
    agents: [],
    configuration: {
      ...readyNewSession.configuration,
      agent: undefined,
      configOptions: [],
    },
  },
};
