import { syntaxRuns, syntaxRunsText } from '@repo/kit/primitives/content/code';
import { Icon } from '@repo/kit/primitives/content/icon';
import { Text } from '@repo/kit/primitives/content/text';
import type { IconName } from '@repo/kit/symbols/icon-names';
import { type JSX, type ReactNode, useMemo } from 'react';
import { View } from 'react-native';
import { type ShellOutcome, shellEnding, shellOutcome } from './shell-format';
import type { ShellEntry } from './shell-list-types';

type ShellProps = { shell: ShellEntry };

// The full folder remains selectable below the command.
function Folder({ shell }: ShellProps): JSX.Element {
  return (
    <View className="min-w-0">
      <Text role="secondary-code" tone="muted" selectable>
        {shell.cwd}
      </Text>
    </View>
  );
}

// The command coloured as bash; one too long to colour draws plain.
function useCommandText(command: string): ReactNode {
  const runs = useMemo(() => syntaxRuns(command, 'bash'), [command]);

  return runs ? syntaxRunsText(runs, 'secondary-code') : command;
}

function Command({ shell }: ShellProps): JSX.Element {
  const command = useCommandText(shell.command);

  return (
    <View className="min-w-0 flex-row items-start gap-2">
      <Text role="secondary-code" tone="muted">
        $
      </Text>
      <View className="min-w-0 flex-1">
        <Text role="secondary-code" selectable testID="shell-command">
          {command}
        </Text>
      </View>
    </View>
  );
}

// The command the Shell runs, and the folder it runs in.
export function CommandLine({ shell }: ShellProps): JSX.Element {
  return (
    <View className="gap-1 px-4 py-2">
      <Command shell={shell} />
      <Folder shell={shell} />
    </View>
  );
}

// The Server keeps only the newest lines of a long output. The List's header takes the rows' gutter, so this line holds none.
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

// Paper's exit footer marks a failure with a plain cross where the Shells list draws a circled one.
const footerIcon = (icon: IconName): IconName =>
  icon === 'failed' ? 'close' : icon;

function OutcomeMark({
  outcome,
}: {
  outcome: ShellOutcome;
}): JSX.Element | null {
  if (!outcome.icon) return null;

  return <Icon name={footerIcon(outcome.icon)} tone={outcome.tone} />;
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

// How an ended Shell ended and how long it ran: "Exit 1 after 8s"; a lost one says what became of it.
export function ExitLine({ shell }: ShellProps): JSX.Element | null {
  if (shell.status === 'running') return null;

  return (
    <View className="h-9 flex-row items-center gap-1.5 px-4">
      <Outcome shell={shell} />
      <Text role="secondary" tone="muted">
        {shellEnding(shell)}
      </Text>
    </View>
  );
}
