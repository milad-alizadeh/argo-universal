import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ButtonAdornment } from '../button/button-adornment';
import { buttonInteractionProps } from '../button/button-state';
import type { IconButtonProps } from './icon-button-props';
import { iconButtonClasses } from './icon-button-styles';

type IconAppearance = Pick<
  IconButtonProps,
  'icon' | 'iconRole' | 'iconClassName' | 'filled' | 'iconWeight'
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
  iconRole,
  iconClassName,
  filled,
  iconWeight,
  ...props
}: IconButtonProps): IconDrawing {
  const appearance = { icon, iconRole, iconClassName, filled, iconWeight };
  return createIconDrawing(props, appearance);
}

function createIconDrawing(
  props: IconControlProps,
  appearance: IconAppearance,
): IconDrawing {
  return {
    pressable: iconPressableProps(props),
    adornment: iconAdornment(props, appearance),
  };
}

function iconAdornment(
  props: IconControlProps,
  appearance: IconAppearance,
): IconDrawing['adornment'] {
  return {
    icon: appearance.icon,
    role: appearance.iconRole ?? 'control',
    filled: appearance.filled,
    weight: appearance.iconWeight,
    loading: props.loading,
    textClass: iconTextClass({ ...props, ...appearance }),
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
    // Android fades each child on its own, so a dimmed filled disc would show through its glyph; iOS fades the whole button.
    needsOffscreenAlphaCompositing: presentation.variant === 'filled',
    className: iconContainerClass({ ...pressable, ...presentation }),
  };
}

function iconContainerClass(
  props: Pick<
    IconButtonProps,
    'size' | 'variant' | 'disabled' | 'className' | 'aria-pressed'
  >,
): string {
  const { size, variant, className } = props;
  const disabled = !!props.disabled;
  const pressed = props['aria-pressed'] === true;
  return cn(iconButtonClasses({ size, variant, disabled, pressed }), className);
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
