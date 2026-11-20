import { Row, Text } from '@expo/ui';
import { buttonDefaults } from '@repo/contracts/kit-tokens';
import type { ComponentProps, ReactElement } from 'react';
import type { ColorValue } from 'react-native';
import { useNativeTheme } from '#kit/native-theme';
import { useTextStyle } from '#primitives/content/text';
import type { IconSymbol } from '../../../symbols/icon-symbol';
import { NativeIcon } from '../../../symbols/native-icon';
import type { ButtonProps } from './button';
import { type LabelColor, labelColors } from './button-labels';
import {
  buttonLabelModifiers,
  sizes,
  variantOf,
  widthOf,
} from './button-layout';

/*
 * Expo UI's documented custom content: its Icon before its Text, the Text in the variant's colour, since the web's
 * Text draws in the foreground colour and Expo has no danger look.
 */
export function ButtonLabel(props: ButtonProps): ReactElement {
  const textStyle = useButtonTextStyle(props);
  const width = widthOf(props);

  return (
    <Row spacing={6} alignment="center" modifiers={buttonLabelModifiers(props)}>
      {width.edge}
      {props.icon && (
        <LeadingIcon {...props} icon={props.icon} color={textStyle.color} />
      )}
      <Text textStyle={textStyle}>{props.label}</Text>
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
    />
  );
}

const labelColor = (props: ButtonProps): LabelColor =>
  labelColors[`${props.disabled ?? false}`][variantOf(props)];

function useButtonTextStyle(
  props: ButtonProps,
): NonNullable<ComponentProps<typeof Text>['textStyle']> {
  const body = useTextStyle('body');
  const color = useNativeTheme().colors[labelColor(props)];

  if (props.control)
    return { fontSize: body.fontSize, lineHeight: body.lineHeight, color };

  if (props.size === 'xs') return { fontSize: 12, lineHeight: 16, color };

  return { color };
}
