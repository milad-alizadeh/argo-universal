import { Button } from '@repo/kit/primitives/actions/button';
import { Text } from '@repo/kit/primitives/content/text';
import type * as React from 'react';
import { View } from 'react-native';

export interface StoppedTurnCalloutProps {
  // Why the Turn stopped, in the Server's or the Agent's words.
  reason?: string;
  onRetry: () => void;
}

const title = 'The Agent stopped early';

const cardClass =
  'mb-2 w-full flex-row items-center gap-3 rounded-2xl bg-card py-2 pr-2 pl-4 shadow-card ios:pr-4 wide:mb-0 wide:rounded-none wide:bg-transparent wide:p-3 wide:shadow-none';

function StoppedTurnText({
  reason,
}: Pick<StoppedTurnCalloutProps, 'reason'>): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 gap-0.5">
      <Text tone="danger">{title}</Text>
      {reason && (
        <Text role="secondary" tone="muted">
          {reason}
        </Text>
      )}
    </View>
  );
}

/*
 * A Turn that ended in an error. Retry sends its prompt again; nothing else ever resends one.
 * A card of its own above a phone's Composer, leaving it to type in; a wide window's tray is already the surface.
 */
export function StoppedTurnCallout(
  props: StoppedTurnCalloutProps,
): React.JSX.Element {
  return (
    <View role="alert" accessibilityLabel={title} className={cardClass}>
      <StoppedTurnText reason={props.reason} />
      <Button label="Retry" variant="text" onPress={props.onRetry} />
    </View>
  );
}
