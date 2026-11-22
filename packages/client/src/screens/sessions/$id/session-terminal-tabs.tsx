import type { RunConfigurationRow, ShellTerminal } from '@repo/contracts';
import { useState, type ReactElement } from 'react';
import {
  RunInspector,
  type SessionRuns,
  ShellTerminalInspector,
} from '#features/sessions';

export type TerminalTarget = { name: string } | { shellId: string };

const runPrefix = 'run:';
const shellPrefix = 'terminal:';

type RunKey = `run:${string}`;
type ShellKey = `terminal:${string}`;
export type TerminalKey = RunKey | ShellKey;

export const runTabKey = (name: string): RunKey => `${runPrefix}${name}`;
export const shellTabKey = (id: string): ShellKey => `${shellPrefix}${id}`;

const isRunKey = (key: string): key is RunKey => key.startsWith(runPrefix);
const isShellKey = (key: string): key is ShellKey =>
  key.startsWith(shellPrefix);

export function terminalTarget(key: TerminalKey): TerminalTarget {
  return isShellKey(key)
    ? { shellId: key.slice(shellPrefix.length) }
    : { name: key.slice(runPrefix.length) };
}

type TerminalTab =
  | { key: string; title: string; kind: 'run'; run: RunConfigurationRow }
  | { key: string; title: string; kind: 'shell'; shell: ShellTerminal };

export const runTerminalTab = (run: RunConfigurationRow): TerminalTab => ({
  key: runTabKey(run.name),
  title: run.name,
  kind: 'run',
  run,
});

const shellTerminalTab = (shell: ShellTerminal): TerminalTab => ({
  key: shellTabKey(shell.id),
  title: shell.name,
  kind: 'shell',
  shell,
});

export function terminalTabOf(
  controls: SessionRuns | undefined,
  key: string,
): TerminalTab | undefined {
  if (!isRunKey(key) && !isShellKey(key)) return undefined;

  const target = terminalTarget(key);

  if ('name' in target) {
    const run = controls?.runs.find(({ name }) => name === target.name);

    return run && runTerminalTab(run);
  }

  const shell = controls?.shells?.find(({ id }) => id === target.shellId);

  return shell && shellTerminalTab(shell);
}

// An open reply can reach the phone's sheet before the status stream lists that Terminal.
export function useOpenedShellTab(
  controls: SessionRuns | undefined,
  opened: ShellTerminal,
): TerminalTab | undefined {
  const listed = terminalTabOf(controls, shellTabKey(opened.id));
  const [seen, setSeen] = useState(false);

  if (listed && !seen) setSeen(true);

  return listed ?? (seen ? undefined : shellTerminalTab(opened));
}

// Closing a Run's tab hides its Terminal. Closing a shell Terminal also ends the shell.
export function endTerminalTab(
  controls: SessionRuns | undefined,
  tab: TerminalTab | undefined,
): void {
  if (tab?.kind === 'shell') controls?.closeShell?.(tab.shell.id);
}

type TerminalTabBodyProps = {
  tab: TerminalTab;
  controls: SessionRuns;
  visible?: boolean;
  compact?: boolean;
  onClose?: () => void;
};

export function TerminalTabBody({
  tab,
  controls,
  visible,
  compact,
  onClose,
}: TerminalTabBodyProps): ReactElement {
  if (tab.kind === 'run')
    return <RunInspector run={tab.run} {...{ controls, visible, compact }} />;

  return (
    <ShellTerminalInspector shell={tab.shell} onClose={onClose ?? (() => {})}>
      {controls.renderShell?.(tab.shell, visible === true, compact)}
    </ShellTerminalInspector>
  );
}
