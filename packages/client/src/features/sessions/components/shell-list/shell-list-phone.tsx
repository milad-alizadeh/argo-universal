import { List, phonesGrouped } from '@repo/kit/primitives/lists/list';
import {
  ListItem,
  type ListItemProps,
} from '@repo/kit/primitives/lists/list-item';
import type { JSX } from 'react';
import {
  shellElapsed,
  shellOutcome,
  shellsSummary,
  shellSupporting,
} from './shell-format';
import type { ShellEntry, ShellListProps } from './shell-list-types';
import { ShellMark } from './shell-mark';

type RowProps = Pick<ShellListProps, 'onSelect'> & {
  shell: ShellEntry;
  now: number;
};

// A failed exit reads in the danger colour, as its mark does.
const supportingTone = (shell: ShellEntry): 'danger' | undefined =>
  shellOutcome(shell).tone === 'danger' ? 'danger' : undefined;

// The row's lines: the command, what it last printed or how it ended, and how long it has run.
function rowText({ shell, now }: RowProps): ListItemProps {
  const supporting = shellSupporting(shell);
  const elapsed = shellElapsed(shell, now);

  return {
    title: shell.command,
    subtitle: supporting,
    subtitleTone: supportingTone(shell),
    value: elapsed,
    accessibilityLabel: `${shell.command}, ${supporting}, ${elapsed}`,
  };
}

function ShellRow(props: RowProps): JSX.Element {
  const { shell, onSelect } = props;

  return (
    <ListItem
      {...rowText(props)}
      leading={<ShellMark shell={shell} />}
      disclosure={Boolean(onSelect)}
      onPress={onSelect ? () => onSelect(shell) : undefined}
    />
  );
}

const listProps = {
  appearance: 'cards',
  onPhones: phonesGrouped,
  fit: false,
  accessibilityLabel: 'Shells',
} as const;

// The Session's background Shells under a count of the running ones.
export function PhoneShellList(
  props: ShellListProps & { now: number },
): JSX.Element {
  return (
    <List {...listProps}>
      <List.Section title={shellsSummary(props.shells)}>
        {props.shells.map((shell) => (
          <ShellRow key={shell.id} {...props} shell={shell} />
        ))}
      </List.Section>
    </List>
  );
}
