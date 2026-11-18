import { Button } from '@repo/kit/primitives/actions/button';
import type * as React from 'react';
import type { ComposerVoiceElsewhere } from './composer-types';

export const callPointerId = 'composer-call-pointer';

// The call runs in another Session: the voice button's slot says where, and takes the person there.
const pointerProps = (
  elsewhere: ComposerVoiceElsewhere,
): React.ComponentProps<typeof Button> => ({
  testID: callPointerId,
  variant: 'secondary',
  size: 'sm',
  label: `Call in ${elsewhere.title}`,
  onPress: elsewhere.onOpen,
});

export function ComposerCallPointer({
  elsewhere,
}: {
  elsewhere: ComposerVoiceElsewhere | undefined;
}): React.JSX.Element | null {
  return elsewhere ? <Button {...pointerProps(elsewhere)} /> : null;
}
