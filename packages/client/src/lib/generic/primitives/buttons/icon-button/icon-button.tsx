import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ButtonAdornment } from '../button/button-adornment';
import { buttonInteractionProps } from '../button/button-state';
import type { IconButtonProps } from './icon-button-props';
import { iconButtonClasses } from './icon-button-styles';

type IconAppearance = Pick<
  IconButtonProps,
  'icon' | 'iconRole' | 'iconClassName' | 'filled'
>;
type IconControlProps = Omit<IconButtonProps, keyof IconAppearance>;
type IconPresentation = Pick<IconControlProps, 'size' | 'variant' | 'loading'>;
type PressableInput = ComponentProps<typeof Pressable>;
interface IconDrawing {
  pressable: PressableInput;
  adornment: ComponentProps<typeof ButtonAdornment>;
}

export function IconButton(props: IconButtonProps): ReactElement {
  const drawing = iconDrawing(props);
  return (
    <Pressable {...drawing.pressable}>
      <ButtonAdornment {...drawing.adornment} />
    </Pressable>
  );
}

function iconDrawing({
  icon,
  iconRole = 'control',
  iconClassName,
  filled,
  ...props
}: IconButtonProps): IconDrawing {
  return createIconDrawing(props, { icon, iconRole, iconClassName, filled });
}

function createIconDrawing(
  props: IconControlProps,
  appearance: IconAppearance,
): IconDrawing {
  return {
    pressable: iconPressableProps(props),
    adornment: {
      icon: appearance.icon,
      role: appearance.iconRole ?? 'control',
      filled: appearance.filled,
      loading: props.loading,
      textClass: iconTextClass({ ...props, ...appearance }),
    },
  };
}

function iconPressableProps({
  size,
  variant,
  loading,
  ...pressable
}: IconControlProps): PressableInput {
  return createIconPressable(pressable, { size, variant, loading });
}

function createIconPressable(
  pressable: PressableInput,
  presentation: IconPresentation,
): PressableInput {
  return {
    ...pressable,
    ...buttonInteractionProps({ ...pressable, loading: presentation.loading }),
    className: iconContainerClass({ ...pressable, ...presentation }),
  };
}

function iconContainerClass(
  props: Pick<
    IconButtonProps,
    'size' | 'variant' | 'disabled' | 'className' | 'aria-pressed'
  >,
): string {
  return cn(
    iconButtonClasses({
      size: props.size,
      variant: props.variant,
      disabled: !!props.disabled,
      pressed: props['aria-pressed'] === true,
    }),
    props.className,
  );
}

function iconTextClass(
  props: Pick<IconButtonProps, 'variant' | 'iconClassName'>,
): string {
  return cn(
    props.variant === 'filled' ? 'text-primary-foreground' : 'text-foreground',
    props.iconClassName,
  );
}

export type { IconButtonProps } from './icon-button-props';
