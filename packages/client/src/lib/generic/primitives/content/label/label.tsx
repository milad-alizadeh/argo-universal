import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type { LabelProps } from './label-props';

export function Label(props: LabelProps): ReactElement {
  const tone = props.tone ?? 'muted';

  return (
    <View
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
      className="shrink-0 flex-row items-center gap-1.5"
    >
      <Icon name={props.icon} role="secondary" tone={tone} />
      <Text role="secondary" tone={tone} numberOfLines={1}>
        {props.text}
      </Text>
    </View>
  );
}
