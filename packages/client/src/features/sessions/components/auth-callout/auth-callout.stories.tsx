import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { AuthCallout } from './auth-callout';
import {
  agentMessageAuth,
  failedAuth,
  oneMethodAuth,
  pendingAuth,
  severalMethodsAuth,
} from './auth-callout-fixtures';

const meta = {
  title: 'Sessions/AuthCallout',
  component: AuthCallout,
  /*
   * AuthCalloutProps is declared in types/session-callout.ts, which react-docgen
   * cannot follow (docs/agents/storybook.md, "Docgen"), so the descriptions live here.
   */
  argTypes: {
    agentName: { control: 'text', description: 'The Agent to sign in to.' },
    message: {
      control: 'text',
      description:
        "The Agent's own words from `auth_required`, shown when there is one method.",
    },
    failure: {
      control: 'text',
      description:
        "Why this Device's last attempt failed, until the next one starts.",
    },
    pending: {
      control: 'boolean',
      description: 'A sign-in is running, from this Device or another.',
    },
    terminal: {
      control: 'boolean',
      description:
        "The running method is a terminal: on a phone its sheet takes the callout's place.",
    },
    methods: {
      control: false,
      description: "Agent and terminal methods, in the Agent's order.",
    },
    onAuthenticate: { control: false },
    onCancel: { control: false },
  },
  args: {
    ...oneMethodAuth,
    onAuthenticate: fn(),
    onCancel: fn(),
  },
} satisfies Meta<typeof AuthCallout>;

export default meta;

type Story = StoryObj<typeof meta>;

// One method: one button, and no hint to choose.
export const OneMethod: Story = { args: oneMethodAuth };

// With one method the Agent's own words take the hint's place.
export const AgentMessage: Story = { args: agentMessageAuth };

// Several methods share one split button, whose menu changes its face without signing in.
export const SeveralMethods: Story = { args: severalMethodsAuth };

// A sign-in is running, from this Device or another; every Device can cancel it.
export const Pending: Story = { args: pendingAuth };

// A failed attempt says why, until the next one starts.
export const Failed: Story = { args: failedAuth };

/*
 * No story for a pending terminal method: on a phone the terminal's sheet takes
 * the callout's place, so the callout draws nothing. TerminalSignIn owns it.
 */
