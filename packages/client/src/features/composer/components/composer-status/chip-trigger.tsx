import { contentActionClass } from '@repo/kit/primitives/actions/pressable';
import { Pressable } from '@repo/kit/primitives/actions/pressable';
import { cn } from '@repo/kit/utils';
import type { ComponentProps, ReactElement, ReactNode } from 'react';
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
 * A picker drawn as a pill of its own words: the chips' height and text, no chevron, and a flat tint rather than a
 * surface of its own. The Composer is already glass on iOS, so a chip's card and border would stand glass on glass
 * (owner, 2026-10-21).
 */
const pillClassName = 'h-6 py-0 px-2.5 gap-1.5 rounded-full bg-tint';

export function ChipTrigger(props: TriggerProps): ReactElement {
  const { label, tone, leading, trailing } = props;

  return (
    <Pressable {...chipPressableProps(props)} role="button">
      {leading}
      <StatusText
        role="badge"
        className={cn('wide-type:text-sm', toneClass(tone))}
      >
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
      className: pillClassName,
      disabled: !!props.disabled,
    }),
  };
}
