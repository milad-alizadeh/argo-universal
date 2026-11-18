import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { voiceSaidProps, voiceSayingProps } from './transcript-fixtures';
import { VoiceTranscript } from './voice-transcript';

const meta = {
  title: 'Feed/VoiceTranscript',
  component: VoiceTranscript,
  argTypes: { row: { control: false } },
  args: voiceSaidProps,
} satisfies Meta<typeof VoiceTranscript>;

export default meta;

type Story = StoryObj<typeof meta>;

// What the voice said is plain text, like the Agent's.
export const Said: Story = {};

// Words the voice is still saying: the plain text in the muted colour until final.
export const Saying: Story = { args: voiceSayingProps };
