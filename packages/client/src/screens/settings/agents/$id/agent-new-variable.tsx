import type { AgentServerEnvironment } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import type * as React from 'react';
import { useState } from 'react';

export const environmentFooter =
  'The Agent starts with these variables. A change closes its open connections and applies from its next Session.';

export const addLabel = 'Add variable';

export const namePlaceholder = 'NAME';

export const valuePlaceholder = 'value';

type NewVariable = {
  name: string;
  value: string;
  onName: (name: string) => void;
  onValue: (value: string) => void;
  // Undefined until the name is one the environment can take.
  onAdd: (() => void) | undefined;
};

// A name is whatever the shell would take before `=`; one already saved is edited in its own section.
const usableName = (env: AgentServerEnvironment, name: string): boolean =>
  name !== '' && !name.includes('=') && !Object.hasOwn(env, name);

export function useNewVariable(
  env: AgentServerEnvironment,
  onChange: (env: AgentServerEnvironment) => void,
): NewVariable {
  const [name, onName] = useState('');
  const [value, onValue] = useState('');
  const trimmed = name.trim();

  const add = (): void => {
    onChange({ ...env, [trimmed]: value });
    onName('');
    onValue('');
  };

  const onAdd = usableName(env, trimmed) ? add : undefined;

  return { name, value, onName, onValue, onAdd };
}

export const newVariableSection = (draft: NewVariable): React.JSX.Element => (
  <FieldGroup.Section title={addLabel} footer={environmentFooter}>
    {nameField(draft)}
    {valueField(draft)}
    {addButton(draft.onAdd)}
  </FieldGroup.Section>
);

const addButton = (onAdd: NewVariable['onAdd']): React.JSX.Element => (
  <Button
    label={addLabel}
    variant="text"
    disabled={onAdd === undefined}
    onPress={onAdd}
  />
);

const nameField = (draft: NewVariable): React.JSX.Element => (
  <FieldGroup.TextField
    title="Name"
    value={draft.name}
    onChangeText={draft.onName}
    placeholder={namePlaceholder}
  />
);

const valueField = (draft: NewVariable): React.JSX.Element => (
  <FieldGroup.TextField
    title="Value"
    value={draft.value}
    onChangeText={draft.onValue}
    placeholder={valuePlaceholder}
  />
);
