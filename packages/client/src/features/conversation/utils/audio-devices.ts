// One microphone or speaker a call can use.
export interface AudioDevice {
  id: string;
  label: string;
}

// The microphones and speakers this Device has. Names are missing until the microphone was allowed once.
export interface AudioDevices {
  microphones: AudioDevice[];
  speakers: AudioDevice[];
  named: boolean;
}

// What the App reads from the browser's `navigator.mediaDevices`.
export interface MediaDevicesSource {
  enumerateDevices: () => Promise<MediaDeviceInfo[]>;
  addEventListener: (type: 'devicechange', listener: () => void) => void;
  removeEventListener: (type: 'devicechange', listener: () => void) => void;
}

export const noAudioDevices: AudioDevices = {
  microphones: [],
  speakers: [],
  named: true,
};

// The browser's own entries that follow the system's choice; "System default" already stands for them.
const followsSystem = new Set(['', 'default', 'communications']);

const choosable = (
  devices: MediaDeviceInfo[],
  kind: MediaDeviceKind,
): MediaDeviceInfo[] =>
  devices.filter(
    (device) => device.kind === kind && !followsSystem.has(device.deviceId),
  );

const named = (devices: MediaDeviceInfo[], unnamed: string): AudioDevice[] =>
  devices.map((device, index) => ({
    id: device.deviceId,
    label: device.label || `${unnamed} ${index + 1}`,
  }));

export async function listAudioDevices(
  media: MediaDevicesSource,
): Promise<AudioDevices> {
  const all = await media.enumerateDevices();
  const microphones = choosable(all, 'audioinput');
  const speakers = choosable(all, 'audiooutput');

  return {
    microphones: named(microphones, 'Microphone'),
    speakers: named(speakers, 'Speaker'),
    named: all
      .filter(({ kind }) => kind !== 'videoinput')
      .every(({ label }) => label !== ''),
  };
}

// Lists the devices for as long as the watch is on, so an answer that arrives after it stopped is dropped.
const lister =
  (
    media: MediaDevicesSource,
    listener: (devices: AudioDevices) => void,
    watching: { on: boolean },
  ) =>
  (): void =>
    void listAudioDevices(media).then((devices) => {
      if (watching.on) listener(devices);
    });

// Lists the devices now and again whenever one is plugged in or taken out; the returned function stops listening.
export function watchAudioDevices(
  media: MediaDevicesSource,
  listener: (devices: AudioDevices) => void,
): () => void {
  const watching = { on: true };
  const list = lister(media, listener, watching);

  media.addEventListener('devicechange', list);
  list();

  return (): void => {
    watching.on = false;
    media.removeEventListener('devicechange', list);
  };
}
