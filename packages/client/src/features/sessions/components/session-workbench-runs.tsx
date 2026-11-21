import type { RunConfigurationRow, ShellTerminal } from '@repo/contracts';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
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
  shells?: WorkbenchShells;
}

type WorkbenchShells = {
  rows: readonly ShellTerminal[];
  onOpen: (id: string) => void;
  onNew?: () => void;
};

export type SessionRuns = Omit<WorkbenchRunsProps, 'onOpen' | 'shells'> & {
  shells?: readonly ShellTerminal[];
  openShell?: (opened: (shell: ShellTerminal) => void) => void;
  closeShell?: (id: string) => void;
  renderShell?: (shell: ShellTerminal, visible: boolean) => ReactNode;
  onRestart: (name: string) => void;
  renderTerminal: (run: RunConfigurationRow, visible: boolean) => ReactNode;
};

type RowProps = Pick<WorkbenchRunsProps, 'onOpen' | 'onStart' | 'onStop'> & {
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
      <IconButton
        accessibilityLabel={active ? `Stop ${name}` : `Start ${name}`}
        icon={active ? 'stop' : 'play'}
        variant={active ? 'ghost' : 'primary'}
        size="sm"
        onPress={() => (active ? onStop(name) : onStart(name))}
      />
    </View>
  );
}

function ShellRows({ rows, onOpen, onNew }: WorkbenchShells): ReactElement {
  return (
    <>
      {rows.map(({ id, name, cwd }) => (
        <Pressable
          key={id}
          role="button"
          accessibilityLabel={`Open ${name} shell`}
          onPress={() => onOpen(id)}
          className="min-w-0 flex-row items-center gap-2 rounded-control px-1 py-2 web:hover:bg-hover"
        >
          <Icon name="terminal" tone="muted" />
          <Text numberOfLines={1}>{name}</Text>
          <View className="min-w-0 flex-1">
            <Text role="secondary" tone="muted" numberOfLines={1}>
              {cwd}
            </Text>
          </View>
        </Pressable>
      ))}
      {onNew && (
        <Pressable
          role="button"
          onPress={onNew}
          className="rounded-control px-1 py-2 web:hover:bg-hover"
        >
          <Text role="secondary" tone="muted">
            New Terminal
          </Text>
        </Pressable>
      )}
    </>
  );
}

export function WorkbenchRuns({
  runs,
  now,
  shells,
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
      {shells && <ShellRows {...shells} />}
    </View>
  );
}
