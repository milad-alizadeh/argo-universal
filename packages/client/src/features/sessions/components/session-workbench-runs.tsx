import type { RunConfigurationRow } from '@repo/contracts';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Text } from '@repo/kit/primitives/content/text';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import { useClock } from '@repo/kit/use-clock';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { runIsActive, runStatusLabel, runStatusTone } from './run-status';

export interface WorkbenchRunsProps {
  runs: readonly RunConfigurationRow[];
  onOpen: (name: string) => void;
  onStart: (name: string) => void;
  onStop: (name: string) => void;
  now?: number;
  compact?: boolean;
}

export type SessionRuns = Omit<WorkbenchRunsProps, 'onOpen'> & {
  onRestart: (name: string) => void;
  renderTerminal: (
    run: RunConfigurationRow,
    visible: boolean,
    compact?: boolean,
  ) => ReactNode;
};

type RowProps = Omit<WorkbenchRunsProps, 'runs' | 'now'> & {
  run: RunConfigurationRow;
  now: number;
};

// The action and the Terminal link are separate controls on the same row.
function RunRow({
  run,
  now,
  compact,
  onOpen,
  onStart,
  onStop,
}: RowProps): ReactElement {
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
      <IconButton
        accessibilityLabel={active ? `Stop ${name}` : `Start ${name}`}
        icon={active ? 'stop' : 'play'}
        variant={active ? 'ghost' : 'primary'}
        size={compact ? 'lg' : 'sm'}
        onPress={() => (active ? onStop(name) : onStart(name))}
      />
    </View>
  );
}

export function WorkbenchRuns({
  runs,
  now,
  ...actions
}: WorkbenchRunsProps): ReactElement {
  const clock = useClock(
    runs.some(({ status }) => status === 'starting'),
    now,
  );

  return (
    <View>
      {runs.map((run) => (
        <RunRow key={run.name} run={run} now={clock} {...actions} />
      ))}
    </View>
  );
}
