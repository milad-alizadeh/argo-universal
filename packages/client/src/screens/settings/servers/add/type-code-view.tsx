import { pairingTicketLength } from '@repo/contracts';
import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import { CodeField } from '@repo/kit/primitives/fields/code-field';
import { PinnedFooter } from '@repo/kit/primitives/scaffolds/pinned-footer';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { useForm } from '@tanstack/react-form';
import type * as React from 'react';

export interface TypeCodeViewProps {
  // Whether the code just typed is being asked of the Servers on the network; the field keeps what was typed.
  looking?: boolean;
  // What the owner typed, as its characters. Whether they are a code is for the caller to say, so a mistyped one is told the same way whatever the mistake.
  onSubmit: (typed: string) => void;
}

const instruction =
  'On the other computer, open Settings › Devices › Pair a Device. The code is under the QR code. Both must be on the same Wi-Fi.';

/*
 * The way into Add a Server for a Device with no camera (#1502), from the "Enter code" page of the approved designs (#1490, option A): the code the other computer shows under its picture, typed, and Connect held at the foot of the page. The design's Address field is not here; the Server is found on the network.
 */
export function TypeCodeView(props: TypeCodeViewProps): React.JSX.Element {
  return (
    <Screen title="Enter code">
      <CodeForm {...props} />
    </Screen>
  );
}

// The Ticket is read aloud in two equal groups, so the boxes sit in two.
const ticketBoxes = {
  label: 'Code',
  length: pairingTicketLength,
  groupSize: pairingTicketLength / 2,
};

const empty = { code: '' };

const sent =
  (props: TypeCodeViewProps) =>
  ({ value }: { value: typeof empty }): void =>
    props.onSubmit(value.code);

function CodeForm(props: TypeCodeViewProps): React.JSX.Element {
  const form = useForm({ defaultValues: empty, onSubmit: sent(props) });

  const submit = (): void => void form.handleSubmit();

  return (
    <PinnedFooter footer={connectButton(props, submit)}>
      <form.Field name="code">
        {(field) => codeField(props, field, submit)}
      </form.Field>
      <Text role="secondary" tone="muted">
        {instruction}
      </Text>
    </PinnedFooter>
  );
}

const codeField = (
  props: TypeCodeViewProps,
  field: { state: { value: string }; handleChange: (value: string) => void },
  submit: () => void,
): React.JSX.Element => (
  <CodeField
    {...ticketBoxes}
    value={field.state.value}
    disabled={props.looking}
    /* oxlint-disable-next-line jsx-a11y/no-autofocus -- the page exists to take this code; it opens focused. */
    autoFocus
    onChangeText={field.handleChange}
    onSubmit={submit}
  />
);

const connectButton = (
  props: TypeCodeViewProps,
  submit: () => void,
): React.JSX.Element => (
  <Button
    label={props.looking ? 'Looking…' : 'Connect'}
    fullWidth
    disabled={props.looking}
    onPress={submit}
  />
);
