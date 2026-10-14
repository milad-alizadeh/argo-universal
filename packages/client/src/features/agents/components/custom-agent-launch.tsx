import type { CustomAgentDefinition } from '@repo/contracts';
import type * as React from 'react';
import type { ListItemProps } from '#primitives/fields/field-props';
import { FieldSection } from '#primitives/fields/field-section/field-section';
import { ListItem } from '#primitives/lists/list-item/list-item';
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
    <FieldSection>
      <ListItem icon="edit" tone="accent" title="Edit" onPress={onPress} />
    </FieldSection>
  );
}

function ProgramValues({ definition }: DefinitionProps): React.JSX.Element {
  return (
    <FieldSection title="Program">
      <ListItem title="Name" value={definition.name} />
      <ListItem
        title="Executable"
        subtitle={{ text: definition.executable, code: true }}
      />
    </FieldSection>
  );
}

function ArgumentValues({ definition }: DefinitionProps): React.JSX.Element {
  const rows = keyedRows(definition.args);

  return (
    <FieldSection title="Arguments">
      {rows.length === 0 ? (
        <None />
      ) : (
        rows.map(({ key, value }) => <ListItem key={key} code title={value} />)
      )}
    </FieldSection>
  );
}

function VariableValues({ definition }: DefinitionProps): React.JSX.Element {
  const rows = keyedRows(definition.env);

  return (
    <FieldSection title="Environment variables">
      {rows.length === 0 ? (
        <None />
      ) : (
        rows.map(({ key, value }) => <VariableRow key={key} variable={value} />)
      )}
    </FieldSection>
  );
}

// A variable's name over its value, as the form lists it.
export const VariableRow = ({
  variable,
  ...press
}: {
  variable: CustomAgentDefinition['env'][number];
} & Partial<
  Pick<ListItemProps, 'onPress' | 'disabled'>
>): React.JSX.Element => (
  <ListItem
    code
    title={variable.name}
    subtitle={{ text: variable.value, code: true }}
    {...press}
  />
);

const None = (): React.JSX.Element => <ListItem title="None" />;
