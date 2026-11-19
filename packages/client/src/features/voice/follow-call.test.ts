import type { VoiceStatus } from '@repo/contracts';
import { describe, expect, it } from 'vitest';
import { FakeEnvironment } from '../../../mocks/voice/fake-voice-environment';
import { followCall } from './follow-call';
import { callIn, statusOf } from './session-voice.test.mocks';
import type { VoiceConnection } from './voice-connection';
import { createWebRtcVoiceConnection } from './webrtc-voice-connection';

interface App {
  environment: FakeEnvironment;
  connection: VoiceConnection;
  // Where the statuses the App hears from the Server go.
  hear: (status: VoiceStatus) => void;
}

function app(): App {
  const environment = new FakeEnvironment();
  const connection = createWebRtcVoiceConnection(environment);

  return { environment, connection, hear: followCall(connection) };
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
    hear(statusOf(callIn('s1', { orb: 'talking' })));

    expect(environment.microphone.stopped).toBe(false);
  });

  it('keeps a call being started open while the Server still has none', async () => {
    const { environment, connection, hear } = app();
    hear(statusOf(null));
    await connection.createOffer();

    hear(statusOf(null, { partials: [] }));

    expect(environment.microphone.stopped).toBe(false);
  });

  it('starts the call after one unmuted', async () => {
    const { connection, hear } = app();
    await connection.createOffer();
    hear(statusOf(callIn('s1')));
    connection.setMicrophoneMuted(true);

    hear(statusOf(null));

    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
  });
});
