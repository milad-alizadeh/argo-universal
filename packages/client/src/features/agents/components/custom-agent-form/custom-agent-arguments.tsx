import { useStore } from '@tanstack/react-form';
import type * as React from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { keyedRows } from '../keyed-rows';
import {
  type ArgumentsField,
  type Editing,
  newArgument,
} from './argument-sheet';
import { AddEntryRow, type FormPartProps } from './custom-agent-form-sections';

type SectionProps = FormPartProps & { onEdit: (editing: Editing) => void };

type Arguments = ArgumentsField['state']['value'];

type ValuesProps = SectionProps & { args: Arguments };

const argumentHint = 'Each argument is passed exactly as typed, in this order.';

export function useArguments(form: FormPartProps['form']): Arguments {
  return useStore(form.store, (state) => state.values.args);
}

/*
 * One row per argument, in order; each opens its editor, and the last row adds one.
 * GroupedList takes its sections, and each section its rows, as direct children, so this is called rather than rendered.
 */
export function argumentsSection(props: ValuesProps): React.JSX.Element {
  return (
    <GroupedListSection key="arguments" title="Arguments" footer={argumentHint}>
      {argumentRows(props)}
      <AddEntryRow
        label="Add argument"
        disabled={props.disabled}
        onPress={() => props.onEdit(newArgument)}
      />
    </GroupedListSection>
  );
}

function argumentRows(props: ValuesProps): React.JSX.Element[] {
  return keyedRows(props.args).map(({ key, index, value }) => (
    <GroupedListItem
      key={key}
      code
      label={value}
      disabled={props.disabled}
      onPress={() => props.onEdit({ index, value })}
    />
  ));
}
