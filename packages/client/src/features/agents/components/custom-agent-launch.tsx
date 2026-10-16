import type { CustomAgentDefinition } from '@repo/contracts';
import type * as React from 'react';
import { GroupedListItem } from '#primitives/lists/grouped-list-item';
import type { GroupedListItemProps } from '#primitives/lists/grouped-list-item';
import { GroupedListSection } from '#primitives/lists/grouped-list-section';
import { keyedRows } from './keyed-rows';

type DefinitionProps = { definition: CustomAgentDefinition };

// The launch values read-only, in the edit form's sections, then the row that opens the form.
export function LaunchSections(
  props: DefinitionProps & { onEdit: () => void },
): React.JSX.Element {
  return (
    <>
      <ProgramValues definition={props.definition} />
      <ArgumentValues definition={props.definition} />
      <VariableValues definition={props.definition} />
      <EditSection onPress={props.onEdit} />
    </>
  );
}

function EditSection({ onPress }: { onPress: () => void }): React.JSX.Element {
  return (
    <GroupedListSection>
      <GroupedListItem
        icon="edit"
        tone="accent"
        label="Edit"
        onPress={onPress}
      />
    </GroupedListSection>
  );
}

function ProgramValues({ definition }: DefinitionProps): React.JSX.Element {
  return (
    <GroupedListSection title="Program">
      <GroupedListItem label="Name" value={definition.name} />
      <GroupedListItem
        label="Executable"
        subtitle={{ text: definition.executable, code: true }}
      />
    </GroupedListSection>
  );
}

function ArgumentValues({ definition }: DefinitionProps): React.JSX.Element {
  const rows = keyedRows(definition.args);

  return (
    <GroupedListSection title="Arguments">
      {rows.length === 0 ? (
        <None />
      ) : (
        rows.map(({ key, value }) => (
          <GroupedListItem key={key} code label={value} />
        ))
      )}
    </GroupedListSection>
  );
}

function VariableValues({ definition }: DefinitionProps): React.JSX.Element {
  const rows = keyedRows(definition.env);

  return (
    <GroupedListSection title="Environment variables">
      {rows.length === 0 ? (
        <None />
      ) : (
        rows.map(({ key, value }) => <VariableRow key={key} variable={value} />)
      )}
    </GroupedListSection>
  );
}

// A variable's name over its value, as the form lists it.
export const VariableRow = ({
  variable,
  ...press
}: {
  variable: CustomAgentDefinition['env'][number];
} & Partial<
  Pick<GroupedListItemProps, 'onPress' | 'disabled'>
>): React.JSX.Element => (
  <GroupedListItem
    code
    label={variable.name}
    subtitle={{ text: variable.value, code: true }}
    {...press}
  />
);

const None = (): React.JSX.Element => <GroupedListItem label="None" />;
