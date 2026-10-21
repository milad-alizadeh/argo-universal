import type * as React from 'react';
import { Platform } from 'react-native';
import { cn } from '#kit/utils';
import { Pressable } from '#primitives/actions/pressable';
import { Icon } from '#primitives/content/icon';

interface CheckButtonProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
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
      hitSlop={11}
      className={markClass(props.value)}
    >
      <Check value={props.value} />
    </Pressable>
  );
}

// React Native Web's checkbox role needs Space explicitly; its press responder already handles Enter.
function spaceKey(
  props: CheckButtonProps,
): Pick<React.DOMAttributes<HTMLElement>, 'onKeyDown'> {
  if (Platform.OS !== 'web') return {};

  return {
    onKeyDown: (event) => {
      if (event.key !== ' ') return;
      event.preventDefault();
      props.onValueChange(!props.value);
    },
  };
}

function Check({
  value,
}: Pick<CheckButtonProps, 'value'>): React.JSX.Element | null {
  return value ? (
    <Icon name="check" role="code" className="text-primary-foreground" />
  ) : null;
}

const markClass = (viewed: boolean): string =>
  cn(
    'size-5.5 shrink-0 items-center justify-center rounded-full border border-border bg-card web:focus-visible:outline-2 web:focus-visible:outline-focus',
    viewed && 'border-primary bg-primary',
  );
