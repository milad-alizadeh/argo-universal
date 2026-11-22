import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { List } from '@repo/kit/primitives/lists/list';
import type { JSX } from 'react';
import { workListSections } from '../work-list-sections';
import {
  shellElapsed,
  shellOutcome,
  shellSupporting,
  shellTitle,
} from './shell-format';
import type { ShellEntry, ShellListProps } from './shell-list-types';
import { shellRowMark } from './shell-mark';

type PhoneProps = ShellListProps & { now: number };

const listProps = {
  appearance: 'grouped',
  fit: false,
  accessibilityLabel: 'Background Tasks',
} as const;

const row = (shell: ShellEntry, props: PhoneProps): JSX.Element => (
  <FieldGroup.Link
    key={shell.id}
    title={shellTitle(shell)}
    subtitle={`${shellSupporting(shell)} · ${shellElapsed(shell, props.now)}`}
    subtitleTone={shellOutcome(shell).tone === 'danger' ? 'danger' : 'muted'}
    roomy
    leadingMark={shellRowMark(shell)}
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
