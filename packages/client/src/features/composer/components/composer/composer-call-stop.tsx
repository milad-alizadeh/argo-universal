import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import type * as React from 'react';
import type { ComposerProps } from './composer-types';

export const callStopButtonId = 'composer-call-stop';

type CallStopLayout = {
  props: Pick<ComposerProps, 'disabled' | 'onStop'>;
};

// Stop beside End: a Muted circle like the mutes, drawn with the filled square the Composer's own Stop uses. It stops the Turn, never the call.
export function ComposerCallStop({ props }: CallStopLayout): React.JSX.Element {
  return (
    <IconButton
      variant="secondary"
      size="sm"
      control
      testID={callStopButtonId}
      accessibilityLabel="Stop"
      icon="stop"
      disabled={props.disabled}
      onPress={(): void => props.onStop?.()}
    />
  );
}
