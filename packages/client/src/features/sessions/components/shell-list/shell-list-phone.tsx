import { isStockIconName } from '@repo/contracts/kit-symbols';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List, phonesGrouped } from '@repo/kit/primitives/lists/list';
import type { ComponentProps, JSX } from 'react';
import { workListSections } from '../work-list-sections';
import {
  shellElapsed,
  shellOutcome,
  shellSupporting,
  shellTitle,
} from './shell-format';
import type { ShellEntry, ShellListProps } from './shell-list-types';

type Mark = NonNullable<ComponentProps<typeof FieldGroup.Link>['leadingMark']>;

const runningMark: Mark = {
  icon: 'terminal',
  tone: 'neutral',
  label: 'Background Task',
  status: { tone: 'success', label: 'Running' },
};

function endedTone(tone: string): Mark['tone'] {
  if (tone === 'danger') return 'danger';

  if (tone === 'warning') return 'warning';

  return 'neutral';
}

function endedMark(shell: ShellEntry): Mark {
  const outcome = shellOutcome(shell);
  const icon = outcome.icon ?? 'terminal';

  return {
    icon: isStockIconName(icon) ? icon : 'terminal',
    tone: endedTone(outcome.tone),
    label: outcome.label,
    plain: true,
  };
}

const mark = (shell: ShellEntry): Mark =>
  shell.status === 'running' ? runningMark : endedMark(shell);

type PhoneProps = ShellListProps & { now: number };

const listProps = {
  appearance: 'cards',
  onPhones: phonesGrouped,
  fit: false,
  accessibilityLabel: 'Background Tasks',
} as const;

const row = (shell: ShellEntry, props: PhoneProps): JSX.Element => (
  <FieldGroup.Link
    key={shell.id}
    title={shellTitle(shell)}
    subtitle={`${shellSupporting(shell)} · ${shellElapsed(shell, props.now)}`}
    subtitleTone={shellOutcome(shell).tone === 'danger' ? 'danger' : 'muted'}
    leadingMark={mark(shell)}
    disabled={!props.onSelect}
    onPress={() => props.onSelect?.(shell)}
  />
);

function rows(props: PhoneProps): JSX.Element[] {
  return workListSections(
    props.shells,
    (shell) => shell.status === 'running',
    (shell) => row(shell, props),
  );
}

export function PhoneShellList(props: PhoneProps): JSX.Element {
  return <List {...listProps}>{rows(props)}</List>;
}
