import type { AgentAuthState } from '@repo/contracts';
import type * as React from 'react';
import { useState } from 'react';
import { Button } from '#primitives/buttons/button';
import { SplitButton } from '#primitives/buttons/split-button';
import { Callout } from '#primitives/display/callout';
import { useWide } from '../../../../lib/generic/use-wide/use-wide';

export type AuthCalloutMethod = Pick<
  AgentAuthState['methods'][number],
  'id' | 'name' | 'description'
>;

export interface AuthCalloutProps {
  agentName: string;
  // Agent and terminal methods, in the Agent's order.
  methods: readonly AuthCalloutMethod[];
  // The Agent's own words from `auth_required`, shown when there is one method.
  message?: string;
  // A sign-in is running, from this Device or another.
  pending: boolean;
  // The running method is a terminal: on a phone its sheet takes the callout's place.
  terminal?: boolean;
  onAuthenticate: (methodId: string) => void;
  onCancel: () => void;
}

const chooseMethodHint = 'Choose one of the following authentication options:';

// Zed's sign-in callout: one action per method, the first the accent; while one runs, every Device can cancel it.
export function AuthCallout(props: AuthCalloutProps): React.JSX.Element | null {
  const wide = useWide();

  if (!props.pending) return <MethodsCallout {...props} />;

  return terminalTakesPlace(props, wide) ? null : <PendingCallout {...props} />;
}

const terminalTakesPlace = (props: AuthCalloutProps, wide: boolean): boolean =>
  Boolean(props.terminal) && !wide;

function MethodsCallout(props: AuthCalloutProps): React.JSX.Element {
  return (
    <Callout
      title={`Authenticate to ${props.agentName}`}
      description={authHint(props)}
      actions={<MethodActions {...props} />}
    />
  );
}

const authHint = (props: AuthCalloutProps): string | undefined =>
  props.methods.length > 1 ? chooseMethodHint : props.message;

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
    <Button
      size="sm"
      fullWidth="narrow"
      variant="secondary"
      label="Cancel"
      onPress={onCancel}
    />
  );
}

// Never more than two controls: several methods share one split button, whose menu changes its face without signing in.
function MethodActions(props: AuthCalloutProps): React.JSX.Element | null {
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
    <Button
      size="sm"
      fullWidth="narrow"
      label={method.name}
      accessibilityLabel={method.description ?? method.name}
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
      narrow={!useWide()}
      label={methodName(props.methods, chosenId)}
      options={methodOptions(props.methods)}
      value={chosenId}
      onValueChange={setChosenId}
      onPress={() => props.onAuthenticate(chosenId)}
    />
  );
}

const methodName = (
  methods: readonly AuthCalloutMethod[],
  id: string,
): string => methods.find((method) => method.id === id)?.name ?? '';
