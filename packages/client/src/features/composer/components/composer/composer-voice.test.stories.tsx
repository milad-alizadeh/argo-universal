import type * as React from 'react';
import { expect, fn, userEvent } from 'storybook/test';
import { useVoiceMutes } from '#features/voice';
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

const voice = (call: ComposerVoice['call']): ComposerVoice => ({
  usable: true,
  call,
  onStart: fn(),
  onEnd: fn(),
});

const noMutes = {
  microphone: false,
  speaker: false,
  onMicrophone: fn(),
  onSpeaker: fn(),
};

// With nothing written and no call, the primary slot is the voice button, Send's circle with the five bars.
export const Idle: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: { voice: voice('none') },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Send' }),
    ).not.toBeInTheDocument();
    await expect(canvas.queryByTestId(endButtonId)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByTestId(voiceButtonId));
    await expect(args.voice?.onStart).toHaveBeenCalledOnce();
  },
};

// The call is starting: End is already there with a ring turning inside it, and pressing it hangs up. Mute waits for the connection.
export const Connecting: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: { voice: { ...voice('connecting'), mutes: noMutes } },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Send' }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByTestId(connectingRingId)).toBeInTheDocument();
    await expect(
      canvas.queryByTestId(microphoneButtonId),
    ).not.toBeInTheDocument();
    await userEvent.click(canvas.getByTestId(endButtonId));
    await expect(args.voice?.onEnd).toHaveBeenCalledOnce();
  },
};

// Text in the draft makes the button Send, even on a call; with the draft empty again, End comes back.
export const SendDuringCall: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: {
    voice: { ...voice('connected'), mutes: noMutes },
    draft: { text: 'A pasted stack trace.', attachments: [] },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByTestId(endButtonId)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Send' }));
    await expect(args.onSend).toHaveBeenCalledWith(args.draft);
    await expect(args.voice?.onEnd).not.toHaveBeenCalled();
  },
};

// With an empty draft on a connected call, End is the primary button, beside both mutes.
export const EndWithEmptyDraft: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: { voice: { ...voice('connected'), mutes: noMutes } },
  play: async ({ canvas, args }) => {
    await expect(
      canvas.queryByRole('button', { name: 'Send' }),
    ).not.toBeInTheDocument();
    await expect(canvas.getByTestId(microphoneButtonId)).toBeInTheDocument();
    await expect(canvas.getByTestId(speakerButtonId)).toBeInTheDocument();
    await userEvent.click(canvas.getByTestId(endButtonId));
    await expect(args.voice?.onEnd).toHaveBeenCalledOnce();
  },
};

// The two mutes drive the App's own connection and never end the call: the mic stops sending, the speaker's volume goes to zero.
function MutedCall({
  connection,
  onEnd,
}: {
  connection: FakeVoiceConnection;
  onEnd: () => void;
}): React.JSX.Element {
  const mutes = useVoiceMutes(connection, 'call-1');

  return (
    <Composer
      {...composerProps({
        draft: { text: '', attachments: [] },
        onDraftChange: fn(),
        onAttachImages: fn(),
        onSend: fn(),
        sessionStarted: true,
        voice: { ...voice('connected'), onEnd, mutes },
      })}
    />
  );
}

const connection = new FakeVoiceConnection();

const hungUp = fn();

export const BothMutes: Story = {
  render: () => <MutedCall connection={connection} onEnd={hungUp} />,
  play: async ({ canvas }) => {
    await userEvent.click(
      canvas.getByRole('button', { name: 'Mute microphone' }),
    );
    await expect(connection.microphoneMuted).toBe(true);
    await expect(connection.speakerMuted).toBe(false);
    await userEvent.click(canvas.getByRole('button', { name: 'Mute speaker' }));
    await expect(connection.speakerMuted).toBe(true);
    await expect(hungUp).not.toHaveBeenCalled();
    await userEvent.click(
      canvas.getByRole('button', { name: 'Unmute microphone' }),
    );
    await userEvent.click(
      canvas.getByRole('button', { name: 'Unmute speaker' }),
    );
    await expect(connection.microphoneMuted).toBe(false);
    await expect(connection.speakerMuted).toBe(false);
  },
};

// The call runs in another Session: the voice button's slot says where, and takes the person there.
export const PointerToTheCall: Story = {
  render: (args) => (
    <Composer {...composerProps({ ...args, sessionStarted: true })} />
  ),
  args: {
    voice: {
      ...voice('elsewhere'),
      elsewhere: { title: 'Fix the build', onOpen: fn() },
    },
  },
  play: async ({ canvas, args }) => {
    await expect(canvas.queryByTestId(voiceButtonId)).not.toBeInTheDocument();
    await expect(canvas.queryByTestId(endButtonId)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByTestId(callPointerId));
    await expect(canvas.getByText('Call in Fix the build')).toBeInTheDocument();
    await expect(args.voice?.elsewhere?.onOpen).toHaveBeenCalledOnce();
  },
};
