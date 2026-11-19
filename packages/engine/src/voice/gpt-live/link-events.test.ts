import { describe, expect, it } from 'vitest';
import { eventOfFrame } from './link-events';

type Turn = { type: string; role: string };

const frame = (event: Turn): string => JSON.stringify(event);

describe('the voice speaking, as the control link reports it', () => {
  it('starts when the assistant turn is created and stops when it is done', () => {
    expect(
      eventOfFrame(frame({ type: 'turn.created', role: 'assistant' })),
    ).toEqual({ type: 'speaking', speaking: true });
    expect(
      eventOfFrame(frame({ type: 'turn.done', role: 'assistant' })),
    ).toEqual({ type: 'speaking', speaking: false });
  });

  it('is not reported for the person’s turns', () => {
    expect(
      eventOfFrame(frame({ type: 'turn.created', role: 'user' })),
    ).toBeNull();
  });
});
