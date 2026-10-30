import type { SeededServer } from './seed.mts';
import type { SoakSample } from './soak-sample.mts';

export interface Probe {
  elapsedMs: number;
  // Session row pointer to the latest recorded Feed text drawn, from a reloaded App, on the driver's clock.
  sessionOpenMs: number | null;
  error?: string;
}

export interface Activity {
  cycles: number;
  turns: number;
  cancellationsAttempted: number;
  cancellationsObserved: number;
}

export interface Soak {
  server: SeededServer;
  minutes: number;
  startedAt: number;
  samples: SoakSample[];
  probes: Probe[];
  activity: Activity;
}

export const startSoak = (server: SeededServer, minutes: number): Soak => ({
  server,
  minutes,
  startedAt: performance.now(),
  samples: [],
  probes: [],
  activity: {
    cycles: 0,
    turns: 0,
    cancellationsAttempted: 0,
    cancellationsObserved: 0,
  },
});

export const port = ({ server }: Soak): number =>
  Number(new URL(server.serverUrl).port);
