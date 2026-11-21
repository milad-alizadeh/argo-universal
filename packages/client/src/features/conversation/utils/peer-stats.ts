/*
 * SPIKE (latency on a phone, docs/research/voice-mode.md): what one `getStats` read of a call's peer connection says,
 * reduced to what the latency panel needs. The browser's report and react-native-webrtc's are both Maps of the same
 * W3C stats, so one reader serves the desktop baseline and the phone.
 */
export interface PeerStats {
  // How loud the microphone is as it is sent, 0 to 1 (`media-source.audioLevel`).
  input: number;
  // How loud the voice is as it is played, 0 to 1 (`inbound-rtp.audioLevel`).
  output: number;
  // The round trip to the provider on the chosen candidate pair, when it has been measured.
  rttMs: number | undefined;
  // The voice's jitter as it arrives, when it has been measured.
  jitterMs: number | undefined;
  // Seconds the voice's samples have waited in the jitter buffer, summed over the call, and how many samples left it.
  bufferSeconds: number;
  bufferEmitted: number;
  packetsLost: number;
  packetsReceived: number;
}

interface Stat {
  type?: string;
  kind?: string;
  mediaType?: string;
  state?: string;
  nominated?: boolean;
  audioLevel?: number;
  jitter?: number;
  jitterBufferDelay?: number;
  jitterBufferEmittedCount?: number;
  packetsLost?: number;
  packetsReceived?: number;
  currentRoundTripTime?: number;
}

interface StatsReport {
  forEach: (each: (stat: Stat) => void) => void;
}

const numberOf = (value: number | undefined): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;

const millisecondsPerSecond = 1000;

const msOf = (seconds: number | undefined): number | undefined => {
  const value = numberOf(seconds);

  return value === undefined ? undefined : value * millisecondsPerSecond;
};

const isAudio = (stat: Stat): boolean =>
  stat.kind === 'audio' || stat.mediaType === 'audio';

const isChosenPair = (stat: Stat): boolean =>
  stat.type === 'candidate-pair' &&
  stat.state === 'succeeded' &&
  stat.nominated === true;

function readInbound(stat: Stat, into: PeerStats): void {
  into.output = numberOf(stat.audioLevel) ?? 0;
  into.jitterMs = msOf(stat.jitter);
  into.bufferSeconds = numberOf(stat.jitterBufferDelay) ?? 0;
  into.bufferEmitted = numberOf(stat.jitterBufferEmittedCount) ?? 0;
  into.packetsLost = numberOf(stat.packetsLost) ?? 0;
  into.packetsReceived = numberOf(stat.packetsReceived) ?? 0;
}

function readStat(stat: Stat, into: PeerStats): void {
  if (isChosenPair(stat)) into.rttMs = msOf(stat.currentRoundTripTime);
  else if (!isAudio(stat)) return;
  else if (stat.type === 'media-source')
    into.input = numberOf(stat.audioLevel) ?? 0;
  else if (stat.type === 'inbound-rtp') readInbound(stat, into);
}

export function peerStatsOf(report: StatsReport): PeerStats {
  const stats: PeerStats = {
    input: 0,
    output: 0,
    rttMs: undefined,
    jitterMs: undefined,
    bufferSeconds: 0,
    bufferEmitted: 0,
    packetsLost: 0,
    packetsReceived: 0,
  };

  report.forEach((stat) => readStat(stat, stats));

  return stats;
}
