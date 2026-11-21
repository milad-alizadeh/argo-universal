import type { RunConfigurationRow, RunDefaultGroup } from '@repo/contracts';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import { useClock } from '@repo/kit/use-clock';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { runIsActive, runStatusLabel, runStatusTone } from './run-status';

type RunGroupControls = {
  status: RunDefaultGroup;
  onStart: () => void;
  onStop: () => void;
};

export interface WorkbenchRunsProps {
  runs: readonly RunConfigurationRow[];
  onOpen: (name: string) => void;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  defaultGroup?: RunGroupControls;
  now?: number;
}

export type SessionRuns = Omit<WorkbenchRunsProps, 'onOpen'> & {
  onRestart: (name: string) => void;
  renderTerminal: (run: RunConfigurationRow, visible: boolean) => ReactNode;
};

type RowProps = Omit<WorkbenchRunsProps, 'runs' | 'now' | 'defaultGroup'> & {
  run: RunConfigurationRow;
  now: number;
};

// The action and the Terminal link are separate controls on the same row.
function RunRow({ run, now, onOpen, onStart, onStop }: RowProps): ReactElement {
  const { name, port, status } = run;
  const active = runIsActive(run);
  const label = runStatusLabel(run, now, status === 'starting');

  return (
    <View className="flex-row items-center gap-1">
      <Pressable
        role="button"
        accessibilityLabel={`Open ${name} Terminal`}
        accessibilityHint={label}
        onPress={() => onOpen(name)}
        className="min-w-0 flex-1 flex-row items-center gap-2 rounded-control px-1 py-2 web:hover:bg-hover"
      >
        <StatusDot tone={runStatusTone[status]} size="sm" />
        <View className="min-w-0 shrink">
          <Text numberOfLines={1}>{name}</Text>
        </View>
        <Text role="secondary" tone="muted" numberOfLines={1}>
          {port === null ? label : `${label} · :${port}`}
        </Text>
      </Pressable>
      <RunAction
        name={name}
        active={active}
        onStart={() => onStart(name)}
        onStop={() => onStop(name)}
      />
    </View>
  );
}

function RunAction({
  name,
  active,
  onStart,
  onStop,
}: {
  name: string;
  active: boolean;
  onStart: () => void;
  onStop: () => void;
}): ReactElement {
  return (
    <IconButton
      accessibilityLabel={active ? `Stop ${name}` : `Start ${name}`}
      icon={active ? 'stop' : 'play'}
      variant={active ? 'ghost' : 'primary'}
      size="sm"
      onPress={active ? onStop : onStart}
    />
  );
}

function GroupRow({
  status: { name, members, readyCount, url },
  runs,
  onStart,
  onStop,
}: RunGroupControls & { runs: readonly RunConfigurationRow[] }): ReactElement {
  const active = runs.some(
    (run) => members.includes(run.name) && runIsActive(run),
  );

  const runningState = active ? 'starting' : 'stopped';
  const state = readyCount === members.length ? 'ready' : runningState;

  return (
    <View className="flex-row items-center gap-1">
      <View className="min-w-0 flex-1 gap-1 px-1 py-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <StatusDot tone={runStatusTone[state]} size="sm" />
          <View className="min-w-0 shrink">
            <Text numberOfLines={1}>{name}</Text>
          </View>
          <Text role="secondary" tone="muted" numberOfLines={1}>
            {readyCount} of {members.length} ready
          </Text>
        </View>
        {url && (
          <Text role="secondary" tone="muted" numberOfLines={1}>
            {url}
          </Text>
        )}
      </View>
      <RunAction name={`${name} group`} {...{ active, onStart, onStop }} />
    </View>
  );
}

export function WorkbenchRuns({
  runs,
  defaultGroup,
  now,
  ...actions
}: WorkbenchRunsProps): ReactElement {
  const clock = useClock(
    runs.some(({ status }) => status === 'starting'),
    now,
  );

  return (
    <View>
      {defaultGroup && defaultGroup.status.members.length > 0 && (
        <GroupRow {...defaultGroup} runs={runs} />
      )}
      {runs.map((run) => (
        <RunRow key={run.name} run={run} now={clock} {...actions} />
      ))}
    </View>
  );
}
