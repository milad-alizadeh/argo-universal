import { afterEach, describe, expect, it } from 'vitest';
import { sessionConversation } from '../utils/session-conversation';
import {
  callIn,
  inputOf,
  statusOf,
} from '../utils/session-conversation.test.mocks';
import {
  placedConversation,
  withPlacedConversation,
} from './placed-conversation';

const idle = statusOf(null);

const serverCall = callIn('session-1');

afterEach(() => placedConversation.release('session-1'));

describe('a call placed before the Server has it', () => {
  it('shows as connecting in its Session from the press', () => {
    const status = withPlacedConversation(idle, 'session-1');

    expect(status.conversation).toMatchObject({
      sessionId: 'session-1',
      status: 'connecting',
      state: 'none',
    });
  });

  it("gives way to the Server's call once the Server has one", () => {
    const status = withPlacedConversation(
      { ...idle, conversation: serverCall },
      'session-1',
    );

    expect(status.conversation).toBe(serverCall);
  });

  it('draws the band and End in its Session at once', () => {
    const view = sessionConversation(
      inputOf(withPlacedConversation(idle, 'session-1'), 'session-1'),
    );

    expect(view.band?.call.state).toBe('none');
    expect(view.composer?.kind).toBe('connecting');
  });

  it('is let go only by its own Session', () => {
    placedConversation.place('session-1');
    placedConversation.release('session-2');
    expect(placedConversation.holds('session-1')).toBe(true);

    placedConversation.release('session-1');
    expect(placedConversation.read()).toBeNull();
  });
});
