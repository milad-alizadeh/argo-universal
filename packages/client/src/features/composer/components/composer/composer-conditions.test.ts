import { describe, expect, it } from 'vitest';
import { composerProps } from '../../../../../mocks/composer-mock';
import { callPointer, sendButtonState } from './composer-conditions';
import type { ComposerProps, ComposerConversation, SendState } from './composer-types';

type Slot = ComposerConversation['kind'] | 'absent';

// What the primary slot shows: a button in one of its states, or the pointer to the call in another Session.
type Shown = SendState | 'pointer';

type Row = [
  draft: 'empty' | 'text',
  slot: Slot,
  turn: 'idle' | 'running',
  expected: Shown,
];

/*
 * Every combination of draft, voice slot and Turn, the Composer queueing while a Turn runs. The slot is the voice
 * module's answer: `start` while no call runs and the Conversation provider can start one, `absent` while it cannot or where
 * the App carries no audio. With nothing written, a running Turn's one button is Stop unless a call runs here.
 */
const rows: Row[] = [
  ['text', 'start', 'idle', 'ready'],
  ['text', 'start', 'running', 'ready'],
  ['text', 'connecting', 'idle', 'ready'],
  ['text', 'connecting', 'running', 'ready'],
  ['text', 'connected', 'idle', 'ready'],
  ['text', 'connected', 'running', 'ready'],
  ['text', 'elsewhere', 'idle', 'ready'],
  ['text', 'elsewhere', 'running', 'ready'],
  ['text', 'absent', 'idle', 'ready'],
  ['text', 'absent', 'running', 'ready'],
  ['empty', 'start', 'idle', 'conversation'],
  ['empty', 'start', 'running', 'stop'],
  ['empty', 'connecting', 'idle', 'connecting'],
  ['empty', 'connecting', 'running', 'connecting'],
  ['empty', 'connected', 'idle', 'end'],
  ['empty', 'connected', 'running', 'end'],
  ['empty', 'elsewhere', 'idle', 'pointer'],
  ['empty', 'elsewhere', 'running', 'stop'],
  ['empty', 'absent', 'idle', 'blocked'],
  ['empty', 'absent', 'running', 'stop'],
];

const noop = (): void => {};

const idle: Row = ['empty', 'start', 'idle', 'conversation'];

const mutes = {
  microphone: false,
  speaker: false,
  onMicrophone: noop,
  onSpeaker: noop,
};

const slots: Record<ComposerConversation['kind'], ComposerConversation> = {
  start: { kind: 'start', onStart: noop },
  connecting: { kind: 'connecting', onEnd: noop },
  connected: { kind: 'connected', onEnd: noop, mutes },
  elsewhere: { kind: 'elsewhere', title: 'Fix the build', onOpen: noop },
};

const conversationOf = (slot: Slot): ComposerProps['conversation'] =>
  slot === 'absent' ? undefined : slots[slot];

function composer(
  [draft, slot, turn]: Row,
  queueWhileRunning = true,
): ComposerProps {
  return composerProps({
    draft: { text: draft === 'text' ? 'Hello' : '', attachments: [] },
    onDraftChange: noop,
    onAttachImages: noop,
    onSend: noop,
    onStop: noop,
    running: turn === 'running',
    sessionStarted: true,
    queueWhileRunning,
    conversation: conversationOf(slot),
  });
}

const shown = (props: ComposerProps): Shown =>
  callPointer(props) ? 'pointer' : sendButtonState(props);

describe('send button', () => {
  it.each(rows)(
    'with a %s draft, conversation slot %s and Turn %s shows %s',
    (...row) => {
      expect(shown(composer(row))).toBe(row[3]);
    },
  );

  it('is Stop for a running Turn when the Composer does not queue, until a call runs', () => {
    const running: Row = ['empty', 'start', 'running', 'stop'];
    const calling: Row = ['empty', 'connected', 'running', 'end'];

    expect(shown(composer(running, false))).toBe('stop');
    expect(shown(composer(calling, false))).toBe('end');
  });

  it('is not the conversation button while a queued Prompt is edited or the Composer cannot send', () => {
    const editing = { id: 'queued', cancel: noop };

    expect(shown({ ...composer(idle), queueEdit: editing })).toBe('blocked');
    expect(shown({ ...composer(idle), sendable: false })).toBe('blocked');
  });

  it('shows the pointer to another Session’s call only where the conversation button would show', () => {
    const pointing: Row = ['empty', 'elsewhere', 'idle', 'pointer'];
    const editing = { id: 'queued', cancel: noop };

    expect(shown({ ...composer(pointing), queueEdit: editing })).toBe(
      'blocked',
    );
    expect(shown({ ...composer(pointing), sendable: false })).toBe('blocked');
    expect(shown({ ...composer(pointing), disabled: true })).toBe('blocked');
    expect(shown({ ...composer(pointing), sending: true })).toBe('sending');
  });

  it('is not the conversation button while sending or disabled', () => {
    expect(shown({ ...composer(idle), sending: true })).toBe('sending');
    expect(shown({ ...composer(idle), disabled: true })).toBe('blocked');
  });
});
