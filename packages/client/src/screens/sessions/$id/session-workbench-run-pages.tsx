import type { ShellTerminal } from '@repo/contracts';
import { Sheet, useSheet } from '@repo/kit/primitives/overlays/sheet';
import type { ReactElement } from 'react';
import { type SessionRuns, WorkbenchRuns } from '#features/sessions';
import {
  runTabKey,
  runTerminalTab,
  TerminalTabBody,
} from './session-terminal-tabs';
import { workbenchShellPage } from './session-workbench-shell-page';

export const workbenchRunsKey = 'runs';

export function WorkbenchRunList({
  runs,
}: {
  runs: SessionRuns;
}): ReactElement {
  const { push } = useSheet();

  const openShell = (shell: ShellTerminal): void =>
    push(workbenchShellPage(shell));

  return (
    <WorkbenchRuns
      {...runs}
      compact
      onOpen={(name) => push(runTabKey(name))}
      shells={{
        rows: runs.shells ?? [],
        onOpen: openShell,
        onNew: runs.openShell ? () => runs.openShell?.(openShell) : undefined,
      }}
    />
  );
}

// The page that starts and stops the Runs and opens a Terminal, behind the Runs section's rows.
export function workbenchRunsPage(
  runs: SessionRuns | undefined,
): ReactElement[] {
  if (!runs) return [];

  return [
    <Sheet.Screen
      key={workbenchRunsKey}
      name={workbenchRunsKey}
      title="Runs"
      keepsHeaderInset
    >
      <WorkbenchRunList runs={runs} />
    </Sheet.Screen>,
  ];
}

export function workbenchRunPages(
  runs: SessionRuns | undefined,
): ReactElement[] {
  if (!runs) return [];

  return runs.runs.map(runTerminalTab).map((tab) => (
    <Sheet.Screen
      key={tab.key}
      name={tab.key}
      title={tab.title}
      keepsHeaderInset
    >
      <TerminalTabBody tab={tab} controls={runs} visible compact />
    </Sheet.Screen>
  ));
}
