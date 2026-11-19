import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { VoiceStageView } from './voice-stage-view';
import {
  allowanceLowStage,
  connectingStage,
  listeningStage,
  microphoneBlockedStage,
  reconnectingStage,
  talkingStage,
  thinkingStage,
} from './voice-stage-view-fixtures';

const meta = {
  title: 'Voice/VoiceStageView',
  component: VoiceStageView,
  argTypes: {
    label: { control: false },
    levels: { control: false },
    reveal: { control: false },
  },
} satisfies Meta<typeof VoiceStageView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Listening: Story = { args: listeningStage };

export const Talking: Story = { args: talkingStage };

export const Thinking: Story = { args: thinkingStage };

export const Connecting: Story = { args: connectingStage };

export const Reconnecting: Story = { args: reconnectingStage };

export const MicrophoneBlocked: Story = { args: microphoneBlockedStage };

export const AllowanceLow: Story = { args: allowanceLowStage };
