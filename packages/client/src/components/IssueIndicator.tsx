import { TicketIcon } from 'phosphor-react-native';
import { View } from 'react-native';
import { Text } from '#primitives/text';
import { Icon } from './Icon';

export interface IssueIndicatorProps {
  number: number;
}

export function IssueIndicator({ number }: IssueIndicatorProps) {
  return (
    <View
      accessibilityLabel={`Issue #${number}`}
      className="flex-row items-center gap-1"
    >
      <Icon
        as={TicketIcon}
        className="size-3.5 shrink-0 text-muted-foreground"
      />
      <Text className="text-xs font-normal leading-4 text-muted-foreground">
        #{number}
      </Text>
    </View>
  );
}
