import type * as React from 'react';
import { View } from 'react-native';
import { Text } from '#lib/generic/primitives/display/text/text';
import { Icon } from '../../../../lib/generic/symbols/icon';

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
