import { describe, expect, it } from 'vitest';
import {
  personTurnDone,
  personTurnOpens,
  voiceTurnDone,
  voiceTurnOpens,
} from '#mocks/gpt-live-frames';
import { LinkReader } from './link-events';

describe('the voice speaking, as the control link reports it', () => {
  it('starts when the assistant turn is created and stops when it is done', () => {
    const reader = new LinkReader();

    expect(reader.read(voiceTurnOpens)).toContainEqual({
      type: 'speaking',
      speaking: true,
    });
    expect(reader.read(voiceTurnDone)).toContainEqual({
      type: 'speaking',
      speaking: false,
    });
  });

  it('is not reported for the person’s turns', () => {
    const reader = new LinkReader();

    expect(reader.read(personTurnOpens)).not.toContainEqual(
      expect.objectContaining({ type: 'speaking' }),
    );
    expect(reader.read(personTurnDone)).not.toContainEqual(
      expect.objectContaining({ type: 'speaking' }),
    );
  });
});

it('keeps the newer turn open when an older turn finishes late', () => {
  const reader = new LinkReader();
  const newer = voiceTurnOpens.replace('turn_ElnYpcwGda0vchfrIUvO2', 'newer');
  reader.read(voiceTurnOpens);
  reader.read(newer);
  reader.read(voiceTurnDone);
  reader.read(
    '{"type":"turn.delta","turn_id":"newer","delta":", still here."}',
  );

  expect(reader.closing()).toEqual([
    {
      type: 'voice.transcript',
      id: 'newer',
      text: 'Okay, still here.',
      final: true,
    },
  ]);
});
