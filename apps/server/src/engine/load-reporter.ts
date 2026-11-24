import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import {
  sendEngineMessage,
  type EngineLoad,
  type EngineMessage,
} from '@repo/engine/ipc';

const resolutionMs = 100;

const nanosecondsPerMs = 1_000_000;

const microsecondsPerPercent = 10;

function readLoad(): () => EngineLoad {
  const delay = monitorEventLoopDelay({ resolution: resolutionMs });

  delay.enable();

  let previousCpu = process.cpuUsage();

  let previousTime = performance.now();

  return (): EngineLoad => {
    const now = performance.now();
    const used = process.cpuUsage(previousCpu);
    const lagMs = Math.max(0, delay.max / nanosecondsPerMs - resolutionMs);

    const cpuPercent =
      (used.user + used.system) /
      Math.max(1, now - previousTime) /
      microsecondsPerPercent;

    delay.reset();
    previousCpu = process.cpuUsage();
    previousTime = now;

    return { pid: process.pid, sampledAt: Date.now(), lagMs, cpuPercent };
  };
}

export function reportEngineLoad(): (message: EngineMessage) => void {
  const load = readLoad();

  return (message): void => {
    sendEngineMessage(
      message.type === 'heartbeat' ? { ...message, load: load() } : message,
    );
  };
}
