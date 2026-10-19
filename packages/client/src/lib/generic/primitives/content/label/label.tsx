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
      <LabelIcon icon={props.icon} tone={tone} />
      <Text role="secondary" tone={tone} numberOfLines={1}>
        {props.text}
      </Text>
    </View>
  );
}

// A text-only Label has no icon, so the row's gap never applies.
function LabelIcon(
  props: Pick<LabelProps, 'icon'> & { tone: NonNullable<LabelProps['tone']> },
): ReactElement | null {
  if (!props.icon) return null;

  return <Icon name={props.icon} role="secondary" tone={props.tone} />;
}
