import type { RunConfigurationRow, ShellTerminal } from '@repo/contracts';
import { Sheet, useSheet } from '@repo/kit/primitives/overlays/sheet';
import type { ReactElement } from 'react';
import {
  RunInspector,
  type SessionRuns,
  WorkbenchRuns,
} from '#features/sessions';
import { runTabKey } from './sections/runs-section';
import type { WorkbenchGroup } from './session-workbench-sheet-rows';
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

const active = ({ status }: RunConfigurationRow): boolean =>
  status === 'ready' || status === 'starting';

export function workbenchRunGroup(
  runs: SessionRuns | undefined,
): WorkbenchGroup[] {
  if (!runs || (!runs.runs.length && !runs.shells?.length && !runs.openShell))
    return [];

  return [
    {
      key: workbenchRunsKey,
      rows: [
        {
          key: workbenchRunsKey,
          label: 'Runs',
          value: String(runs.runs.filter(active).length),
          page: { title: 'Runs', children: <WorkbenchRunList runs={runs} /> },
        },
      ],
    },
  ];
}

export function workbenchRunPages(
  runs: SessionRuns | undefined,
): ReactElement[] {
  if (!runs) return [];

  return runs.runs.map((run) => (
    <Sheet.Screen
      key={runTabKey(run.name)}
      name={runTabKey(run.name)}
      title={run.name}
      keepsHeaderInset
    >
      <RunInspector run={run} controls={runs} compact />
    </Sheet.Screen>
  ));
}
