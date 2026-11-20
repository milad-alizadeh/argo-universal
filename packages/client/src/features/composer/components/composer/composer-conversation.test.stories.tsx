import { settleLayout } from '@repo/kit/mocks/story-layout';
import { Button } from '@repo/kit/primitives/actions/button';
import type * as React from 'react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { useSessionMutes } from '#features/conversation';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { FakeConversationConnection } from '../../../../../mocks/conversation/fake-conversation-connection';
import { Composer } from './composer';
import { callPointerId } from './composer-conversation-pointer';
import { connectingRingId } from './composer-connecting-ring';
import { microphoneButtonId, speakerButtonId } from './composer-mute-buttons';
import { endButtonId, conversationButtonId } from './composer-primary-action';
import type { ComposerConversation } from './composer-types';
import {
  bandConnectingComposer,
  bandMutedComposer,
  bandReconnectingComposer,
  bandTalkingComposer,
} from './composer-conversation-band-fixtures';

// The edge band's test id, as `ConversationEdgeBand` sets it.
const bandId = 'voice-edge-band';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Conversation' };

export default meta;

const noMutes = {
  microphone: false,
  speaker: false,
  onMicrophone: fn(),
  onSpeaker: fn(),
};

// What a story's slot asks for when pressed, read from its own args so no spy is shared between stories.
const startOf = (voice: ComposerConversation | undefined): (() => void) | undefined =>
  voice?.kind === 'start' ? voice.onStart : undefined;

const endOf = (voice: ComposerConversation | undefined): (() => void) | undefined =>
  voice && 'onEnd' in voice ? voice.onEnd : undefined;

const openOf = (voice: ComposerConversation | undefined): (() => void) | undefined =>
  voice?.kind === 'elsewhere' ? voice.onOpen : undefined;

// With nothing written and no call, the primary slot is the voice button, Send's circle with the five bars.
export const Idle: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: { voice: { kind: 'start', onStart: fn() } },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Send' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByTestId(endButtonId)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByTestId(conversationButtonId));
    await expect(startOf(args.voice)).toHaveBeenCalledOnce();
  },
};

// The call is starting: End is already there with a ring turning inside it, and pressing it hangs up. Mute waits for the connection.
export const Connecting: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: { voice: { kind: 'connecting', onEnd: fn() } },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Send' }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByTestId(connectingRingId)).toBeInTheDocument();
    await expect(
      canvas.queryByTestId(microphoneButtonId),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByTestId(endButtonId));
    await expect(endOf(args.voice)).toHaveBeenCalledOnce();
  },
};

// Text in the draft makes the button Send, even on a call.
export const SendDuringCall: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: {
    voice: { kind: 'connected', onEnd: fn(), mutes: noMutes },
    draft: { text: 'A pasted stack trace.', attachments: [] },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByTestId(endButtonId)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(args.onSend).toHaveBeenCalledWith(args.draft);
    await expect(endOf(args.voice)).not.toHaveBeenCalled();
  },
};

// With an empty draft on a connected call, End is the primary button, beside both mutes.
export const EndWithEmptyDraft: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: { voice: { kind: 'connected', onEnd: fn(), mutes: noMutes } },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Send' }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByTestId(microphoneButtonId)).toBeInTheDocument();
    await expect(canvas.getByTestId(speakerButtonId)).toBeInTheDocument();
    await userEvent.click(canvas.getByTestId(endButtonId));
    await expect(endOf(args.voice)).toHaveBeenCalledOnce();
  },
};

// The two mutes drive the App's own connection and never end the call: the mic stops sending, the speaker's volume goes to zero.
const call = { connection: new FakeConversationConnection(), hungUp: fn() };

// Each story gets its own connection and its own End spy, so nothing leaks from one run into the next.
const freshCall = (): void => {
  call.connection = new FakeConversationConnection();
  call.hungUp = fn();
};

// A page of the call's Session, mounting the same hook the real page does: the mutes it draws are the connection's, and it writes none on mount.
function CallPage(): React.JSX.Element {
  const held = useSessionMutes(call.connection);

  return (
    <Composer
      {...composerProps({
        draft: { text: '', attachments: [] },
        onDraftChange: fn(),
        onAttachImages: fn(),
        onSend: fn(),
        sessionStarted: true,
        voice: {
          kind: 'connected',
          onEnd: call.hungUp,
          mutes: {
            ...held.mutes,
            onMicrophone: () => held.setMicrophoneMuted(!held.mutes.microphone),
            onSpeaker: () => held.setSpeakerMuted(!held.mutes.speaker),
          },
        },
      })}
    />
  );
}

export const BothMutes: Story = {
  beforeEach: freshCall,
  render: () => <CallPage />,
  play: async ({ canvas }) => {
    const { connection } = call;
    await userEvent.click(
      canvas.getByRole('button', { name: 'Mute microphone' }),
    );
    await waitFor(() => expect(connection.mutes().microphone).toBe(true));
    await expect(connection.mutes().speaker).toBe(false);
    await userEvent.click(canvas.getByRole('button', { name: 'Mute speaker' }));
    await waitFor(() => expect(connection.mutes().speaker).toBe(true));
    await expect(call.hungUp).not.toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Unmute microphone' }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Unmute speaker' }),
    );
    await waitFor(() =>
      expect(connection.mutes()).toEqual({ microphone: false, speaker: false }),
    );
  },
};

// Opening another Session mounts another page on the same connection: it asks the connection for nothing, so a mute stays.
function TwoPages(): React.JSX.Element {
  const [page, setPage] = useState(1);

  return (
    <>
      <Button label="Open another Session" onPress={() => setPage(2)} />
      <CallPage key={page} />
    </>
  );
}

