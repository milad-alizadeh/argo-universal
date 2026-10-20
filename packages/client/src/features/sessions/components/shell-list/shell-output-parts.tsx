import type { JSX } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { shellElapsed, shellOutcome } from './shell-format';
import type { ShellEntry } from './shell-list-types';

type ShellProps = { shell: ShellEntry };

function Folder({ shell }: ShellProps): JSX.Element {
  return (
    <View className="min-w-0 flex-1">
      <Text role="secondary-code" tone="muted" numberOfLines={1}>
        {shell.cwd}
      </Text>
    </View>
  );
}

// The command the Shell runs, and the folder it runs in.
export function CommandLine({ shell }: ShellProps): JSX.Element {
  return (
    <View className="h-8 flex-row items-center gap-2 px-4">
      <Text role="secondary-code" tone="muted">
        $
      </Text>
      <Text role="secondary-code" numberOfLines={1}>
        {shell.command}
      </Text>
      <Folder shell={shell} />
    </View>
  );
}

// The Server keeps only the newest lines of a long output.
export function DroppedLines({
  count,
}: {
  count?: number;
}): JSX.Element | null {
  if (!count) return null;

  return (
    <View className="pt-2.5 pb-1">
      <Text role="secondary" tone="muted">
        {`${count} earlier lines not kept`}
      </Text>
    </View>
  );
}

type EndProps = ShellProps & { now: number };

function Outcome({ shell }: ShellProps): JSX.Element {
  const outcome = shellOutcome(shell);

  return (
    <>
      {outcome.icon && (
        <Icon name={outcome.icon} role="body" tone={outcome.tone} />
      )}
      <Text role="secondary" tone={outcome.tone}>
        {outcome.label}
      </Text>
    </>
  );
}

// How an ended Shell ended and how long it ran: "Exit 1 after 8s".
export function ExitLine({ shell, now }: EndProps): JSX.Element | null {
  if (shell.status === 'running') return null;

  return (
    <View className="h-9 flex-row items-center gap-1.5">
      <Outcome shell={shell} />
      <Text role="secondary" tone="muted">
        {`after ${shellElapsed(shell, now)}`}
      </Text>
    </View>
  );
}
