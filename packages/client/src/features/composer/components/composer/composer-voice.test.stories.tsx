import { Button } from '@repo/kit/primitives/actions/button';
import type * as React from 'react';
import { useState } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';
import { useSessionMutes } from '#features/voice';
import { composerProps } from '../../../../../mocks/composer-mock';
import type { Story } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { meta as composerTestMeta } from '../../../../../mocks/composer/composer-story-context.test.mocks';
import { FakeVoiceConnection } from '../../../../../mocks/voice/fake-voice-connection';
import { Composer } from './composer';
import { callPointerId } from './composer-call-pointer';
import { connectingRingId } from './composer-connecting-ring';
import { microphoneButtonId, speakerButtonId } from './composer-mute-buttons';
import { endButtonId, voiceButtonId } from './composer-primary-action';
import type { ComposerVoice } from './composer-types';

const meta = { ...composerTestMeta, title: 'Tests/Composer/Voice' };

export default meta;

const noMutes = {
  microphone: false,
  speaker: false,
  onMicrophone: fn(),
  onSpeaker: fn(),
};

// The handler each slot carries, so a story can ask whether it was called.
const pressed = (voice: ComposerVoice | undefined): unknown => {
  if (!voice) return undefined;
  if (voice.kind === 'start') return voice.onStart;

  return voice.kind === 'elsewhere' ? voice.onOpen : voice.onEnd;
};

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
    await userEvent.click(canvas.getByTestId(voiceButtonId));
    await expect(pressed(args.voice)).toHaveBeenCalledOnce();
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
    await expect(pressed(args.voice)).toHaveBeenCalledOnce();
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
    await expect(pressed(args.voice)).not.toHaveBeenCalled();
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
    await expect(pressed(args.voice)).toHaveBeenCalledOnce();
  },
};

// The two mutes drive the App's own connection and never end the call: the mic stops sending, the speaker's volume goes to zero.
const call = { connection: new FakeVoiceConnection(), hungUp: fn() };

// Each story gets its own connection and its own End spy, so nothing leaks from one run into the next.
const freshCall = (): void => {
  call.connection = new FakeVoiceConnection();
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
    await expect(canvas.queryByTestId(voiceButtonId)).not.toBeInTheDocument();
    await expect(canvas.queryByTestId(endButtonId)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByTestId(callPointerId));
    await expect(canvas.getByText('Call in Fix the build')).toBeInTheDocument();
    await expect(pressed(args.voice)).toHaveBeenCalledOnce();
  },
};
