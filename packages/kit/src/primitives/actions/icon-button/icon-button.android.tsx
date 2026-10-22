import {
  FilledIconButton,
  IconButton as ComposeIconButton,
  FilledTonalIconButton,
} from '@expo/ui/jetpack-compose';
import { semantics } from '@expo/ui/jetpack-compose/modifiers';
import { iconButtonDefaults } from '@repo/contracts/kit-tokens';
import type { ComponentProps, ReactElement } from 'react';
import { useNativeTheme } from '#kit/native-theme';
import { Host } from '#primitives/native/host';
import { NativeIcon } from '../../../symbols/native-icon';
import type { IconButtonProps } from './icon-button';
import { sizes } from './icon-button-layout';

type Variant = NonNullable<IconButtonProps['variant']>;

type ComposeProps = Omit<ComponentProps<typeof ComposeIconButton>, 'children'>;

const controls = {
  primary: FilledIconButton,
  secondary: FilledTonalIconButton,
  ghost: ComposeIconButton,
} as const satisfies Record<Variant, typeof ComposeIconButton>;

// Compose's own icon buttons: a circle of exactly the size modifier, which a Compose Button's padding and minimum width cannot give.
export function IconButton(props: IconButtonProps): ReactElement {
  const Control = controls[props.variant ?? iconButtonDefaults.variant];
  const size = sizes[props.size ?? iconButtonDefaults.size];

  return (
    <Host seed="primary" matchContents>
      <Control {...useComposeProps(props)}>
        <NativeIcon
          name={props.icon}
          role={size.iconRole}
          filled={props.selected ?? false}
          color={undefined}
        />
      </Control>
    </Host>
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
  const colors = useColors(props.variant ?? iconButtonDefaults.variant);

  return {
    onClick: props.onPress,
    enabled: !props.disabled,
    colors,
    modifiers: [
      ...sizes[props.size ?? iconButtonDefaults.size].androidModifiers,
      semantics({ contentDescription: props.accessibilityLabel }),
    ],
  };
}
