import { describe, expect, it } from 'vitest';
import { FakeEnvironment } from '../../../../mocks/conversation/fake-conversation-environment';
import { spectrumBands } from '../types/conversation-connection';
import { MicrophoneUnavailable } from '../types/conversation-environment';
import { createWebRtcConversationConnection } from './webrtc-conversation-connection';

// Float32 bands, rounded so a test reads them as the decimals the fakes set.
const bandsOf = (bands: Float32Array): number[] =>
  [...bands].map((band) => Math.round(band * 10) / 10);

const allAt = (level: number): number[] => Array(spectrumBands).fill(level);

async function started(refuse = false): Promise<{
  environment: FakeEnvironment;
  connection: ReturnType<typeof createWebRtcConversationConnection>;
}> {
  const environment = new FakeEnvironment(refuse);
  const connection = createWebRtcConversationConnection(environment);
  await connection.createOffer();

  return { environment, connection };
}

describe('WebRTC voice connection', () => {
  it('offers the microphone, completes with the answer, and releases everything on close', async () => {
    const { environment, connection } = await started();

    await connection.accept('v=0 answer');
    expect(environment.peer.answered).toBe('v=0 answer');
    connection.close();
    expect(environment.microphone.stopped).toBe(true);
    expect(environment.peer.closed).toBe(true);
  });

  it('cannot start a call when the microphone is refused', async () => {
    await expect(started(true)).rejects.toBeInstanceOf(MicrophoneUnavailable);
  });

  it('mutes the microphone without ending the call', async () => {
    const { environment, connection } = await started();

    connection.setMicrophoneMuted(true);
    expect(environment.microphone.muted).toBe(true);
    expect(environment.peer.closed).toBe(false);
    connection.setMicrophoneMuted(false);
    expect(environment.microphone.muted).toBe(false);
  });

  it('silences the voice by setting its volume to zero, without ending the call', async () => {
    const { environment, connection } = await started();
    environment.peer.voiceArrives();

    connection.setSpeakerMuted(true);
    expect(environment.playback.volume).toBe(0);
    expect(environment.playback.stopped).toBe(false);
    expect(environment.peer.closed).toBe(false);
    connection.setSpeakerMuted(false);
    expect(environment.playback.volume).toBe(1);
  });

  it('keeps the voice silent when it arrives after the speaker was muted', async () => {
    const { environment, connection } = await started();

    connection.setSpeakerMuted(true);
    environment.peer.voiceArrives();
    expect(environment.playback.volume).toBe(0);
  });

  it('reads the microphone and voice levels, and none once closed', async () => {
    const { environment, connection } = await started();
    expect(connection.levels()).toEqual({ input: 0.4, output: 0 });
    environment.peer.voiceArrives();
    expect(connection.levels()).toEqual({ input: 0.4, output: 0.7 });
    connection.close();
    expect(connection.levels()).toEqual({ input: 0, output: 0 });
  });

  it('reads the microphone and voice bands, silent while the microphone is muted and once closed', async () => {
    const { environment, connection } = await started();
    expect(bandsOf(connection.spectrum().input)).toEqual(allAt(0.4));
    expect(bandsOf(connection.spectrum().output)).toEqual(allAt(0));
    environment.peer.voiceArrives();
    expect(bandsOf(connection.spectrum().output)).toEqual(allAt(0.7));
    connection.setMicrophoneMuted(true);
    expect(bandsOf(connection.spectrum().input)).toEqual(allAt(0));
    connection.close();
    expect(bandsOf(connection.spectrum().output)).toEqual(allAt(0));
  });

  it('holds the mutes itself, and tells whoever listens when they change', async () => {
    const { connection } = await started();
    const heard: boolean[] = [];
    connection.subscribe(() => heard.push(connection.mutes().microphone));

    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
    connection.setMicrophoneMuted(true);
    connection.setSpeakerMuted(true);
    expect(connection.mutes()).toEqual({ microphone: true, speaker: true });
    expect(heard).toEqual([true, true]);
  });

  it('keeps the same mutes object until something changes, for a store to read', async () => {
    const { connection } = await started();
    const before = connection.mutes();
    connection.setMicrophoneMuted(false);

    expect(connection.mutes()).toBe(before);
  });

  it('stops telling a listener that unsubscribed', async () => {
    const { connection } = await started();
    const heard: number[] = [];
    const stop = connection.subscribe(() => heard.push(1));
    stop();
    connection.setMicrophoneMuted(true);

    expect(heard).toEqual([]);
  });

  it('starts every call unmuted, because a new call is a new connection', async () => {
    const { environment, connection } = await started();
    connection.setMicrophoneMuted(true);
    connection.setSpeakerMuted(true);

    await connection.createOffer();
    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
    expect(environment.microphone.muted).toBe(false);
  });

  it('is unmuted once the call is over', async () => {
    const { connection } = await started();
    connection.setMicrophoneMuted(true);
    connection.close();

    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
  });

  it('ignores a mute before there is a call, and the call still starts unmuted', async () => {
    const environment = new FakeEnvironment();
    const connection = createWebRtcConversationConnection(environment);
    connection.setMicrophoneMuted(true);
    connection.setSpeakerMuted(true);
    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });

    await connection.createOffer();
    expect(environment.microphone.muted).toBe(false);
    expect(connection.mutes()).toEqual({ microphone: false, speaker: false });
  });
});
