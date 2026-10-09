import type * as React from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/button';
import { Text } from '#primitives/text';

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
      <Text className="text-center text-sm font-medium leading-5">{title}</Text>
      <Text className="max-w-60 text-center text-xs leading-4 text-muted-foreground">
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
