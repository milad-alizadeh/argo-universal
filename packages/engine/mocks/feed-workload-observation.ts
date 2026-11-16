import type { FeedSubscribeOutput } from '@repo/contracts';
import { assert } from 'vitest';

// The event-loop delay the workload test reads is CPU time the main thread spent in one task, so it grows with how slow the machine's CPU is: a shared CI runner took 2-6x the CPU time of a laptop for the same work (p95 50.7 ms against 8-25 ms). The budgets are for a reference CPU and scale by how much slower this one runs a fixed workload.
const referenceCalibrationMs = 20;

const calibrationRounds = 7;

const calibrationMessageLength = 200_000;

const calibrationMessages = 150;

export const cpuMs = (usage: NodeJS.CpuUsage): number =>
  (usage.user + usage.system) / 1000;

// Main-thread CPU time of one fixed workload of the kind the Engine does on a long message: build, serialise and copy it.
const calibrationRound = (): number => {
  const start = process.threadCpuUsage();
  let total = 0;

  for (let index = 0; index < calibrationMessages; index += 1) {
    const text = `${'x'.repeat(calibrationMessageLength)}${index}`;
    total +=
      JSON.stringify({ text }).length + structuredClone({ text }).text.length;
  }

  assert(total > 0);

  return cpuMs(process.threadCpuUsage(start));
};

// How many times slower than the reference CPU this one is, never below 1 so a fast machine keeps the published budgets; the fastest round is the least disturbed.
export const measureSlowdown = (): number => {
  const rounds = Array.from({ length: calibrationRounds }, calibrationRound);

  return Math.max(1, Math.min(...rounds) / referenceCalibrationMs);
};

const messageLength = (event: FeedSubscribeOutput, length: number): number => {
  if (event.type === 'row.append') return length + event.text.length;

  return upsertLength(event, length);
};

const upsertLength = (event: FeedSubscribeOutput, length: number): number => {
  if (event.type !== 'row.upsert') return length;

  if (event.row.sessionUpdate !== 'agent_message') return length;

  return event.row.content.reduce(
    (sum, block) => sum + (block.type === 'text' ? block.text.length : 0),
    0,
  );
};

const nextPhase = (event: FeedSubscribeOutput, previous: string): string => {
  if (event.type !== 'snapshot') return previous;

  if (event.snapshot.state === 'running') return 'running';

  return completedPhase(previous, event.snapshot.state);
};

const completedPhase = (previous: string, state: string): string => {
  return previous === 'running' && state === 'idle' ? 'done' : previous;
};

export const readUntilIdle = async (
  events: AsyncIterable<FeedSubscribeOutput>,
): Promise<number> => {
  let length = 0;
  let phase = 'waiting';

  for await (const event of events) {
    length = messageLength(event, length);
    phase = nextPhase(event, phase);

    if (phase === 'done') return length;
  }

  return length;
};
