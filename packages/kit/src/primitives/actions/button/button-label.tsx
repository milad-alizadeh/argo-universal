import { Row, Text } from '@expo/ui';
import { buttonDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import type { ColorValue } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { NativeIcon } from '../../../symbols/native-icon';
import type { ButtonProps } from './button';
import { type LabelColor, labelColors } from './button-labels';
import { sizes, variantOf, widthOf } from './button-layout';

/*
 * Expo UI's documented custom content: its Icon (in a square slot) before its Text, the Text in the variant's colour, since the web's
 * Text draws in the foreground colour and Expo has no danger look.
 */
export function ButtonLabel(props: ButtonProps): ReactElement {
  const color = useNativeTheme().colors[labelColor(props)];
  const width = widthOf(props);

  return (
    <Row spacing={6} alignment="center" modifiers={[...width.label]}>
      {width.edge}
      {props.icon && <LeadingIcon {...props} icon={props.icon} color={color} />}
      <Text textStyle={{ color }}>{props.label}</Text>
      {width.edge}
    </Row>
  );
}

function LeadingIcon(
  props: ButtonProps & { icon: IconSymbol; color: ColorValue | undefined },
): ReactElement | null {
  return (
    <NativeIcon
      name={props.icon}
      size={sizes[props.size ?? buttonDefaults.size].iconSize}
      color={props.color}
      slot
    />
  );
}

const labelColor = (props: ButtonProps): LabelColor =>
  labelColors[`${props.disabled ?? false}`][variantOf(props)];