export const MutesSurviveAnotherSession: Story = {
  beforeEach: freshCall,
  render: () => <TwoPages />,
  play: async ({ canvas }) => {
    const { connection } = call;
    await userEvent.click(
      canvas.getByRole('button', { name: 'Mute microphone' }),
    );
    await waitFor(() => expect(connection.mutes().microphone).toBe(true));
    await userEvent.click(
      canvas.getByRole('button', { name: 'Open another Session' }),
    );
    await expect(
      await canvas.findByRole('button', { name: 'Unmute microphone' }),
    ).toBeInTheDocument();
    await expect(connection.mutes().microphone).toBe(true);
    await expect(connection.asked).toEqual(['microphone:true']);
  },
};

// The call runs in another Session: the voice button's slot says where, and takes the person there.
export const PointerToTheCall: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: {
    voice: { kind: 'elsewhere', title: 'Fix the build', onOpen: fn() },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByTestId(conversationButtonId)).not.toBeInTheDocument();
    await expect(canvas.queryByTestId(endButtonId)).not.toBeInTheDocument();
    // A round icon button named for the call, not a pill with the words on it.
    await expect(canvas.queryByText('Call in Fix the build')).toBeNull();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Call in Fix the build' }),
    );
    await expect(openOf(args.voice)).toHaveBeenCalledOnce();
  },
};

// Typing in another Session while a call runs elsewhere: Send works as in any Session, and the pointer steps aside.
export const SendBesideACallElsewhere: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: {
    voice: { kind: 'elsewhere', title: 'Fix the build', onOpen: fn() },
    draft: { text: 'Check the logs.', attachments: [] },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByTestId(callPointerId)).toBeNull();
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(args.onSend).toHaveBeenCalledWith(args.draft);
  },
};

// The theme's danger red, resolved the way the browser resolves a glyph's colour.
function dangerColor(): string {
  const probe = document.createElement('span');
  probe.style.color = 'var(--color-danger)';
  document.body.append(probe);
  const { color } = getComputedStyle(probe);
  probe.remove();

  return color;
}

// Whether a button draws its glyph in the danger red.
function readsRed(button: HTMLElement): boolean {
  const danger = dangerColor();

  return [button, ...button.querySelectorAll('*')].some(
    (element) => getComputedStyle(element).color === danger,
  );
}

const muted = (microphone: boolean, speaker: boolean): Story => ({
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: {
    voice: {
      kind: 'connected',
      onEnd: fn(),
      mutes: { ...noMutes, microphone, speaker },
    },
  },
  play: async ({ canvas }) => {
    const mic = await canvas.findByTestId(microphoneButtonId);
    await expect(readsRed(mic)).toBe(microphone);
    await expect(readsRed(canvas.getByTestId(speakerButtonId))).toBe(speaker);
    await expect(readsRed(canvas.getByTestId(endButtonId))).toBe(false);
  },
});

// A mute that is on reads red; one that is off keeps its look, and End keeps its own.
export const NothingMuted = muted(false, false);

export const MicrophoneMutedReadsRed = muted(true, false);

export const SpeakerMutedReadsRed = muted(false, true);

export const BothMutedReadRed = muted(true, true);

// The edge band sits inside the one card, above the text box, with the state and the timer at its right end.
export const EdgeBandOnACall: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: bandTalkingComposer,
  play: async ({ canvas }) => {
    const band = canvas.getByTestId(bandId);
    const field = canvas.getByRole('textbox', { name: 'Message' });

    await expect(band).toBeVisible();
    await expect(canvas.getByText('Talking')).toBeVisible();
    await expect(canvas.getByText('2:51')).toBeVisible();
    await expect(band.getBoundingClientRect().bottom).toBeLessThanOrEqual(
      field.getBoundingClientRect().top + 1,
    );
  },
};

// The text box under the band is today's: the person can type throughout the call.
export const TypingUnderTheBand: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: bandTalkingComposer,
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('textbox', { name: 'Message' }));
    await userEvent.keyboard('Also run the stories');
    await waitFor(() =>
      expect(args.onDraftChange).toHaveBeenLastCalledWith({
        text: 'Also run the stories',
        attachments: [],
      }),
    );
    await expect(canvas.getByTestId(bandId)).toBeVisible();
  },
};

// Connecting shows no timer; reconnecting keeps counting; a muted microphone says so in danger.
export const EdgeBandLabels: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: bandConnectingComposer,
  play: async ({ canvas }) => {
    await expect(
      within(canvas.getByTestId(bandId)).getByText('Connecting…'),
    ).toBeVisible();
    await expect(canvas.queryByText(/^\d+:\d\d$/)).not.toBeInTheDocument();
  },
};

export const EdgeBandReconnecting: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: bandReconnectingComposer,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Reconnecting…')).toBeVisible();
    await expect(canvas.getByText('3:14')).toBeVisible();
  },
};

export const EdgeBandMuted: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: bandMutedComposer,
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Mic off')).toBeVisible();
    await expect(canvas.queryByText('Listening')).not.toBeInTheDocument();
  },
};

// A phone keeps only the microphone's mute beside End; a wide window keeps both mutes.
const mutesAt = (width: number, speaker: boolean): Story => ({
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: { voice: { kind: 'connected', onEnd: fn(), mutes: noMutes } },
  play: async ({ canvas }) => {
    await settleLayout(width);
    await expect(
      await canvas.findByTestId(microphoneButtonId),
    ).toBeInTheDocument();
    await expect(canvas.getByTestId(endButtonId)).toBeInTheDocument();
    await waitFor(() =>
      expect(canvas.queryByTestId(speakerButtonId) !== null).toBe(speaker),
    );
  },
});

export const PhoneKeepsOnlyTheMicrophoneMute = mutesAt(390, false);

export const WideKeepsBothMutes = mutesAt(1280, true);
