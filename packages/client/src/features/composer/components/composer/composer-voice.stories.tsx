import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { SessionColumn } from '#lib/product/session-column';
import { composerProps } from '../../../../../mocks/composer-mock';
import { Composer } from './composer';
import {
  bandConnectingComposer,
  bandListeningComposer,
  bandMutedComposer,
  bandReconnectingComposer,
  bandTalkingComposer,
  bandThinkingComposer,
  bandTypingComposer,
} from './composer-voice-band-fixtures';
import {
  callElsewhereComposer,
  voiceBothMutedComposer,
  voiceCallComposer,
  voiceCallDraftComposer,
  voiceConnectingComposer,
  voiceMicMutedComposer,
  voiceReadyComposer,
  voiceSpeakerMutedComposer,
} from './composer-voice-fixtures';

const meta = {
  title: 'Composer/Composer/Voice',
  component: Composer,
  render: (args): React.JSX.Element => (
    <SessionColumn>
      <Composer {...composerProps(args)} />
    </SessionColumn>
  ),
  parameters: { previewPadding: false },
  args: {
    ...voiceReadyComposer,
    onDraftChange: action('edit draft'),
    onAttachImages: action('attach images'),
    onAttachFiles: action('attach files'),
    onSend: action('send prompt'),
  },
  // ComposerProps is declared in composer-types.ts, which react-docgen cannot follow (docs/agents/storybook.md, "Docgen"); the main Composer story holds the prop descriptions.
  argTypes: { voice: { control: false } },
} satisfies Meta<typeof Composer>;

export default meta;

type Story = StoryObj<typeof meta>;

// Nothing written and no call: the voice button is the primary button.
export const VoiceReady: Story = { args: voiceReadyComposer };

// The call is connecting: End is already there with a ring turning inside it.
export const VoiceConnecting: Story = { args: voiceConnectingComposer };

// A connected call with an empty draft: mic, speaker and End.
export const VoiceCall: Story = { args: voiceCallComposer };

// The microphone is muted: its button reads red.
export const VoiceMicMuted: Story = { args: voiceMicMutedComposer };

// The speaker is muted: its button reads red.
export const VoiceSpeakerMuted: Story = { args: voiceSpeakerMutedComposer };

// Both muted: both buttons read red, and End keeps its look.
export const VoiceBothMuted: Story = { args: voiceBothMutedComposer };

// Text in the draft on a call: the primary button is Send.
export const VoiceCallWithDraft: Story = { args: voiceCallDraftComposer };

// The call runs in another Session: in the voice button's place, the same round button with a live dot.
export const CallInAnotherSession: Story = { args: callElsewhereComposer };

/*
 * Paper's "Composer waveform — B · Edge band": a slim live waveform along the card's top edge, with the state and the
 * timer at its right end, when this Device draws the call there instead of the stage above the Feed.
 */
export const BandConnecting: Story = { args: bandConnectingComposer };

export const BandListening: Story = { args: bandListeningComposer };

export const BandTalking: Story = { args: bandTalkingComposer };

export const BandThinking: Story = { args: bandThinkingComposer };

export const BandMuted: Story = { args: bandMutedComposer };

export const BandReconnecting: Story = { args: bandReconnectingComposer };

// Typing during a call: the band keeps moving over the draft, and the primary button is Send.
export const BandTyping: Story = { args: bandTypingComposer };
