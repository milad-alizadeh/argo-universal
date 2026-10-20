import type { JSX } from 'react';
import { View } from 'react-native';
import type { IconName } from '#lib/generic/symbols/icon-names';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { type ShellOutcome, shellElapsed, shellOutcome } from './shell-format';
import type { ShellEntry } from './shell-list-types';

type ShellProps = { shell: ShellEntry };

// The folder sits at the line's far end, as in Paper.
function Folder({ shell }: ShellProps): JSX.Element {
  return (
    <View className="min-w-0 flex-1 items-end">
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

// The Server keeps only the newest lines of a long output. List rows hold their own gutters, so the header and end lines take the same.
export function DroppedLines({
  count,
}: {
  count?: number;
}): JSX.Element | null {
  if (!count) return null;

  return (
    <View className="px-4 pt-2.5 pb-1">
      <Text role="secondary" tone="muted">
        {`${count} earlier lines not kept`}
      </Text>
    </View>
  );
}

type EndProps = ShellProps & { now: number };

// Paper's exit footer marks a failure with a plain cross where the Shells list draws a circled one.
const footerIcon = (icon: IconName): IconName =>
  icon === 'failed' ? 'close' : icon;

function OutcomeMark({
  outcome,
}: {
  outcome: ShellOutcome;
}): JSX.Element | null {
  if (!outcome.icon) return null;

  return (
    <Icon
      name={footerIcon(outcome.icon)}
      role="secondary"
      tone={outcome.tone}
    />
  );
}

function Outcome({ shell }: ShellProps): JSX.Element {
  const outcome = shellOutcome(shell);

  return (
    <>
      <OutcomeMark outcome={outcome} />
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
    <View className="h-9 flex-row items-center gap-1.5 px-4">
      <Outcome shell={shell} />
      <Text role="secondary" tone="muted">
        {`after ${shellElapsed(shell, now)}`}
      </Text>
    </View>
  );
}
