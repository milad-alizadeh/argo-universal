import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import type * as React from 'react';
import { action } from 'storybook/actions';
import { SessionColumn } from '#lib/product/session-column';
import { composerProps } from '../../../../../mocks/composer-mock';
import { Composer } from './composer';
import {
  bandConnectingComposer,
  bandListeningComposer,
  bandTalkingComposer,
} from './composer-conversation-band-fixtures';
import {
  callElsewhereComposer,
  voiceBothMutedComposer,
  voiceCallComposer,
  voiceCallDraftComposer,
  voiceConnectingComposer,
  voiceMicMutedComposer,
  voiceReadyComposer,
  voiceSpeakerMutedComposer,
} from './composer-conversation-fixtures';

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
 * The Conversation band along the card's top edge, with the state and the timer at its right end. The band's own
 * states are in `Voice/VoiceEdgeBand`.
 */
export const BandConnecting: Story = { args: bandConnectingComposer };

export const BandListening: Story = { args: bandListeningComposer };

export const BandTalking: Story = { args: bandTalkingComposer };
