import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { cn } from '#lib/generic/utils';
import { ButtonAdornment } from '#primitives/actions/button';
import { buttonInteractionProps } from '#primitives/actions/button';
import type { IconButtonProps } from './icon-button-props';
import { iconButtonClasses } from './icon-button-styles';

type IconAppearance = Pick<
  IconButtonProps,
  'icon' | 'iconRole' | 'iconClassName' | 'iconFilled' | 'iconWeight'
>;

type IconControlProps = Omit<IconButtonProps, keyof IconAppearance | 'badge'>;

type IconPresentation = Pick<
  IconControlProps,
  'size' | 'variant' | 'loading' | 'selected' | 'bleed'
>;

type PressableInput = ComponentProps<typeof Pressable>;

interface IconDrawing {
  pressable: PressableInput;
  adornment: ComponentProps<typeof ButtonAdornment>;
}

export function IconButton({
  badge,
  tone,
  iconTone,
  ...props
}: IconButtonProps): ReactElement {
  const drawing = iconDrawing(props);

  return (
    <Pressable {...drawing.pressable}>
      <ButtonAdornment {...withTone(drawing.adornment, tone, iconTone)} />
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
}: Omit<IconButtonProps, 'badge' | 'iconTone'>): IconDrawing {
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
  bleed,
  ...pressable
}: IconControlProps): PressableInput {
  return createIconPressable(
    { ...pressable, ...pressedAttribute(selected) },
    { size, variant, loading, selected, bleed },
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
    'size' | 'variant' | 'disabled' | 'className' | 'selected' | 'bleed'
  >,
): string {
  const { size, variant, className } = props;
  const disabled = !!props.disabled;
  const pressed = props.selected === true;
  const bleed = !!props.bleed;

  return cn(
    iconButtonClasses({ size, variant, disabled, pressed, bleed }),
    className,
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

function withTone(
  adornment: IconDrawing['adornment'],
  tone: IconButtonProps['tone'],
  iconTone: IconButtonProps['iconTone'],
): IconDrawing['adornment'] {
  return {
    ...adornment,
    textClass: cn(
      adornment.textClass,
      iconTone === 'muted' && 'text-muted-foreground',
      tone === 'danger' && 'text-danger',
    ),
  };
}
