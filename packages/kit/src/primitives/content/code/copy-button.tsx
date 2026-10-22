import { setStringAsync } from 'expo-clipboard';
import type * as React from 'react';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { cn } from '#kit/utils';
import { IconButton } from '#primitives/actions/icon-button';

export interface CopyButtonProps {
  value: string;
  label: string;
  // On web with a pointer that hovers, stay hidden until the surrounding `codeBlockGroup` is hovered.
  revealOnHover?: boolean;
  className?: string;
}

const copiedMilliseconds = 2000;

// The code block a `revealOnHover` button shows over while it is hovered.
export const codeBlockGroup = 'group/code-block';

// Hidden where a pointer hovers, until the code block is hovered or the button has focus; shown while it reports a copy.
const hoverRevealClassName = (shown: boolean): string =>
  cn(
    !shown && 'web:pointer-fine:opacity-0',
    'web:group-hover/code-block:opacity-100',
  );

// Copies a value and reports it as copied for two seconds.
function useCopy(): [boolean, (value: string) => void] {
  const [copyRevision, setCopyRevision] = useState(0);
  useEffect(() => {
    if (copyRevision === 0) return;
    const timeout = setTimeout(() => setCopyRevision(0), copiedMilliseconds);

    return (): void => clearTimeout(timeout);
  }, [copyRevision]);

  const copy = (value: string): void =>
    void setStringAsync(value).then(() =>
      setCopyRevision((revision) => revision + 1),
    );

  return [copyRevision > 0, copy];
}

const revealClassName = (
  props: CopyButtonProps,
  copied: boolean,
  shown: boolean,
): string =>
  cn(
    !copied && 'web:transition-opacity',
    props.revealOnHover && hoverRevealClassName(shown),
    props.className,
  );

// The wrapper's class and focus handlers: no fade while the copied check shows, so it is there at once; focus inside keeps it shown.
function useReveal(
  props: CopyButtonProps,
  copied: boolean,
): Pick<ComponentProps<typeof View>, 'className' | 'onFocus' | 'onBlur'> {
  const [focused, setFocused] = useState(false);

  return {
    className: revealClassName(props, copied, copied || focused),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
  };
}

// Copies a value and shows a check for two seconds.
export function CopyButton(props: CopyButtonProps): React.JSX.Element {
  const [copied, copy] = useCopy();

  return (
    <View {...useReveal(props, copied)}>
      <IconButton
        size="xs"
        variant="ghost"
        muted
        icon={copied ? 'check' : 'copy'}
        accessibilityLabel={copied ? 'Copied' : props.label}
        onPress={() => copy(props.value)}
      />
    </View>
  );
}
