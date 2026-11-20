import { IconButton } from '@repo/kit/primitives/actions/icon-button';
import { Tooltip } from '@repo/kit/primitives/overlays/tooltip';
import { StatusDot } from '@repo/kit/primitives/status/status-dot';
import type * as React from 'react';
import { View } from 'react-native';
import type { ComposerConversationElsewhere } from './composer-types';

export const callPointerId = 'composer-call-pointer';

// The voice button's own look: Send's circle with the voice bars.
const pointerProps = (
  elsewhere: ComposerConversationElsewhere,
): React.ComponentProps<typeof IconButton> => ({
  testID: callPointerId,
  accessibilityLabel: `Call in ${elsewhere.title}`,
  icon: 'voice-bars',
  variant: 'primary',
  size: 'sm',
  control: true,
  onPress: elsewhere.onOpen,
});

// A live call, shown as the running Session's dot on the button's corner.
function LiveDot(): React.JSX.Element {
  return (
    <View className="pointer-events-none absolute -top-0.5 -right-0.5">
      <StatusDot tone="success" pulse />
    </View>
  );
}

/*
 * The call runs in another Session: in the voice button's place, the same round button with a live dot, which takes
 * the person to the call. It names the call only in its tooltip and spoken label.
 */
export function ComposerCallPointer({
  elsewhere,
}: {
  elsewhere: ComposerConversationElsewhere;
}): React.JSX.Element {
  const props = pointerProps(elsewhere);

  return (
    <View>
      <Tooltip label={props.accessibilityLabel}>
        <IconButton {...props} />
      </Tooltip>
      <LiveDot />
    </View>
  );
}
