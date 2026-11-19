import { afterEach, describe, expect, it } from 'vitest';
import { sessionVoice } from '../utils/session-voice';
import { callIn, inputOf, statusOf } from '../utils/session-voice.test.mocks';
import { placedCall, withPlacedCall } from './placed-call';

const idle = statusOf(null);

const serverCall = callIn('session-1');

afterEach(() => placedCall.release('session-1'));

describe('a call placed before the Server has it', () => {
  it('shows as connecting in its Session from the press', () => {
    const status = withPlacedCall(idle, 'session-1');

    expect(status.call).toMatchObject({
      sessionId: 'session-1',
      status: 'connecting',
      orb: 'none',
    });
  });

  it("gives way to the Server's call once the Server has one", () => {
    const status = withPlacedCall({ ...idle, call: serverCall }, 'session-1');

    expect(status.call).toBe(serverCall);
  });

  it('draws the stage and End in its Session at once', () => {
    const view = sessionVoice(
      inputOf(withPlacedCall(idle, 'session-1'), 'session-1'),
    );

    expect(view.stage?.label.headline).toBe('Connecting…');
    expect(view.composer?.kind).toBe('connecting');
  });

  it('is let go only by its own Session', () => {
    placedCall.place('session-1');
    placedCall.release('session-2');
    expect(placedCall.holds('session-1')).toBe(true);

    placedCall.release('session-1');
    expect(placedCall.read()).toBeNull();
  });
});
