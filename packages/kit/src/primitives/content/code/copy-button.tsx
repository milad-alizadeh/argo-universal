import { setStringAsync } from 'expo-clipboard';
import type * as React from 'react';
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
const hoverRevealClassName = (copied: boolean): string =>
  cn(
    !copied && 'web:pointer-fine:opacity-0',
    'web:group-hover/code-block:opacity-100 web:focus-within:opacity-100',
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

// The reveal's classes: hidden until hover where a pointer hovers; no fade while the copied check shows, so it is there at once.
function wrapperClassName(props: CopyButtonProps, copied: boolean): string {
  return cn(
    !copied && 'web:transition-opacity',
    props.revealOnHover && hoverRevealClassName(copied),
    props.className,
  );
}

// Copies a value and shows a check for two seconds.
export function CopyButton(props: CopyButtonProps): React.JSX.Element {
  const [copied, copy] = useCopy();

  return (
    <View className={wrapperClassName(props, copied)}>
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
