import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { expect } from 'storybook/test';
import { FakeVoiceConnection } from '../../../../../mocks/voice/fake-voice-connection';
import type { VoiceLevels } from '../../voice-connection';
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

// Audio is replaced by a fake: the orb reads its levels from a connection that carries none.
const audio = new FakeVoiceConnection();

const meta = {
  title: 'Tests/Voice/VoiceStageView',
  component: VoiceStageView,
  args: { levels: (): VoiceLevels => audio.levels() },
} satisfies Meta<typeof VoiceStageView>;

export default meta;

type Story = StoryObj<typeof meta>;

type Canvas = Parameters<NonNullable<Story['play']>>[0]['canvas'];

// The orb names its state to assistive tech, and the label under it says the same in words.
async function expectState(
  canvas: Canvas,
  orb: string,
  headline: string,
): Promise<void> {
  await expect(canvas.getByRole('img', { name: orb })).toBeInTheDocument();
  await expect(canvas.getByText(headline)).toBeInTheDocument();
  await expect(canvas.getByText(/^Voice · /)).toBeInTheDocument();
}

export const ListeningState: Story = {
  args: listeningStage,
  play: ({ canvas }) => expectState(canvas, 'Voice listening', 'Listening'),
};

export const TalkingState: Story = {
  args: talkingStage,
  play: ({ canvas }) => expectState(canvas, 'Voice talking', 'Talking'),
};

export const ThinkingState: Story = {
  args: thinkingStage,
  play: ({ canvas }) => expectState(canvas, 'Voice thinking', 'Thinking'),
};

export const NoSoundYet: Story = {
  args: connectingStage,
  play: ({ canvas }) => expectState(canvas, 'Voice none', 'Connecting…'),
};

// Trouble is words in the orb's label, in place of the state, and no dialog opens.
export const ReconnectingLabel: Story = {
  args: reconnectingStage,
  play: async ({ canvas }) => {
    await expectState(canvas, 'Voice none', 'Reconnecting…');
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

export const MicrophoneBlockedLabel: Story = {
  args: microphoneBlockedStage,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Microphone blocked')).toBeInTheDocument();
    await expect(canvas.queryByText('Listening')).not.toBeInTheDocument();
    await expect(canvas.queryByRole('dialog')).not.toBeInTheDocument();
  },
};

// The provider's low allowance is a line in the same label.
export const AllowanceLowLabel: Story = {
  args: allowanceLowStage,
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText('Voice · 4:12 · 10% left'),
    ).toBeInTheDocument();
  },
};
