import { newSessionProjects } from '@repo/mocks/app';
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { StartSessionIn } from './start-session-in';
import {
  connectedServer,
  reconnectingServer,
} from './start-session-in-fixtures';

const meta = {
  title: 'Composer/StartSessionIn',
  component: StartSessionIn,
  args: { ...connectedServer, onProjectChange: fn() },
  /*
   * StartSessionInProps is declared in start-session-types.ts, which react-docgen cannot follow
   * (docs/agents/storybook.md, "Docgen"), so the descriptions live here with the prop domain.
   */
  argTypes: {
    serverName: {
      control: 'text',
      description: 'The Server the Session will run on.',
    },
    serverConnected: {
      control: 'boolean',
      description:
        'The Server is answering; while it is not, the row says it is reconnecting.',
    },
    projects: {
      control: false,
      description: 'The Projects this Server knows.',
    },
    projectId: {
      control: 'select',
      options: newSessionProjects.map((project) => project.id),
      description: 'The Project the Session will start in.',
    },
    onProjectChange: { control: false },
    checkout: {
      control: false,
      description: 'The branch, and whether the Session takes a new worktree.',
    },
    disabled: {
      control: 'boolean',
      description: 'The Composer is sending or is itself disabled.',
    },
  },
} satisfies Meta<typeof StartSessionIn>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Server is answering: the row reads Server, Project and checkout.
export const Connected: Story = { args: connectedServer };

// The Server is not answering: a warning dot and Reconnecting take the Server's place.
export const Reconnecting: Story = { args: reconnectingServer };
