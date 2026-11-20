import type { ConversationStatus } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { FakeEnvironment } from '../../../../mocks/conversation/fake-conversation-environment';
import { createWebRtcConversationConnection } from '../stores/webrtc-conversation-connection';
import type { ConversationConnection } from '../types/conversation-connection';
import { followConversation } from './follow-conversation';
import { callIn, statusOf } from './session-conversation.test.mocks';

interface App {
  environment: FakeEnvironment;
  connection: ConversationConnection;
  // Where the statuses the App hears from the Server go.
  hear: (status: ConversationStatus) => void;
}

function app(): App {
  const environment = new FakeEnvironment();
  const connection = createWebRtcConversationConnection(environment);

  return { environment, connection, hear: followConversation(connection) };
}

describe("the App's voice connection follows the Server's call", () => {
  it('releases the microphone when the call ends, whatever screen is shown', async () => {
    const { environment, connection, hear } = app();
    hear(statusOf(null));
    await connection.createOffer();
    hear(statusOf(callIn('s1')));

    hear(statusOf(null));

    expect(environment.microphone.stopped).toBe(true);
    expect(environment.peer.closed).toBe(true);
  });

  it('keeps the microphone while the call runs', async () => {
    const { environment, connection, hear } = app();
    await connection.createOffer();

    hear(statusOf(callIn('s1')));
    hear(statusOf(callIn('s1', { state: 'talking' })));

    expect(environment.microphone.stopped).toBe(false);
  });

  it('keeps a call being started open while the Server still has none', async () => {
    const { environment, connection, hear } = app();
    hear(statusOf(null));
    await connection.createOffer();

    hear(statusOf(null, { partials: [] }));

    expect(environment.microphone.stopped).toBe(false);
  });

  it('starts the next call unmuted', async () => {
    const { connection, hear } = app();
    await connection.createOffer();
    hear(statusOf(callIn('s1')));
    connection.setMicrophoneMuted(true);

    hear(statusOf(null));

    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
  });

  it('plays a running call at the volume the Server holds, as soon as it changes', async () => {
    const { environment, connection, hear } = app();
    await connection.createOffer();
    environment.peer.voiceArrives();
    hear(statusOf(callIn('s1')));

    hear(statusOf(callIn('s1'), { volume: 30, microphoneGain: 120 }));

    expect(environment.playback.volume).toBeCloseTo(0.3);
    await expect.poll(() => environment.microphone.gain).toBeCloseTo(1.2);
  });
});
