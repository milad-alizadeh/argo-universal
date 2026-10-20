import type { ComponentProps, JSX } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '#primitives/content/text';
import {
  shellElapsed,
  shellOutcome,
  shellPassed,
  shellSupporting,
} from './shell-format';
import type { ShellEntry, ShellListProps } from './shell-list-types';
import { ShellMark } from './shell-mark';

type RowProps = Pick<ShellListProps, 'onSelect'> & {
  shell: ShellEntry;
  now: number;
};

const rowClasses =
  'flex-row items-start gap-2.5 rounded-md p-2 web:hover:bg-hover web:active:bg-pressed web:focus-visible:outline-2 web:focus-visible:outline-focus web:focus-visible:-outline-offset-2';

// A running Shell is still printing, so its supporting line keeps the output's mono; an ended one reads as prose.
const supportingProps = (shell: ShellEntry) =>
  ({
    role: shell.status === 'running' ? 'secondary-code' : 'secondary',
    tone: shellOutcome(shell).tone === 'danger' ? 'danger' : 'muted',
    numberOfLines: 1,
  }) as const;

// A Shell that exited cleanly has nothing left to read, so its command reads muted.
function RowText({ shell }: { shell: ShellEntry }): JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text
        role="secondary-code"
        tone={shellPassed(shell) ? 'muted' : 'neutral'}
        numberOfLines={1}
      >
        {shell.command}
      </Text>
      <Text {...supportingProps(shell)}>{shellSupporting(shell)}</Text>
    </View>
  );
}

// The mark keeps its own lane, so every row's command starts at the same place.
function RowMark({ shell }: { shell: ShellEntry }): JSX.Element {
  return (
    <View className="h-5 w-4 shrink-0 items-center justify-center">
      <ShellMark shell={shell} />
    </View>
  );
}

function RowElapsed({ elapsed }: { elapsed: string }): JSX.Element {
  return (
    <View className="shrink-0">
      <Text role="secondary" tone="muted">
        {elapsed}
      </Text>
    </View>
  );
}

type RowPressable = Pick<
  ComponentProps<typeof Pressable>,
  'role' | 'accessibilityLabel' | 'onPress' | 'disabled' | 'className'
>;

// The row reads out as its three lanes do: the command, how it stands, and how long it has run.
const rowPressable = ({ shell, onSelect, now }: RowProps): RowPressable => ({
  role: 'button',
  accessibilityLabel: `${shell.command}, ${shellSupporting(shell)}, ${shellElapsed(shell, now)}`,
  onPress: onSelect ? () => onSelect(shell) : undefined,
  disabled: !onSelect,
  className: rowClasses,
});

function WideShellRow(props: RowProps): JSX.Element {
  return (
    <Pressable {...rowPressable(props)}>
      <RowMark shell={props.shell} />
      <RowText shell={props.shell} />
      <RowElapsed elapsed={shellElapsed(props.shell, props.now)} />
    </Pressable>
  );
}

// The Session's background Shells as plain rows, in the order the Agent started them.
export function WideShellList(
  props: ShellListProps & { now: number },
): JSX.Element {
  return (
    <View className="px-2 pt-2 pb-3" accessibilityLabel="Shells">
      {props.shells.map((shell) => (
        <WideShellRow key={shell.id} {...props} shell={shell} />
      ))}
    </View>
  );
}
