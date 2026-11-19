import { describe, expect, it } from 'vitest';
import { FakeMediaDevices } from '../../../mocks/voice/fake-media-devices';
import { listAudioDevices, watchAudioDevices } from './audio-devices';

const named = [
  { kind: 'audioinput', deviceId: 'default', label: 'Default - Built-in' },
  { kind: 'audioinput', deviceId: 'mic-a', label: 'Built-in Microphone' },
  { kind: 'audioinput', deviceId: 'mic-b', label: 'USB Microphone' },
  { kind: 'audiooutput', deviceId: 'default', label: 'Default - Speakers' },
  { kind: 'audiooutput', deviceId: 'spk-a', label: 'Built-in Speakers' },
  { kind: 'videoinput', deviceId: 'cam-a', label: 'FaceTime Camera' },
] as const;

describe('Audio devices on this Device', () => {
  it('lists the microphones and speakers by name, leaving out cameras and the browser’s own default entry', async () => {
    await expect(
      listAudioDevices(new FakeMediaDevices([...named])),
    ).resolves.toEqual({
      microphones: [
        { id: 'mic-a', label: 'Built-in Microphone' },
        { id: 'mic-b', label: 'USB Microphone' },
      ],
      speakers: [{ id: 'spk-a', label: 'Built-in Speakers' }],
      named: true,
    });
  });

  it('numbers devices the browser has not named yet, and says the names are missing', async () => {
    const unnamed = new FakeMediaDevices([
      { kind: 'audioinput', deviceId: 'mic-a' },
      { kind: 'audioinput', deviceId: 'mic-b' },
      { kind: 'audiooutput', deviceId: 'spk-a' },
    ]);

    await expect(listAudioDevices(unnamed)).resolves.toEqual({
      microphones: [
        { id: 'mic-a', label: 'Microphone 1' },
        { id: 'mic-b', label: 'Microphone 2' },
      ],
      speakers: [{ id: 'spk-a', label: 'Speaker 1' }],
      named: false,
    });
  });

  it('leaves out an entry the browser gives with no id, which cannot be chosen', async () => {
    const hidden = new FakeMediaDevices([{ kind: 'audioinput', deviceId: '' }]);

    await expect(listAudioDevices(hidden)).resolves.toEqual({
      microphones: [],
      speakers: [],
      named: false,
    });
  });

  it('lists again when a device is plugged in, and stops listening when asked', async () => {
    const media = new FakeMediaDevices([...named]);
    const heard: number[] = [];
    const stop = watchAudioDevices(media, (devices) =>
      heard.push(devices.microphones.length),
    );

    await expect.poll(() => heard).toEqual([2]);

    media.change([
      ...named,
      { kind: 'audioinput', deviceId: 'mic-c', label: 'Headset' },
    ]);

    await expect.poll(() => heard).toEqual([2, 3]);

    stop();
    expect(media.listening()).toBe(0);
  });
});
