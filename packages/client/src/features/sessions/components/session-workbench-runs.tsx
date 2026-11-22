import type {
  RunConfigurationRow,
  RunDefaultGroup,
  ShellTerminal,
} from '@repo/contracts';
import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import { useClock } from '@repo/kit/use-clock';
import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import {
  runGroupState,
  runIsActive,
  runStatusLabel,
  runStatusTone,
} from './run-status';

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
  shells?: WorkbenchShells;
  compact?: boolean;
}

type WorkbenchShells = {
  rows: readonly ShellTerminal[];
  onOpen: (shell: ShellTerminal) => void;
  onNew?: () => void;
};

export type SessionRuns = Omit<WorkbenchRunsProps, 'onOpen' | 'shells'> & {
  draft?: { pending: boolean; onPress: () => void };
  shells?: readonly ShellTerminal[];
  openShell?: (opened: (shell: ShellTerminal) => void) => void;
  closeShell?: (id: string) => void;
  renderShell?: (
    shell: ShellTerminal,
    visible: boolean,
    compact?: boolean,
  ) => ReactNode;
  onRestart: (name: string) => void;
  renderTerminal: (
    run: RunConfigurationRow,
    visible: boolean,
    compact?: boolean,
  ) => ReactNode;
};

type RowProps = Pick<
  WorkbenchRunsProps,
  'onOpen' | 'onStart' | 'onStop' | 'compact'
> & {
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
      <RunAction
        name={name}
        active={active}
        compact={compact}
        onStart={() => onStart(name)}
        onStop={() => onStop(name)}
      />
    </View>
  );
}

function RunAction({
  name,
  active,
  compact,
  onStart,
  onStop,
}: {
  name: string;
  active: boolean;
  compact?: boolean;
  onStart: () => void;
  onStop: () => void;
}): ReactElement {
  return (
    <IconButton
      accessibilityLabel={active ? `Stop ${name}` : `Start ${name}`}
      icon={active ? 'stop' : 'play'}
      variant={active ? 'ghost' : 'primary'}
      size={compact ? 'lg' : 'sm'}
      onPress={active ? onStop : onStart}
    />
  );
}

function GroupRow({
  status,
  runs,
  compact,
  onStart,
  onStop,
}: RunGroupControls & {
  runs: readonly RunConfigurationRow[];
  compact?: boolean;
}): ReactElement {
  const { name, members, readyCount, url } = status;

  const { active, status: state } = runGroupState(status, runs);

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
      <RunAction
        name={`${name} group`}
        {...{ active, compact, onStart, onStop }}
      />
    </View>
  );
}

function ShellRows({ rows, onOpen, onNew }: WorkbenchShells): ReactElement {
  return (
    <>
      {rows.map((shell) => (
        <Pressable
          key={shell.id}
          role="button"
          accessibilityLabel={`Open ${shell.name} shell`}
          onPress={() => onOpen(shell)}
          className="min-w-0 flex-row items-center gap-2 rounded-control px-1 py-2 web:hover:bg-hover"
        >
          <Icon name="terminal" tone="muted" />
          <Text numberOfLines={1}>{shell.name}</Text>
          <View className="min-w-0 flex-1">
            <Text role="secondary" tone="muted" numberOfLines={1}>
              {shell.cwd}
            </Text>
          </View>
        </Pressable>
      ))}
      {onNew && (
        <IconButton
          accessibilityLabel="New Terminal"
          icon="terminal"
          onPress={onNew}
          variant="ghost"
        />
      )}
    </>
  );
}

export function WorkbenchRuns({
  runs,
  defaultGroup,
  now,
  shells,
  ...actions
}: WorkbenchRunsProps): ReactElement {
  const clock = useClock(
    runs.some(({ status }) => status === 'starting'),
    now,
  );

  return (
    <View className={actions.compact ? 'px-2' : undefined}>
      {defaultGroup && defaultGroup.status.members.length > 0 && (
        <GroupRow {...defaultGroup} runs={runs} compact={actions.compact} />
      )}
      {runs.map((run) => (
        <RunRow key={run.name} run={run} now={clock} {...actions} />
      ))}
      {shells && <ShellRows {...shells} />}
    </View>
  );
}
