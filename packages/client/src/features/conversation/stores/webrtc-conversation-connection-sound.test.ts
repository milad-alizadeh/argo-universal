import { describe, expect, it } from 'vitest';
import { FakeEnvironment } from '../../../../mocks/conversation/fake-conversation-environment';
import { createWebRtcVoiceConnection } from './webrtc-conversation-connection';

const unchanged = { volume: 100, microphoneGain: 100 };

describe('the volume and microphone gain the person chose', () => {
  it('plays the voice at the chosen volume, silent while the speaker is muted', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    connection.setSound({ ...unchanged, volume: 40 });

    await connection.createOffer();
    environment.peer.voiceArrives();
    expect(environment.playback.volume).toBeCloseTo(0.4);

    connection.setSpeakerMuted(true);
    expect(environment.playback.volume).toBe(0);
    connection.setSpeakerMuted(false);
    expect(environment.playback.volume).toBeCloseTo(0.4);
  });

  it('changes the volume of a running call at once', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    await connection.createOffer();
    environment.peer.voiceArrives();

    connection.setSound({ ...unchanged, volume: 25 });

    expect(environment.playback.volume).toBeCloseTo(0.25);
  });

  it('sends the microphone up as it is at full gain, never replacing what the peer sends', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    connection.setSound(unchanged);

    await connection.createOffer();

    expect(environment.microphone.gain).toBe(1);
    expect(environment.peer.replaced).toBe(0);
  });

  it('starts a call with the chosen gain, and changes a running call and a swapped microphone to a new one', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcVoiceConnection(environment);
    connection.setSound({ ...unchanged, microphoneGain: 150 });

    await connection.createOffer();
    expect(environment.microphone.gain).toBeCloseTo(1.5);

    connection.setSound({ ...unchanged, microphoneGain: 50 });
    await expect.poll(() => environment.microphone.gain).toBeCloseTo(0.5);
    expect(environment.peer.sending).toBe(environment.microphone);

    await connection.chooseDevices({ microphone: 'mic-b', speaker: null });
    expect(environment.microphone.device).toBe('mic-b');
    expect(environment.microphone.gain).toBeCloseTo(0.5);
  });
});
