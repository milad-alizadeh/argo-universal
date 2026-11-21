import type { LatencyReport, StartTimes } from '../stores/latency-probe';
import { turnGapLevels } from './turn-gaps';

// SPIKE (latency on a phone): a call's measurements as the text the person reads on the panel and copies from it.

// Where the call ran, which the numbers are compared by.
export interface LatencyContext {
  platform: string;
  // What the person says the phone is on; the App does not read the network.
  network: string;
  // The speaker or headphones the call plays on, where the App knows it.
  route: string | undefined;
}

const ms = (value: number | undefined): string =>
  value === undefined ? '–' : String(Math.round(value));

// The time one step took after the step before it.
const between = (from: number | undefined, to: number | undefined): string =>
  from === undefined || to === undefined ? '–' : `+${ms(to - from)}`;

function medianOf(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;

  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  const lower = sorted[middle - 1];

  if (sorted.length % 2 === 1 || lower === undefined) return upper;

  return upper === undefined ? undefined : (lower + upper) / 2;
}

const startLines = (start: StartTimes): string[] => [
  'Start, ms (steps after the tap; + is the step alone)',
  `  microphone open        ${ms(start.microphone)}`,
  `  offer ready (ICE)      ${between(start.microphone, start.offer)}`,
  `  answer through Server  ${between(start.offer, start.answer)}`,
  `  answer accepted        ${between(start.answer, start.accepted)}`,
  `  first packets          ${ms(start.firstPackets)}`,
  `  first voice            ${ms(start.firstVoice)}`,
];

const gapLine = (gaps: readonly number[]): string =>
  gaps.length === 0
    ? 'Turn gaps, ms: none yet'
    : `Turn gaps, ms: ${gaps.map(ms).join(', ')} · median ${ms(medianOf(gaps))} · n ${gaps.length}`;

const percent = (value: number | undefined): string =>
  value === undefined ? '–' : `${value.toFixed(2)}%`;

const linkLine = ({ link }: LatencyReport): string =>
  `Link: RTT ${ms(link.rttMs)} avg / ${ms(link.rttMaxMs)} max · jitter ${ms(link.jitterMs)} / ${ms(link.jitterMaxMs)} · buffer ${ms(link.bufferMs)} · loss ${percent(link.lossPercent)} · ${link.samples} samples`;

const levelPrecision = 3;

const levelLine = ({ levels }: LatencyReport): string =>
  `Levels now: mic ${levels.input.toFixed(levelPrecision)} (speech above ${turnGapLevels.person}) · voice ${levels.output.toFixed(levelPrecision)} (above ${turnGapLevels.voice})`;

const headOf = (report: LatencyReport, context: LatencyContext): string =>
  [
    'Argo Conversation latency',
    context.platform,
    context.network,
    context.route,
    report.live ? 'running' : 'ended',
  ]
    .filter((part) => part !== undefined && part !== '')
    .join(' · ');

export const latencyTextOf = (
  report: LatencyReport,
  context: LatencyContext,
): string =>
  [
    headOf(report, context),
    ...startLines(report.start),
    gapLine(report.gaps),
    linkLine(report),
    levelLine(report),
  ].join('\n');

// The panel's one line while it is closed: the last turn gap and how long the start took.
export const latencySummaryOf = ({ gaps, start }: LatencyReport): string =>
  `gap ${ms(gaps.at(-1))} ms · start ${ms(start.firstPackets)} ms`;
