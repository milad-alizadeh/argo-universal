import type { ReactElement } from 'react';
import { Pressable } from 'react-native';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';

// Radix's Trigger hands its child the anchor ref and popup state; dropping the ref leaves the popover unplaced.
type Anchor = Pick<
  React.ComponentProps<typeof Pressable>,
  'ref' | 'aria-expanded'
> & {
  'aria-haspopup'?: 'dialog';
  'aria-controls'?: string;
};

type TriggerProps = Anchor & {
  title: string;
  summary: string;
  disabled?: boolean;
  onPress?: () => void;
};

/*
 * The web `page` picker's value, drawn as the borderless select's: the chosen label and the up-down chevron, which a
 * picker whose value changes in place keeps (ADR-0042). It opens the popover or Sheet.
 */
export function PageTrigger(props: TriggerProps): ReactElement {
  return (
    <Pressable {...triggerProps(props)}>
      <Text role="body">{props.summary}</Text>
      <Icon
        name="chevron-up-down"
        size="sm"
        aria-hidden
        className="text-tertiary"
      />
    </Pressable>
  );
}

type Attributes = React.ComponentProps<typeof Pressable> & Anchor;

const triggerProps = (props: TriggerProps): Attributes => ({
  ref: props.ref,
  'aria-haspopup': props['aria-haspopup'],
  'aria-expanded': props['aria-expanded'],
  'aria-controls': props['aria-controls'],
  role: 'button',
  accessibilityLabel: `${props.title}, ${props.summary}`,
  disabled: props.disabled,
  onPress: props.onPress,
  className: triggerClassName,
});

const triggerClassName =
  'flex h-8 flex-row items-center gap-1.5 rounded-control pl-2 web:hover:bg-hover web:focus-visible:outline-2 web:focus-visible:outline-focus web:w-fit web:whitespace-nowrap web:outline-none web:disabled:cursor-not-allowed';
