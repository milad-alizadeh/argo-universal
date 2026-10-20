import type { Shell } from '@repo/contracts';
import { formatElapsed } from '#lib/generic/format-elapsed';
import type { IconName } from '#lib/generic/symbols/icon-names';
import type { Tone } from '#primitives/content/text';
import type { ShellEntry } from './shell-list-types';

// How a Shell stands: a running one draws a dot, an ended one the icon for how it ended.
export interface ShellOutcome {
  label: string;
  tone: Tone;
  icon?: IconName;
}

const running: ShellOutcome = { label: 'Running', tone: 'success' };

const stopped: ShellOutcome = {
  label: 'Stopped',
  tone: 'muted',
  icon: 'cancelled',
};

// The Server lost track of it, as when it restarted while the Shell ran.
const lost: ShellOutcome = { label: 'Lost', tone: 'warning', icon: 'warning' };

function exited(exitCode: number | null): ShellOutcome {
  if (exitCode === null) return { label: 'Exited', tone: 'muted' };

  return exitCode === 0
    ? { label: 'Exit 0', tone: 'muted', icon: 'check' }
    : { label: `Exit ${exitCode}`, tone: 'danger', icon: 'failed' };
}

const outcomes = {
  running: (): ShellOutcome => running,
  exited,
  stopped: (): ShellOutcome => stopped,
  lost: (): ShellOutcome => lost,
} satisfies Record<Shell['status'], (exitCode: number | null) => ShellOutcome>;

export function shellOutcome(shell: Shell): ShellOutcome {
  return outcomes[shell.status](shell.exitCode);
}

// A running Shell's time so far; an ended one's whole run.
export function shellElapsed(shell: Shell, now: number): string {
  return formatElapsed(
    shell.status === 'running' ? now - shell.startedAt : shell.durationMs,
  );
}

// A running Shell's row shows what it last printed; an ended one's, how it ended.
export function shellSupporting(shell: ShellEntry): string {
  if (shell.status !== 'running') return shellOutcome(shell).label;

  return shell.lastLine ?? shell.cwd;
}

// The list's heading: "1 running · 3 in this Session".
export function shellsSummary(shells: Shell[]): string {
  const count = shells.filter((shell) => shell.status === 'running').length;
  const total = `${shells.length} in this Session`;

  return count > 0 ? `${count} running · ${total}` : total;
}
