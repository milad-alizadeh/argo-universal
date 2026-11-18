import { describe, expect, it } from 'vitest';
import { composerProps } from '../../../../../mocks/composer-mock';
import { sendButtonState } from './composer-conditions';
import type {
  ComposerProps,
  ComposerVoiceCall,
  SendState,
} from './composer-types';

type Provider = 'usable' | 'unusable' | 'absent';

type Row = [
  draft: 'empty' | 'text',
  call: ComposerVoiceCall,
  provider: Provider,
  turn: 'idle' | 'running',
  expected: SendState,
];

// Every combination of draft, call, provider and Turn, the Composer queueing while a Turn runs. Without a provider the Composer knows of no call.
const rows: Row[] = [
  ['text', 'none', 'usable', 'idle', 'ready'],
  ['text', 'none', 'usable', 'running', 'ready'],
  ['text', 'none', 'unusable', 'idle', 'ready'],
  ['text', 'none', 'unusable', 'running', 'ready'],
  ['text', 'none', 'absent', 'idle', 'ready'],
  ['text', 'none', 'absent', 'running', 'ready'],
  ['text', 'connecting', 'usable', 'idle', 'ready'],
  ['text', 'connecting', 'usable', 'running', 'ready'],
  ['text', 'connecting', 'unusable', 'idle', 'ready'],
  ['text', 'connecting', 'unusable', 'running', 'ready'],
  ['text', 'connecting', 'absent', 'idle', 'ready'],
  ['text', 'connecting', 'absent', 'running', 'ready'],
  ['text', 'connected', 'usable', 'idle', 'ready'],
  ['text', 'connected', 'usable', 'running', 'ready'],
  ['text', 'connected', 'unusable', 'idle', 'ready'],
  ['text', 'connected', 'unusable', 'running', 'ready'],
  ['text', 'connected', 'absent', 'idle', 'ready'],
  ['text', 'connected', 'absent', 'running', 'ready'],
  ['text', 'elsewhere', 'usable', 'idle', 'ready'],
  ['text', 'elsewhere', 'usable', 'running', 'ready'],
  ['text', 'elsewhere', 'unusable', 'idle', 'ready'],
  ['text', 'elsewhere', 'unusable', 'running', 'ready'],
  ['text', 'elsewhere', 'absent', 'idle', 'ready'],
  ['text', 'elsewhere', 'absent', 'running', 'ready'],
  ['empty', 'none', 'usable', 'idle', 'voice'],
  ['empty', 'none', 'usable', 'running', 'voice'],
  ['empty', 'none', 'unusable', 'idle', 'blocked'],
  ['empty', 'none', 'unusable', 'running', 'blocked'],
  ['empty', 'none', 'absent', 'idle', 'blocked'],
  ['empty', 'none', 'absent', 'running', 'blocked'],
  ['empty', 'connecting', 'usable', 'idle', 'connecting'],
  ['empty', 'connecting', 'usable', 'running', 'connecting'],
  ['empty', 'connecting', 'unusable', 'idle', 'connecting'],
  ['empty', 'connecting', 'unusable', 'running', 'connecting'],
  ['empty', 'connecting', 'absent', 'idle', 'blocked'],
  ['empty', 'connecting', 'absent', 'running', 'blocked'],
  ['empty', 'connected', 'usable', 'idle', 'end'],
  ['empty', 'connected', 'usable', 'running', 'end'],
  ['empty', 'connected', 'unusable', 'idle', 'end'],
  ['empty', 'connected', 'unusable', 'running', 'end'],
  ['empty', 'connected', 'absent', 'idle', 'blocked'],
  ['empty', 'connected', 'absent', 'running', 'blocked'],
  ['empty', 'elsewhere', 'usable', 'idle', 'elsewhere'],
  ['empty', 'elsewhere', 'usable', 'running', 'elsewhere'],
  ['empty', 'elsewhere', 'unusable', 'idle', 'elsewhere'],
  ['empty', 'elsewhere', 'unusable', 'running', 'elsewhere'],
  ['empty', 'elsewhere', 'absent', 'idle', 'blocked'],
  ['empty', 'elsewhere', 'absent', 'running', 'blocked'],
];

const noop = (): void => {};

const idle: Row = ['empty', 'none', 'usable', 'idle', 'voice'];

const voiceOf = (
  provider: Provider,
  call: ComposerVoiceCall,
): ComposerProps['voice'] =>
  provider === 'absent'
    ? undefined
    : { usable: provider === 'usable', call, onStart: noop, onEnd: noop };

function composer(
  [draft, call, provider, turn]: Row,
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
    voice: voiceOf(provider, call),
  });
}

describe('send button', () => {
  it.each(rows)(
    'with a %s draft, call %s, provider %s and Turn %s is %s',
    (...row) => {
      expect(sendButtonState(composer(row))).toBe(row[4]);
    },
  );

  it('is Stop for a running Turn when the Composer does not queue, until a call runs', () => {
    const running: Row = ['empty', 'none', 'usable', 'running', 'stop'];
    const calling: Row = ['empty', 'connected', 'usable', 'running', 'end'];

    expect(sendButtonState(composer(running, false))).toBe('stop');
    expect(sendButtonState(composer(calling, false))).toBe('end');
  });

  it('is not the voice button while a queued Prompt is edited or the Composer cannot send', () => {
    const editing = { id: 'queued', cancel: noop };

    expect(sendButtonState({ ...composer(idle), queueEdit: editing })).toBe(
      'blocked',
    );
    expect(sendButtonState({ ...composer(idle), sendable: false })).toBe(
      'blocked',
    );
  });

  it('is not the voice button while sending or disabled', () => {
    expect(sendButtonState({ ...composer(idle), sending: true })).toBe(
      'sending',
    );
    expect(sendButtonState({ ...composer(idle), disabled: true })).toBe(
      'blocked',
    );
  });
});
