import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import type { LabelProps } from './label-props';

const row = 'shrink-0 flex-row items-center gap-1.5';

const sidebarRow = 'shrink-0 flex-row items-center gap-1';

export function Label(props: LabelProps): ReactElement {
  const tone = props.tone ?? 'muted';

  return (
    <View
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
      className={props.sidebar ? sidebarRow : row}
    >
      <LabelIcon icon={props.icon} tone={tone} />
      <LabelText {...props} tone={tone} />
    </View>
  );
}

type LabelTextProps = Pick<LabelProps, 'text' | 'emphasized'> & {
  tone: NonNullable<LabelProps['tone']>;
};

// A sidebar row's leading item, such as a PR's number, is medium.
const labelWeight = (emphasized?: boolean): string | undefined =>
  emphasized ? 'font-medium' : undefined;

function LabelText(props: LabelTextProps): ReactElement {
  return (
    <Text
      role="secondary"
      tone={props.tone}
      numberOfLines={1}
      className={labelWeight(props.emphasized)}
    >
      {props.text}
    </Text>
  );
}

// A text-only Label has no icon, so the row's gap never applies.
function LabelIcon(
  props: Pick<LabelProps, 'icon'> & { tone: NonNullable<LabelProps['tone']> },
): ReactElement | null {
  if (!props.icon) return null;

  return <Icon name={props.icon} role="secondary" tone={props.tone} />;
}
