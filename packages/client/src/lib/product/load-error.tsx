import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#lib/generic/primitives/button';
import { Text } from '#lib/generic/primitives/text';

export interface LoadErrorProps {
  title: string;
  description: string;
  onRetry: () => void;
}

export function LoadError({
  title,
  description,
  onRetry,
}: LoadErrorProps): React.JSX.Element {
  return (
    <View role="alert" className="items-center gap-1 px-4 py-8">
      <Text role={'heading'} className="text-center">
        {title}
      </Text>
      <Text role="secondary" className="max-w-60 text-center">
        {description}
      </Text>
      <View className="pt-3">
        <Button variant="outline" size="sm" onPress={onRetry}>
          <Text>Retry</Text>
        </Button>
      </View>
    </View>
  );
}
