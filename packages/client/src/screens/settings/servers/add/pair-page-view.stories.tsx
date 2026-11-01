import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { fn } from 'storybook/test';
import { PairPageView } from './pair-page-view';

const meta = {
  title: 'Screens/Settings/PairPageView',
  component: PairPageView,
  parameters: { screenPreview: true },
  args: {
    kind: 'waiting',
    serverName: 'Studio PC',
    onAction: fn(),
  },
  argTypes: {
    kind: {
      control: 'select',
      options: ['waiting', 'expired', 'declined', 'unanswered', 'not-found'],
    },
    serverName: { control: 'text' },
    onAction: { control: false },
  },
} satisfies Meta<typeof PairPageView>;

export default meta;

type Story = StoryObj<typeof meta>;

// The Server holds this Device until the owner answers, so the phone has nothing to do but wait or cancel.
export const WaitingForApproval: Story = {};

export const ExpiredCode: Story = { args: { kind: 'expired' } };

export const Declined: Story = { args: { kind: 'declined' } };

export const Unanswered: Story = { args: { kind: 'unanswered' } };

export const ServerNotFound: Story = { args: { kind: 'not-found' } };
