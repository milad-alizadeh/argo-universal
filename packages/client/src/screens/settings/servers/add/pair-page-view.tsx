import { Button, type ButtonProps } from '@repo/kit/primitives/actions/button';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type * as React from 'react';
import { type PairPageKind, pairCopy } from './pair-copy';

export interface PairPageViewProps {
  kind: PairPageKind;
  // The discovery name the code carried, for the pages that must say which computer they mean.
  serverName: string;
  // The page's one action: Cancel while it waits, then scan again or try again. The way back is the header's.
  onAction: () => void;
}

/*
 * One page of Add a Server that says where it stands and gives the owner the one way on. The same page draws the wait and every way it can end (ADR-0045).
 */
export function PairPageView(props: PairPageViewProps): React.JSX.Element {
  const copy = pairCopy(props.kind, props.serverName);

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

// Cancelling the wait is quiet beside the way on that an ended page offers.
const actionOf = (
  props: PairPageViewProps,
  label: string,
): React.ReactElement<ButtonProps> => (
  <Button
    label={label}
    variant={props.kind === 'waiting' ? 'text' : 'primary'}
    onPress={props.onAction}
  />
);
