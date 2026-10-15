import type * as React from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/display/icon';
import { Text } from '#primitives/display/text';

export interface IssueIndicatorProps {
  number: number;
}

export function IssueIndicator({
  number,
}: IssueIndicatorProps): React.JSX.Element {
  return (
    <View
      accessibilityLabel={`Issue #${number}`}
      className="flex-row items-center gap-1.5"
    >
      <IssueIcon />
      <Text role="secondary">#{number}</Text>
    </View>
  );
}

function IssueIcon(): React.JSX.Element {
  return (
    <Icon
      role="secondary"
      name="issue"
      className="shrink-0 text-muted-foreground"
    />
  );
}
