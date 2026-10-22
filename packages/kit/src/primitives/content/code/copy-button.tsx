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

const revealClassName = (props: CopyButtonProps, shown: boolean): string =>
  cn(props.revealOnHover && hoverRevealClassName(shown), props.className);

// No fade, so the button is there at once when copied or focused.
export function CopyButton(props: CopyButtonProps): React.JSX.Element {
  const [copied, copy] = useCopy();
  const [focused, setFocused] = useState(false);

  return (
    <View className={revealClassName(props, copied || focused)}>
      <CopyControl
        {...props}
        copied={copied}
        onCopy={copy}
        onFocusChange={setFocused}
      />
    </View>
  );
}

type CopyControlProps = CopyButtonProps & {
  copied: boolean;
  onCopy: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
};

// Copies a value and shows a check for two seconds.
function CopyControl(props: CopyControlProps): React.JSX.Element {
  return (
    <IconButton
      onFocus={() => props.onFocusChange(true)}
      onBlur={() => props.onFocusChange(false)}
      size="xs"
      variant="ghost"
      muted
      icon={props.copied ? 'check' : 'copy'}
      accessibilityLabel={props.copied ? 'Copied' : props.label}
      onPress={() => props.onCopy(props.value)}
    />
  );
}
