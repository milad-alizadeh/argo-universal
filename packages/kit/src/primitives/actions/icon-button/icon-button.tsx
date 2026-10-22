import { useContext, type ComponentProps, type ReactElement } from 'react';
import { Pressable } from 'react-native';
import { cn } from '#kit/utils';
import {
  ButtonAdornment,
  buttonInteractionProps,
} from '#primitives/actions/pressable';
import { IconButtonBleed } from './icon-button-bleed';
import type { IconButtonProps } from './icon-button-props';
import {
  iconButtonClasses,
  iconSpinnerClass,
  iconToneTextClass,
} from './icon-button-styles';

type IconAppearance = Pick<
  IconButtonProps,
  | 'icon'
  | 'iconSource'
  | 'iconRole'
  | 'iconClassName'
  | 'iconFilled'
  | 'iconWeight'
>;

type IconControlProps = Omit<IconButtonProps, keyof IconAppearance | 'badge'>;

type IconPresentation = Pick<
  IconControlProps,
  'size' | 'variant' | 'loading' | 'selected' | 'bleed' | 'corners'
>;

type PressableInput = ComponentProps<typeof Pressable>;

interface IconDrawing {
  pressable: PressableInput;
  adornment: ComponentProps<typeof ButtonAdornment>;
}

export function IconButton({ badge, ...props }: IconButtonProps): ReactElement {
  const bleed = useContext(IconButtonBleed);
  const drawing = iconDrawing({ ...props, bleed: props.bleed ?? bleed });

  return (
    <Pressable {...drawing.pressable}>
      <ButtonAdornment {...drawing.adornment} />
      {badge}
    </Pressable>
  );
}

function iconDrawing({
  icon,
  iconSource,
  iconRole,
  iconClassName,
  iconFilled,
  iconWeight,
  ...props
}: Omit<IconButtonProps, 'badge'>): IconDrawing {
  const appearance = { icon, iconRole, iconClassName, iconFilled, iconWeight };

  return createIconDrawing(props, { ...appearance, iconSource });
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
    source: appearance.iconSource,
    role: appearance.iconRole ?? 'control',
    filled: appearance.iconFilled,
    weight: appearance.iconWeight,
    loading: props.loading,
    textClass: iconTextClass({ ...props, ...appearance }),
    spinnerClass: iconSpinnerClass(props),
  };
}

function iconPressableProps({
  tone: _tone,
  iconTone: _iconTone,
  ...props
}: IconControlProps): PressableInput {
  const { size, variant, loading, selected, bleed, corners, ...pressable } =
    props;

  return createIconPressable(
    { ...pressable, ...pressableState(pressable.disabled, selected) },
    { size, variant, loading, selected, bleed, corners },
  );
}

// Pressable takes no null `disabled`.
interface PressableState {
  disabled: boolean | undefined;
  'aria-pressed'?: boolean;
}

function pressableState(
  disabled: boolean | null | undefined,
  selected?: boolean,
): PressableState {
  return { disabled: disabled ?? undefined, ...pressedAttribute(selected) };
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

type ContainerProps = Pick<
  IconButtonProps,
  | 'size'
  | 'variant'
  | 'disabled'
  | 'className'
  | 'selected'
  | 'bleed'
  | 'corners'
>;

function iconContainerClass(props: ContainerProps): string {
  const { size, variant, corners, className } = props;
  const disabled = !!props.disabled;
  const pressed = props.selected === true;
  const bleed = !!props.bleed;

  return cn(
    iconButtonClasses({ size, variant, disabled, pressed, bleed, corners }),
    className,
  );
}

function iconTextClass(
  props: Pick<
    IconButtonProps,
    'variant' | 'iconClassName' | 'tone' | 'iconTone'
  >,
): string {
  return cn(
    props.variant === 'filled' ? 'text-primary-foreground' : 'text-foreground',
    props.iconClassName,
    iconToneTextClass(props),
  );
}

export type { IconButtonProps } from './icon-button-props';
