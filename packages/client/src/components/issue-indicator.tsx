import { TicketIcon } from 'phosphor-react-native';
import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { Icon } from '../lib/icon';

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
      <Icon as={TicketIcon} className="shrink-0 text-muted-foreground" />
      <Text className="type-secondary">#{number}</Text>
    </View>
  );
}
