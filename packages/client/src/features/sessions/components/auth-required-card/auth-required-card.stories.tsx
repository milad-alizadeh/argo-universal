import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { AuthRequiredCard } from './auth-required-card';
import {
  agentMessageAuthRequired,
  authRequired,
} from './auth-required-card-fixtures';

const meta = {
  title: 'Sessions/AuthRequiredCard',
  component: AuthRequiredCard,
  // AuthRequiredCardProps is declared in types/session-callout.ts, which react-docgen cannot follow.
  argTypes: {
    description: {
      control: 'text',
      description:
        "The Agent's own words when its Turn ended with `auth_required`.",
    },
    onAuthenticate: { control: false },
  },
  args: { ...authRequired, onAuthenticate: fn() },
} satisfies Meta<typeof AuthRequiredCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// A Turn ended with `auth_required` and said nothing more.
export const AuthenticationRequired: Story = { args: authRequired };

// The Agent's own words take the standard message's place.
export const AgentMessage: Story = { args: agentMessageAuthRequired };
