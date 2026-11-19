// A sound being measured: how loud it is now, from 0 to 1, and how to let go of it.
export interface MeasuredSound {
  level: () => number;
  stop: () => void;
}

// The chosen microphone opened only to show its level in Settings, never sent anywhere.
export interface ListeningMicrophone extends MeasuredSound {
  // 1 is the microphone as it is; the meter shows the level a call would send.
  setGain: (gain: number) => void;
}

// The speaker's short test sound; `ended` settles once it has finished on its own.
export interface PlayingChime extends MeasuredSound {
  ended: Promise<void>;
}

// What Settings › Voice's meters need from the browser, so a test can stand in for it.
export interface DeviceSound {
  // Opens this microphone, or the system's for null; fails when it is refused or gone.
  listen: (
    microphone: string | null,
    gain: number,
  ) => Promise<ListeningMicrophone>;
  // Plays the test sound on this speaker, or the system's for null, at a volume from 0 to 1.
  chime: (speaker: string | null, volume: number) => PlayingChime;
}
