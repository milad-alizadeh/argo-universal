import { Button, type ButtonProps } from '@repo/kit/primitives/actions/button';
import { PinnedFooter } from '@repo/kit/primitives/scaffolds/pinned-footer';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type * as React from 'react';
import {
  type EndedKind,
  type PairPageKind,
  type PairWay,
  pairCopy,
} from './pair-copy';
import { ScannerFrame } from './scanner-frame';
import { WaitingAlert } from './waiting-alert';

export interface PairPageViewProps {
  kind: PairPageKind;
  // The discovery name the code carried, for the pages that must say which computer they mean.
  serverName: string;
  // Whether the code was scanned or typed, for the pages whose words name the camera.
  way?: PairWay;
  // The page's one action: Cancel while it waits, then scan again or try again. The way back is the header's.
  onAction: () => void;
}

/*
 * One page of Add a Server that says where it stands and gives the owner the one way on. The same page draws the wait and every way it can end (ADR-0045).
 */
export function PairPageView(props: PairPageViewProps): React.JSX.Element {
  return props.kind === 'waiting' ? (
    <WaitingScreen {...props} />
  ) : (
    <EndedScreen {...props} kind={props.kind} />
  );
}

// The wait is a card over the scanner's dark frame; the camera itself is the scan page's, which this stands in for.
function WaitingScreen(props: PairPageViewProps): React.JSX.Element {
  return (
    <Screen title="Add a Server">
      <PinnedFooter footer={null}>
        <ScannerFrame />
      </PinnedFooter>
      <WaitingAlert {...props} />
    </Screen>
  );
}

function EndedScreen(
  props: PairPageViewProps & { kind: EndedKind },
): React.JSX.Element {
  const copy = pairCopy(props.kind, props.serverName, props.way);

  return (
    <Screen title="Add a Server">
      <EmptyState
        icon={copy.icon}
        title={copy.title}
        description={copy.description}
        action={actionOf(props, copy.action)}
      />
    </Screen>
  );
}

const actionOf = (
  props: PairPageViewProps,
  label: string,
): React.ReactElement<ButtonProps> => (
  <Button label={label} onPress={props.onAction} />
);
