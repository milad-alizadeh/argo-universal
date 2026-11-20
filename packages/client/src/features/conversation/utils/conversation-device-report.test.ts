import { describe, expect, it } from 'vitest';
import { deviceReportOf, onDeviceRequest } from './conversation-device-report';

const devices = {
  microphones: [{ id: 'mic-a', label: 'Desk microphone' }],
  speakers: [{ id: 'spk-a', label: 'Speakers' }],
  named: true,
};

describe('what an App tells the Server of its devices, and does when asked', () => {
  it('reports the devices it has and the ones it chose', () => {
    expect(
      deviceReportOf(devices, { microphone: 'mic-a', speaker: null }),
    ).toEqual({
      microphones: devices.microphones,
      speakers: devices.speakers,
      microphone: 'mic-a',
      speaker: null,
    });
  });

  it('chooses what the Server asks, and nothing when it only says it listens', () => {
    const chosen: unknown[] = [];
    const answer = onDeviceRequest((change) => chosen.push(change));

    answer({ type: 'ready' });
    answer({ type: 'choose', change: { speaker: 'spk-a' } });

    expect(chosen).toEqual([{ speaker: 'spk-a' }]);
  });
});
