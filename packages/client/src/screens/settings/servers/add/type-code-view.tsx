import { Button } from '@repo/kit/primitives/actions/button';
import { FieldGroup } from '@repo/kit/primitives/fields/field-group';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { useForm } from '@tanstack/react-form';
import type * as React from 'react';

export interface TypeCodeViewProps {
  // Whether the code just typed is being asked of the Servers on the network; the field keeps what was typed.
  looking?: boolean;
  // What the owner typed, as typed. Whether it is a code is for the caller to say, so a mistyped one is told the same way whatever the mistake.
  onSubmit: (typed: string) => void;
}

const instruction =
  'On the other computer, open Settings › Devices and press Pair a Device. Type the code under the picture. You’ll confirm on that computer before anything is shared.';

/*
 * The way into Add a Server for a Device with no camera (#1502): the code the other computer shows under its picture, typed. It is the same code and ends in the same question on that computer.
 */
export function TypeCodeView(props: TypeCodeViewProps): React.JSX.Element {
  return (
    <Screen title="Add a Server">
      <CodeForm {...props} />
    </Screen>
  );
}

const empty = { code: '' };

const sent =
  (props: TypeCodeViewProps) =>
  ({ value }: { value: typeof empty }): void =>
    props.onSubmit(value.code);

function CodeForm(props: TypeCodeViewProps): React.JSX.Element {
  const form = useForm({ defaultValues: empty, onSubmit: sent(props) });

  const submit = (): void => void form.handleSubmit();

  return (
    <FieldGroup>
      <FieldGroup.Section footer={instruction}>
        <form.Field name="code">{(f) => codeRow(props, f, submit)}</form.Field>
      </FieldGroup.Section>
      <FieldGroup.Section>{continueButton(props, submit)}</FieldGroup.Section>
    </FieldGroup>
  );
}

const codeRow = (
  props: TypeCodeViewProps,
  field: { state: { value: string }; handleChange: (value: string) => void },
  submit: () => void,
): React.JSX.Element => (
  <FieldGroup.TextField
    title="Code"
    placeholder="XXXXX-XXXXX"
    value={field.state.value}
    disabled={props.looking}
    /* oxlint-disable-next-line jsx-a11y/no-autofocus -- the page exists to take this code; it opens focused. */
    autoFocus
    onChangeText={field.handleChange}
    onSubmit={submit}
  />
);

const continueButton = (
  props: TypeCodeViewProps,
  submit: () => void,
): React.JSX.Element => (
  <Button
    label={props.looking ? 'Looking…' : 'Continue'}
    disabled={props.looking}
    onPress={submit}
  />
);
