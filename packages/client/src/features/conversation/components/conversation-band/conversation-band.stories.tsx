import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { syntheticVoiceAudio } from '../../../../../mocks/conversation/synthetic-voice-audio';
import { ConversationBand } from './conversation-band';

// Sound with no microphone and no voice, so the bars move as they would on a call.
const { spectrum } = syntheticVoiceAudio();

const connected = {
  state: 'listening',
  trouble: null,
  microphoneMuted: false,
} as const;

const meta = {
  title: 'Conversation/ConversationBand',
  component: ConversationBand,
  render: (args): React.JSX.Element => (
    <View className="w-160 bg-card">
      <ConversationBand {...args} />
    </View>
  ),
  args: { call: connected, elapsed: '2:43', spectrum },
  argTypes: { spectrum: { control: false } },
} satisfies Meta<typeof ConversationBand>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Listening: Story = {};

export const Talking: Story = {
  args: { call: { ...connected, state: 'talking' }, elapsed: '2:51' },
};

// Thinking: the Agent is working with no sound, so one soft blue dot pulse crosses the dots.
export const Thinking: Story = {
  args: { call: { ...connected, state: 'thinking' }, elapsed: '3:02' },
};

// Connecting: dim dots with one soft pulse crossing them, and no timer until the call connects.
export const Connecting: Story = {
  args: { call: { ...connected, state: 'none' } },
};

// Muted: the bars go quiet and red, and the label says the microphone is off.
export const Muted: Story = {
  args: { call: { ...connected, microphoneMuted: true }, elapsed: '3:10' },
};

// Reconnecting: warning-coloured dots with a pulse crossing, and the timer keeps counting.
export const Reconnecting: Story = {
  args: {
    call: { ...connected, state: 'none', trouble: 'reconnecting' },
    elapsed: '3:14',
  },
};

// Blocked: the browser or system refuses the microphone, so the bars rest in red.
export const Blocked: Story = {
  args: {
    call: { ...connected, trouble: 'microphone-blocked' },
    elapsed: '3:20',
  },
};

// The same band at a narrow Composer: fewer bars, the same gap on both sides.
export const Narrow: Story = {
  render: (args): React.JSX.Element => (
    <View className="w-140 bg-card">
      <ConversationBand {...args} />
    </View>
  ),
};
