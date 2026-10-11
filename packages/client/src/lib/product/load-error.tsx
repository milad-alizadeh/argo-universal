import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { Button } from '../generic/primitives/button';

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
        <Button variant="outline" size="sm" onPress={onRetry} label={'Retry'} />
      </View>
    </View>
  );
}
