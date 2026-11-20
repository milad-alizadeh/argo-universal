import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { View } from 'react-native';
import { syntheticVoiceAudio } from '../../../../../mocks/conversation/synthetic-voice-audio';
import { VoiceEdgeBand } from './conversation-band';

// Sound with no microphone and no voice, so the bars move as they would on a call.
const { spectrum } = syntheticVoiceAudio();

const connected = {
  orb: 'listening',
  trouble: null,
  microphoneMuted: false,
} as const;

const meta = {
  title: 'Voice/VoiceEdgeBand',
  component: VoiceEdgeBand,
  render: (args): React.JSX.Element => (
    <View className="w-160 bg-card">
      <VoiceEdgeBand {...args} />
    </View>
  ),
  args: { call: connected, elapsed: '2:43', spectrum },
  argTypes: { spectrum: { control: false } },
} satisfies Meta<typeof VoiceEdgeBand>;

export default meta;

type Story = StoryObj<typeof meta>;

// Listening: the person's voice lights the bars from the left, in orange, and the colour front rests at the left.
export const Listening: Story = {};

// Talking: the Agent's voice lights the bars from the right, in blue. Coming from listening, the colour sweeps across in about 0.4 s.
export const Talking: Story = {
  args: { call: { ...connected, orb: 'talking' }, elapsed: '2:51' },
};

// Thinking: the Agent is working with no sound, so one soft blue dot pulse crosses the dots.
export const Thinking: Story = {
  args: { call: { ...connected, orb: 'thinking' }, elapsed: '3:02' },
};

// Connecting: dim dots with one soft pulse crossing them, and no timer until the call connects.
export const Connecting: Story = {
  args: { call: { ...connected, orb: 'none' } },
};

// Muted: the bars go quiet and red, and the label says the microphone is off.
export const Muted: Story = {
  args: { call: { ...connected, microphoneMuted: true }, elapsed: '3:10' },
};

// Reconnecting: warning-coloured dots with a pulse crossing, and the timer keeps counting.
export const Reconnecting: Story = {
  args: {
    call: { ...connected, orb: 'none', trouble: 'reconnecting' },
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
      <VoiceEdgeBand {...args} />
    </View>
  ),
};
