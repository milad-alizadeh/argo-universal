import type { ComponentProps, ReactElement, ReactNode } from 'react';
import { contentActionClass } from '#primitives/actions/button';
import { Pressable } from '#primitives/actions/pressable';
import { ChipSurface, chipClassName } from './status-surface';
import { StatusText } from './status-text';

export interface ChipTriggerProps {
  label: string;
  accessibilityLabel?: string;
  tone?: 'danger' | 'muted';
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
}

/*
 * What the overlay it opens hands its trigger: press, hover and ARIA handlers and a ref. A Sheet or a popover takes
 * any element as its `trigger` and passes these to it, so a chip opens one the way MenuTrigger does.
 */
type OverlayHandlers = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'className' | 'style' | keyof ChipTriggerProps
>;

type TriggerProps = ChipTriggerProps & OverlayHandlers;

/*
 * A picker drawn as one of the Composer's own chips: the Subagents and Shells pills' surface, text and height, with
 * no chevron. A phone's Composer row has the width for the words or for the mark that opens them, not both, and the
 * pill already reads as something to press (owner, 2026-10-21).
 */
export function ChipTrigger(props: TriggerProps): ReactElement {
  return (
    <ChipSurface>
      <ChipPressable {...props} />
    </ChipSurface>
  );
}

function ChipPressable(props: TriggerProps): ReactElement {
  const { label, tone, leading, trailing } = props;

  return (
    <Pressable {...chipPressableProps(props)} role="button">
      {leading}
      <StatusText role="badge" className={toneClass(tone)}>
        {label}
      </StatusText>
      {trailing}
    </Pressable>
  );
}

const toneClass = (tone: ChipTriggerProps['tone']): string =>
  tone === 'danger' ? 'text-danger' : 'text-foreground';

const chipKeys = [
  'label',
  'accessibilityLabel',
  'tone',
  'leading',
  'trailing',
] as const;

// The overlay's handlers, without the chip's own props, as MenuTrigger separates them.
function overlayHandlers(props: TriggerProps): OverlayHandlers {
  const handlers: Partial<ChipTriggerProps> & OverlayHandlers = { ...props };

  for (const key of chipKeys) delete handlers[key];

  return handlers;
}

function chipPressableProps(
  props: TriggerProps,
): ComponentProps<typeof Pressable> {
  return {
    ...overlayHandlers(props),
    accessibilityLabel: props.accessibilityLabel ?? props.label,
    className: contentActionClass({
      variant: 'ghost',
      className: chipClassName,
      disabled: !!props.disabled,
    }),
  };
}
