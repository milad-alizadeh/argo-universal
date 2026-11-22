import type {
  RunConfigurationRow,
  RunConfigurationStatus,
  RunDefaultGroup,
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

export const runStatusTone = {
  stopped: 'muted',
  starting: 'warning',
  ready: 'success',
  crashed: 'danger',
  lost: 'muted',
} as const satisfies Record<RunConfigurationStatus, Tone>;

export const runIsActive = ({
  status,
}: Pick<RunConfigurationRow, 'status'>): boolean =>
  status === 'starting' || status === 'ready';

type RunGroupState = {
  active: boolean;
  status: 'ready' | 'starting' | 'stopped';
};

export function runGroupState(
  { members, readyCount }: RunDefaultGroup,
  runs: readonly RunConfigurationRow[],
): RunGroupState {
  const active = runs.some(
    (run) => members.includes(run.name) && runIsActive(run),
  );

  const incomplete = active ? 'starting' : 'stopped';
  const status = readyCount === members.length ? 'ready' : incomplete;

  return { active, status };
}

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
