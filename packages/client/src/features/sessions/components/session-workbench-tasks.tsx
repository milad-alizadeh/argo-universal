import { Text } from '@repo/kit/primitives/content/text';
import { useClock } from '@repo/kit/use-clock';
import type { ReactElement } from 'react';
import { Pressable, View } from 'react-native';
import { shellElapsed, shellTitle } from './shell-list/shell-format';
import type { ShellEntry, ShellListProps } from './shell-list/shell-list-types';
import { ShellMark } from './shell-list/shell-mark';
import { activePreview } from './workbench-preview';
import { WorkbenchShowMore } from './workbench-show-more';

type OpenTask = (shell: ShellEntry) => void;

type Props = Pick<ShellListProps, 'shells' | 'now'> & { onOpen: OpenTask };

type RowProps = { shell: ShellEntry; now: number; onOpen: OpenTask };

const isRunning = (shell: ShellEntry): boolean => shell.status === 'running';

// The Session's running Background Tasks, up to the preview's limit, each leading with its live dot.
export function WorkbenchTasks(props: Props): ReactElement {
  const { rows } = activePreview(props.shells, isRunning);
  const now = useClock(rows.length > 0, props.now);

  return (
    <View>
      {rows.map((shell) => (
        <TaskRow key={shell.id} shell={shell} now={now} onOpen={props.onOpen} />
      ))}
    </View>
  );
}

// The footer of the Background Tasks card: the tasks it left out, absent when every one is a row.
export function WorkbenchMoreTasks({
  shells,
  onOpen,
}: Pick<ShellListProps, 'shells'> & {
  onOpen: () => void;
}): ReactElement | null {
  const { more, done } = activePreview(shells, isRunning);

  return <WorkbenchShowMore more={more} done={done} onOpen={onOpen} />;
}

const rowPressable = ({ shell, onOpen }: RowProps) =>
  ({
    role: 'button',
    accessibilityLabel: `Open ${shellTitle(shell)}`,
    onPress: () => onOpen(shell),
    className:
      'flex-row items-center gap-2 rounded-control px-1 py-2 web:hover:bg-hover web:focus-visible:bg-hover',
  }) as const;

function TaskRow(props: RowProps): ReactElement {
  return (
    <Pressable {...rowPressable(props)}>
      <View className="h-5 w-6 shrink-0 items-center justify-center">
        <ShellMark shell={props.shell} />
      </View>
      <TaskText shell={props.shell} />
      <Text role="secondary" tone="muted">
        {shellElapsed(props.shell, props.now)}
      </Text>
    </Pressable>
  );
}

function TaskText({ shell }: { shell: ShellEntry }): ReactElement {
  return (
    <View className="min-w-0 flex-1">
      <Text role="secondary-code" numberOfLines={1}>
        {shellTitle(shell)}
      </Text>
    </View>
  );
}
