import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';

type Props = { reason: string; retry: () => void };

export function ListPageFailure({ reason, retry }: Props): ReactElement {
  return (
    <View className="items-start gap-1 px-4 py-3">
      <Text role="secondary" tone="danger" accessibilityLiveRegion="polite">
        {`Couldn't load more: ${reason}`}
      </Text>
      <Button label="Try again" size="sm" variant="secondary" onPress={retry} />
    </View>
  );
}
