import { labelDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { Icon, SecondaryGlyphs } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { cn } from '../../../utils';
import type { LabelProps } from './label-props';

const row = 'flex-row items-center gap-1.5';

const sidebarRow = 'flex-row items-center gap-1';

const labelClass = (props: LabelProps): string =>
  cn(
    props.sidebar ? sidebarRow : row,
    props.shrinks ? 'min-w-0 shrink' : 'shrink-0',
  );

export function Label(props: LabelProps): ReactElement {
  const tone = props.tone ?? labelDefaults.tone;

  return (
    <View
      accessibilityLabel={props.accessibilityLabel}
      testID={props.testID}
      className={labelClass(props)}
    >
      <LabelIcon icon={props.icon} tone={tone} />
      <LabelText {...props} tone={tone} />
    </View>
  );
}

type LabelTextProps = Pick<LabelProps, 'text' | 'emphasized' | 'shrinks'> & {
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
      className={cn(labelWeight(props.emphasized), props.shrinks && 'shrink')}
    >
      {props.text}
    </Text>
  );
}

// A text-only Label has no icon, so the row's gap never applies. Its icon sits beside Secondary text, so it keeps the desktop size on a phone.
function LabelIcon(
  props: Pick<LabelProps, 'icon'> & { tone: NonNullable<LabelProps['tone']> },
): ReactElement | null {
  if (!props.icon) return null;

  return (
    <SecondaryGlyphs>
      <Icon name={props.icon} tone={props.tone} />
    </SecondaryGlyphs>
  );
}
