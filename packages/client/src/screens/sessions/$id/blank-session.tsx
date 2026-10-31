import { Button } from '@repo/kit/primitives/actions/button';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type * as React from 'react';
import { Screen } from '#lib/product/screen/screen';

type BlankSessionProps =
  | { state: 'opening' | 'failed' }
  | { state: 'missing'; onLeave: () => void };

// The Session page before there is a Session to draw: blank while it opens or after a failure the toast explains, and the Server's answer that no Session has the id.
export function BlankSession(props: BlankSessionProps): React.JSX.Element {
  return (
    <Screen edges={['bottom']}>
      {props.state === 'missing' && <MissingSession onLeave={props.onLeave} />}
    </Screen>
  );
}

function LeaveButton(props: { onPress: () => void }): React.JSX.Element {
  return <Button label="Back to Sessions" variant="secondary" {...props} />;
}

// The page carries its own way out, as a phone's header may have none.
function MissingSession(props: { onLeave: () => void }): React.JSX.Element {
  return (
    <EmptyState
      title="This Session doesn't exist"
      description="It may have been deleted."
      action={<LeaveButton onPress={props.onLeave} />}
    />
  );
}
