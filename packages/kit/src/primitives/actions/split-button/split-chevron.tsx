import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { cn } from '#kit/utils';
import {
  type ButtonProps,
  buttonJoinedClasses,
  buttonWebClass,
  buttonWebStyle,
} from '#primitives/actions/button';
import { Chevron } from '#primitives/status/chevron';

interface ChevronProps {
  primary: boolean;
  size: NonNullable<ButtonProps['size']>;
  accessibilityLabel: string;
  disabled?: boolean;
}

type TriggerProps = ChevronProps &
  Omit<ComponentProps<typeof Pressable>, keyof ChevronProps>;

// Narrower than the acting segment is wide: a button's height across, so it reads as a square-ish tab.
const widths = { sm: 'w-8', md: 'w-10' } as const;

const glyphs = {
  true: 'text-primary-foreground',
  false: 'text-foreground',
} as const;

const keys = new Set(['primary', 'size', 'accessibilityLabel', 'disabled']);

// What the Menu's Radix trigger clones onto its child: handlers, aria state and a ref.
function overlayProps(props: TriggerProps): ComponentProps<typeof Pressable> {
  return Object.fromEntries(
    Object.entries(props).filter(([key]) => !keys.has(key)),
  );
}

const lookOf = (props: TriggerProps): ButtonProps => ({
  label: props.accessibilityLabel,
  variant: props.primary ? 'primary' : 'secondary',
  size: props.size,
  disabled: props.disabled,
});

const chevronClass = (props: TriggerProps): string =>
  cn(buttonWebClass, buttonJoinedClasses.end, 'px-0', widths[props.size]);

const glyphClass = (props: TriggerProps): string =>
  props.disabled ? 'text-foreground/38' : glyphs[`${props.primary}`];

/*
 * The split's chevron segment on the web: the Button's box, lit look and states, joined to the acting segment on its
 * start side. A Pressable element itself, so the menu's asChild trigger can pass its press handlers to it.
 */
export function SplitChevron(props: TriggerProps): ReactElement {
  return (
    <Pressable
      {...overlayProps(props)}
      accessibilityRole="button"
      accessibilityLabel={props.accessibilityLabel}
      disabled={props.disabled ?? false}
      className={chevronClass(props)}
      style={(state) => buttonWebStyle(lookOf(props), state)}
    >
      <Chevron direction="down" className={glyphClass(props)} />
    </Pressable>
  );
}
