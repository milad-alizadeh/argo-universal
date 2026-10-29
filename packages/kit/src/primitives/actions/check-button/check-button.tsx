import type * as React from 'react';
import { Platform, type PressableProps } from 'react-native';
import { cn } from '#kit/utils';
import { Pressable, contentActionClass } from '#primitives/actions/pressable';
import { Icon } from '#primitives/content/icon';
import { Text } from '#primitives/content/text';

interface CheckButtonProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  // Desktop: the label is drawn beside the mark, and both are one press target.
  labelled?: boolean;
}

// Paper / FileDiff: the phone's circular check, with a full touch target around its visible mark.
export function CheckButton(props: CheckButtonProps): React.JSX.Element {
  return (
    <Pressable
      {...spaceKey(props)}
      role="checkbox"
      accessibilityLabel={props.label}
      aria-checked={props.value}
      onPress={() => props.onValueChange(!props.value)}
      {...look(props)}
    />
  );
}

// The phone's mark reaches past its visible circle; the labelled look is already a full-size target.
const markSlop = 11;

function look(
  props: CheckButtonProps,
): Pick<PressableProps, 'hitSlop' | 'children'> & { className: string } {
  if (props.labelled)
    return { className: labelledClass, children: <LabelledCheck {...props} /> };

  return {
    hitSlop: markSlop,
    className: markClass(props.value),
    children: <Check {...props} />,
  };
}

// React Native Web's checkbox role needs Space explicitly; its press responder already handles Enter.
function spaceKey(props: CheckButtonProps): Pick<PressableProps, 'onKeyDown'> {
  if (Platform.OS !== 'web') return {};

  return {
    onKeyDown: (event) => {
      if (event.nativeEvent.key !== ' ') return;
      event.preventDefault();
      props.onValueChange(!props.value);
    },
  };
}

function Check({
  value,
}: Pick<CheckButtonProps, 'value'>): React.JSX.Element | null {
  return value ? (
    <Icon name="check" className="text-primary-foreground" />
  ) : null;
}

// An empty circle until checked, then a checked one, so the two states read apart at a glance.
function LabelledCheck(
  props: Pick<CheckButtonProps, 'label' | 'value'>,
): React.JSX.Element {
  return (
    <>
      <Icon name={props.value ? 'passed' : 'pending'} />
      <Text role="secondary" tone={props.value ? undefined : 'muted'}>
        {props.label}
      </Text>
    </>
  );
}

const labelledClass = contentActionClass({
  variant: 'ghost',
  className: 'h-7 gap-1.5 px-2 web:sm:px-0',
});

const markClass = (viewed: boolean): string =>
  cn(
    'size-5.5 shrink-0 items-center justify-center rounded-full border border-border bg-card web:focus-visible:outline-2 web:focus-visible:outline-focus',
    viewed && 'border-primary bg-primary',
  );
