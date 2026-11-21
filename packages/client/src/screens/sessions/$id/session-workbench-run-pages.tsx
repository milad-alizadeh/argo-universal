import type { RunConfigurationRow } from '@repo/contracts';
import { Sheet, useSheet } from '@repo/kit/primitives/overlays/sheet';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  RunInspector,
  type SessionRuns,
  WorkbenchRuns,
} from '#features/sessions';
import { runTabKey } from './sections/runs-section';
import type { WorkbenchGroup } from './session-workbench-sheet-rows';

const listKey = 'runs';

export function WorkbenchRunList({
  runs,
}: {
  runs: SessionRuns;
}): ReactElement {
  const { push } = useSheet();

  return (
    <View className="px-2">
      <WorkbenchRuns
        {...runs}
        compact
        onOpen={(name) => push(runTabKey(name))}
      />
    </View>
  );
}

const active = ({ status }: RunConfigurationRow): boolean =>
  status === 'ready' || status === 'starting';

export function workbenchRunGroup(
  runs: SessionRuns | undefined,
): WorkbenchGroup[] {
  if (!runs?.runs.length) return [];

  return [
    {
      key: listKey,
      rows: [
        {
          key: listKey,
          label: 'Runs',
          value: String(runs.runs.filter(active).length),
          page: {
            title: 'Runs',
            keepsHeaderInset: true,
            children: <WorkbenchRunList runs={runs} />,
          },
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
