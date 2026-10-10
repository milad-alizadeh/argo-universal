import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/text';
import { Icon } from '../../../lib/generic/symbols/icon';

export interface IssueIndicatorProps {
  number: number;
}

export function IssueIndicator({
  number,
}: IssueIndicatorProps): React.JSX.Element {
  return (
    <View
      accessibilityLabel={`Issue #${number}`}
      className="flex-row items-center gap-1"
    >
      <Icon name="issue" className="shrink-0 text-muted-foreground" />
      <Text className="type-secondary">#{number}</Text>
    </View>
  );
}
