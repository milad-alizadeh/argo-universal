import {
  FilledIconButton,
  IconButton as ComposeIconButton,
  FilledTonalIconButton,
} from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import type { ComponentProps, ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { Host } from '#primitives/native/host';
import { NativeIcon } from '../../../symbols/native-icon';
import type { IconButtonProps } from './icon-button';
import { androidGlyphOf, androidModifiersOf } from './icon-button-android-size';
import { sizeOf, variantOf } from './icon-button-defaults';

type Variant = NonNullable<IconButtonProps['variant']>;

type ComposeProps = Omit<ComponentProps<typeof ComposeIconButton>, 'children'>;

const controls = {
  primary: FilledIconButton,
  secondary: FilledTonalIconButton,
  ghost: ComposeIconButton,
} as const satisfies Record<Variant, typeof ComposeIconButton>;

// Compose's own icon buttons: a circle of exactly the size modifier, which a Compose Button's padding and minimum width cannot give.
export function IconButton(props: IconButtonProps): ReactElement {
  return (
    <Host seed="primary" matchContents>
      <ComposeControl {...props} />
    </Host>
  );
}

function ComposeControl(props: IconButtonProps): ReactElement {
  const Control = controls[variantOf(props)];

  return (
    <Control {...useComposeProps(props)}>
      <ControlIcon {...props} />
    </Control>
  );
}

function ControlIcon(props: IconButtonProps): ReactElement {
  return (
    <NativeIcon
      name={props.icon}
      size={androidGlyphOf(sizeOf(props))}
      filled={props.selected ?? false}
      color={undefined}
    />
  );
}

const contentRoles = {
  primary: 'primaryForeground',
  secondary: 'foreground',
  ghost: 'primary',
} as const satisfies Record<Variant, string>;

const containerRoles = {
  primary: 'primary',
  secondary: undefined,
  ghost: undefined,
} as const satisfies Record<Variant, string | undefined>;

function useColors(variant: Variant): NonNullable<ComposeProps['colors']> {
  const { colors } = useNativeTheme();
  const container = containerRoles[variant];

  return {
    contentColor: colors[contentRoles[variant]],
    containerColor: container && colors[container],
  };
}

function useComposeProps(props: IconButtonProps): ComposeProps {
  const colors = useColors(variantOf(props));

  return {
    onClick: props.onPress,
    enabled: !props.disabled,
    colors,
    modifiers: [
      ...androidModifiersOf(sizeOf(props)),
      semantics({ contentDescription: props.accessibilityLabel }),
    ],
  };
}
