import { SplitButton } from '@repo/kit/primitives/actions/split-button';
import { Callout, CalloutButton } from '@repo/kit/primitives/status/callout';
import { SizeClass } from '@repo/kit/size-class/size-class';
import type * as React from 'react';
import { useState } from 'react';
import type {
  AuthCalloutMethod,
  AuthCalloutProps,
} from '../../types/session-callout';

export type { AuthCalloutProps } from '../../types/session-callout';

const chooseMethodHint = 'Choose one of the following authentication options:';

// Zed's sign-in callout: one action per method, the first the accent; while one runs, every Device can cancel it.
export function AuthCallout(props: AuthCalloutProps): React.JSX.Element {
  if (!props.pending) return <MethodsCallout {...props} />;

  const pending = <PendingCallout {...props} />;

  // On a phone the terminal's sheet takes the pending callout's place.
  return props.terminal ? (
    <SizeClass only="wide">{pending}</SizeClass>
  ) : (
    pending
  );
}

function MethodsCallout(props: AuthCalloutProps): React.JSX.Element {
  return (
    <Callout
      title={`Authenticate to ${props.agentName}`}
      description={authHint(props)}
      actions={<MethodActions {...props} />}
    />
  );
}

// A failed attempt says why; otherwise the hint to choose, or the Agent's own words.
const authHint = (props: AuthCalloutProps): string | undefined =>
  props.failure ??
  (props.methods.length > 1 ? chooseMethodHint : props.message);

function PendingCallout(props: AuthCalloutProps): React.JSX.Element {
  return (
    <Callout
      busy
      title={`Authenticating to ${props.agentName}…`}
      actions={<CancelButton onCancel={props.onCancel} />}
    />
  );
}

function CancelButton({
  onCancel,
}: Pick<AuthCalloutProps, 'onCancel'>): React.JSX.Element {
  return (
    <CalloutButton variant="secondary" label="Cancel" onPress={onCancel} />
  );
}

// Never more than two controls: several methods share one split button, whose menu changes its face without signing in.
export function MethodActions(
  props: AuthCalloutProps,
): React.JSX.Element | null {
  const [first, second] = props.methods;

  if (!first) return null;

  return second ? (
    <MethodSplit {...props} firstId={first.id} />
  ) : (
    <MethodButton method={first} onAuthenticate={props.onAuthenticate} />
  );
}

type MethodButtonProps = Pick<AuthCalloutProps, 'onAuthenticate'> & {
  method: AuthCalloutMethod;
};

function MethodButton(props: MethodButtonProps): React.JSX.Element {
  const { method, onAuthenticate } = props;

  return (
    <CalloutButton
      label={method.name}
      onPress={() => onAuthenticate(method.id)}
    />
  );
}

type MethodSplitProps = AuthCalloutProps & { firstId: string };

const splitDefaults = { primary: true, menuLabel: 'Authentication options' };

const methodOptions = (
  methods: readonly AuthCalloutMethod[],
): { value: string; label: string }[] =>
  methods.map(({ id, name }) => ({ value: id, label: name }));

function MethodSplit(props: MethodSplitProps): React.JSX.Element {
  const [chosenId, setChosenId] = useState(props.firstId);

  return (
    <SplitButton
      {...splitDefaults}
      label={chosenName(props.methods, chosenId)}
      fullWidth="narrow"
      options={methodOptions(props.methods)}
      value={chosenId}
      onValueChange={setChosenId}
      onPress={() => props.onAuthenticate(chosenId)}
    />
  );
}

// The button shows the chosen method's name.
const chosenName = (
  methods: readonly AuthCalloutMethod[],
  id: string,
): string => methods.find((method) => method.id === id)?.name ?? '';
