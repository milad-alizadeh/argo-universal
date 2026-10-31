import { Button } from '@repo/kit/primitives/actions/button';
import { Screen } from '@repo/kit/primitives/scaffolds/screen';
import { EmptyState } from '@repo/kit/primitives/status/empty-state';
import type * as React from 'react';

export interface NotFoundViewProps {
  onLeave: () => void;
}

function LeaveButton({ onLeave }: NotFoundViewProps): React.JSX.Element {
  return (
    <Button label="Back to Sessions" variant="secondary" onPress={onLeave} />
  );
}

// A path no route answers, such as a stale or mistyped link: the page says so and leads back to the Sessions list.
export function NotFoundView(props: NotFoundViewProps): React.JSX.Element {
  return (
    <Screen title="Not found">
      <EmptyState
        title="This page doesn't exist"
        description="The link may be out of date."
        action={<LeaveButton {...props} />}
      />
    </Screen>
  );
}
