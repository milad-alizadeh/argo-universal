import type { ReactElement, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '#kit/utils';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';
import { rowPressTargetClassName } from '#primitives/fields/field-row';

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
  // The row's title, drawn inside the trigger so the whole row presses.
  lead: ReactNode;
  // In a popover the row opens its choices beside it, so it ends in the right chevron of a row that opens a page.
  disclosure?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

/*
 * The web `page` picker's row, drawn as the borderless select's: the title, then the chosen label and the up-down chevron, which a
 * picker whose value changes in place keeps (ADR-0042). The whole row is the trigger. It opens the popover, or pushes the page on a phone-width web window.
 */
export function ScreenTrigger(props: TriggerProps): ReactElement {
  return (
    <Pressable {...triggerProps(props)}>
      {props.lead}
      <Choice summary={props.summary} disclosure={props.disclosure} />
    </Pressable>
  );
}

function Choice(props: {
  summary: string;
  disclosure?: boolean;
}): ReactElement {
  return (
    <View className="flex-row items-center gap-1.5 -mr-1.5 wide:-mr-1.25">
      <Text role="body">{props.summary}</Text>
      <Icon name={chevronName(props.disclosure)} size="sm" {...chevronLook} />
    </View>
  );
}

const chevronLook = {
  'aria-hidden': true,
  className: 'text-tertiary',
} as const;

const chevronName = (
  disclosure: boolean | undefined,
): 'chevron-right' | 'chevron-up-down' =>
  disclosure ? 'chevron-right' : 'chevron-up-down';

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

const triggerClassName = cn(
  rowPressTargetClassName,
  'flex flex-row items-center justify-between web:whitespace-nowrap web:outline-none web:focus-visible:-outline-offset-2 web:focus-visible:outline-2 web:focus-visible:outline-focus web:disabled:cursor-not-allowed',
);
