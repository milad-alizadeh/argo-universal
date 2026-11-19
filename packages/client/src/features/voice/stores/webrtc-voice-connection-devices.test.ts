import { describe, expect, it } from 'vitest';
import { FakeEnvironment } from '../../../../mocks/voice/fake-voice-environment';
import { createWebRtcVoiceConnection } from './webrtc-voice-connection';

async function started(): Promise<{
  environment: FakeEnvironment;
  connection: ReturnType<typeof createWebRtcVoiceConnection>;
}> {
  const environment = new FakeEnvironment();
  const connection = createWebRtcVoiceConnection(environment);
  await connection.createOffer();

  return { environment, connection };
}

describe('the microphone and speaker this Device chose', () => {
  const chosen = { microphone: 'mic-b', speaker: 'spk-a' };

  it('starts a call on the chosen microphone and plays the voice on the chosen speaker', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    await connection.chooseDevices(chosen);

    await connection.createOffer();
    environment.peer.voiceArrives();
    expect(environment.microphone.device).toBe('mic-b');
    expect(environment.peer.sending).toBe(environment.microphone);
    expect(environment.playback.speaker).toBe('spk-a');
  });

  it('starts on the system microphone when the chosen one is gone, rather than failing the call', async () => {
    const environment = new FakeEnvironment();
    environment.missing.add('mic-b');
    const connection = createWebRtcVoiceConnection(environment);
    await connection.chooseDevices(chosen);

    await expect(connection.createOffer()).resolves.toBe('v=0 offer');
    expect(environment.microphone.device).toBeNull();
  });

  it('swaps the microphone the call sends during a running call, keeping its mute', async () => {
    const { environment, connection } = await started();
    const before = environment.microphone;
    connection.setMicrophoneMuted(true);

    await connection.chooseDevices({ microphone: 'mic-b', speaker: null });

    expect(environment.peer.sending).not.toBe(before);
    expect(environment.peer.sending).toBe(environment.microphone);
    expect(environment.microphone.device).toBe('mic-b');
    expect(environment.microphone.muted).toBe(true);
    expect(before.stopped).toBe(true);
    expect(environment.peer.closed).toBe(false);
  });

  it('keeps the running microphone when the newly chosen one cannot open', async () => {
    const { environment, connection } = await started();
    const before = environment.microphone;
    environment.missing.add('mic-b');

    await connection.chooseDevices({ microphone: 'mic-b', speaker: null });

    expect(environment.peer.sending).toBe(before);
    expect(before.stopped).toBe(false);
  });

  it('moves the voice to the newly chosen speaker during a running call', async () => {
    const { environment, connection } = await started();
    environment.peer.voiceArrives();
    const sending = environment.peer.sending;

    await connection.chooseDevices({ microphone: null, speaker: 'spk-a' });
    expect(environment.playback.speaker).toBe('spk-a');
    expect(environment.peer.sending).toBe(sending);
  });
});
