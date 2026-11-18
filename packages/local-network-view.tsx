import { discoveryProtocol, discoveryServiceType } from '@repo/contracts';
import { Button, type ButtonProps } from '@repo/kit/primitives/actions/button';
import { PinnedFooter } from '@repo/kit/primitives/scaffolds/pinned-footer';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type * as React from 'react';
import { type LocalNetworkKind, localNetworkCopy } from './local-network-copy';

export interface LocalNetworkViewProps {
  kind: LocalNetworkKind;
  // The Server the owner was looking for, for the page that says what Local Network is needed for.
  serverName: string;
  onOpenSettings: () => void;
  // The way out to the Server list; a build that cannot browse has nothing else to offer.
  onBack: () => void;
  // Looks again once the owner has answered iOS.
  onTryAgain: () => void;
}

const service = `_${discoveryServiceType}._${discoveryProtocol}`;

/*
 * The page for a phone that cannot look at the network, one page for each reason iOS can give: Local Network was turned off, the build never asked for it, or the question has not been answered. Each tells the owner where the setting is, in a note, and gives the way on.
 */
export function LocalNetworkView(
  props: LocalNetworkViewProps,
): React.JSX.Element {
  const copy = localNetworkCopy(props.kind, props.serverName, service);

  return (
    <Screen title="Add a Server">
      <PinnedFooter footer={footerOf(props)}>
        <EmptyState {...copy} busy={props.kind === 'undetermined'} />
      </PinnedFooter>
    </Screen>
  );
}

const button = (label: string, onPress: () => void): React.JSX.Element => (
  <Button label={label} fullWidth onPress={onPress} />
);

const textButton = (
  label: string,
  onPress: () => void,
): React.ReactElement<ButtonProps> => (
  <Button label={label} variant="text" fullWidth onPress={onPress} />
);

// A build that cannot browse has no setting to open, so back is all it offers; the other two open Settings and then go back, or look again.
const footerOf = (props: LocalNetworkViewProps): React.JSX.Element =>
  props.kind === 'misconfigured' ? (
    button('Back to Servers', props.onBack)
  ) : (
    <>
      {button('Open Settings', props.onOpenSettings)}
      {props.kind === 'denied'
        ? textButton('Back to Servers', props.onBack)
        : textButton('Try again', props.onTryAgain)}
    </>
  );
