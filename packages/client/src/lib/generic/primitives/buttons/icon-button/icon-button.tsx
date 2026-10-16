import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ButtonAdornment } from '#primitives/buttons/button';
import { buttonInteractionProps } from '#primitives/buttons/button';
import type { IconButtonProps } from './icon-button-props';
import { iconButtonClasses } from './icon-button-styles';

type IconAppearance = Pick<
  IconButtonProps,
  'icon' | 'iconRole' | 'iconClassName' | 'iconFilled' | 'iconWeight'
>;

type IconControlProps = Omit<IconButtonProps, keyof IconAppearance | 'badge'>;

type IconPresentation = Pick<
  IconControlProps,
  'size' | 'variant' | 'loading' | 'selected'
>;

type PressableInput = ComponentProps<typeof Pressable>;

interface IconDrawing {
  pressable: PressableInput;
  adornment: ComponentProps<typeof ButtonAdornment>;
}

export function IconButton({
  badge,
  tone,
  ...props
}: IconButtonProps): ReactElement {
  const drawing = iconDrawing(props);

  return (
    <Pressable {...drawing.pressable}>
      <ButtonAdornment {...withTone(drawing.adornment, tone)} />
      {badge}
    </Pressable>
  );
}

function iconDrawing({
  icon,
  iconRole,
  iconClassName,
  iconFilled,
  iconWeight,
  ...props
}: Omit<IconButtonProps, 'badge'>): IconDrawing {
  const appearance = { icon, iconRole, iconClassName, iconFilled, iconWeight };

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
    filled: appearance.iconFilled,
    weight: appearance.iconWeight,
    loading: props.loading,
    textClass: iconTextClass({ ...props, ...appearance }),
  };
}

function iconPressableProps({
  size,
  variant,
  loading,
  selected,
  ...pressable
}: IconControlProps): PressableInput {
  return createIconPressable(
    { ...pressable, ...pressedAttribute(selected) },
    { size, variant, loading, selected },
  );
}

// The web reads a toggle's state from aria-pressed, which React Native's own types leave out.
function pressedAttribute(selected?: boolean): { 'aria-pressed'?: boolean } {
  return selected === undefined ? {} : { 'aria-pressed': selected };
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
    'size' | 'variant' | 'disabled' | 'className' | 'selected'
  >,
): string {
  const { size, variant, className } = props;
  const disabled = !!props.disabled;
  const pressed = props.selected === true;

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

function withTone(
  adornment: IconDrawing['adornment'],
  tone: IconButtonProps['tone'],
): IconDrawing['adornment'] {
  return {
    ...adornment,
    textClass: cn(adornment.textClass, tone === 'danger' && 'text-danger'),
  };
}
