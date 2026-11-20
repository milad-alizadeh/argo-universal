import type { ConversationStatus } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import type { ComposerConversation } from '#features/composer';
import { newSessionConversation } from './session-conversation';
import {
  callIn,
  inputOf,
  press,
  statusOf,
  type Asked,
} from './session-conversation.test.mocks';

// New Session has no Session yet, so a running call is always in another one.
const newSession = (
  status: ConversationStatus,
  asked: Asked = [],
): ComposerConversation | undefined =>
  newSessionConversation(inputOf(status, 'no-session-yet', asked));

describe("New Session's voice slot", () => {
  it('offers the voice button while no call runs and the provider is usable, and starts as asked', () => {
    const asked: Asked = [];
    const slot = newSession(statusOf(null), asked);

    expect(slot?.kind).toBe('start');
    press(slot);

    expect(asked).toEqual(['start']);
  });

  it('offers nothing while Conversations are off or the provider is not usable', () => {
    const unusable = statusOf(null, {
      availability: { usable: false, reason: 'No' },
    });

    expect(newSession(statusOf(null, { enabled: false }))).toBeUndefined();
    expect(newSession(unusable)).toBeUndefined();
  });

  it('points at a call running in a Session', () => {
    const asked: Asked = [];
    const slot = newSession(statusOf(callIn('s-call')), asked);

    expect(slot).toMatchObject({ kind: 'elsewhere', title: 'Fix the build' });
    press(slot);

    expect(asked).toEqual(['open:s-call']);
  });
});
