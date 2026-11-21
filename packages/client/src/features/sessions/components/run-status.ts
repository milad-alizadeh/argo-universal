import type {
  RunConfigurationRow,
  RunConfigurationStatus,
} from '@repo/contracts';
import { formatElapsed } from '@repo/kit/format-elapsed';
import type { Tone } from '@repo/kit/primitives/content/text';

const labels: Record<RunConfigurationStatus, string> = {
  stopped: 'Stopped',
  starting: 'Starting',
  ready: 'Ready',
  crashed: 'Crashed',
  lost: 'Lost',
};

export const runStatusTone: Record<RunConfigurationStatus, Tone> = {
  stopped: 'muted',
  starting: 'warning',
  ready: 'success',
  crashed: 'danger',
  lost: 'muted',
};

export const runIsActive = ({ status }: RunConfigurationRow): boolean =>
  status === 'starting' || status === 'ready';

export function runStatusLabel(
  run: RunConfigurationRow,
  now: number,
  showUptime: boolean,
): string {
  const label = labels[run.status];

  if (run.status === 'crashed' && run.exitCode !== null)
    return `${label} · exit ${run.exitCode}`;

  return showUptime && runIsActive(run) && run.startedAt !== null
    ? `${label} · ${formatElapsed(now - run.startedAt)}`
    : label;
}
