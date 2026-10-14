import { setStringAsync } from 'expo-clipboard';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { cn } from '#lib/generic/utils';
import { IconButton } from '#primitives/buttons/icon-button/icon-button';

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
    !copied && 'web:[@media(hover:hover)]:opacity-0',
    'web:group-hover/code-block:opacity-100 web:focus-visible:opacity-100',
  );

// Copies a value and reports it as copied for two seconds.
function useCopy(): [boolean, (value: string) => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), copiedMilliseconds);

    return (): void => clearTimeout(timeout);
  }, [copied]);

  const copy = (value: string): void =>
    void setStringAsync(value).then(() => setCopied(true));

  return [copied, copy];
}

// A bare glyph in a code block's header: no fill, border or touch minimum.
const copyChrome =
  'size-[22px] sm:size-[22px] rounded-sm border-0 min-h-0 min-w-0 android:min-h-0 android:min-w-0 active:bg-transparent web:hover:bg-transparent';

function buttonClassName(props: CopyButtonProps, copied: boolean): string {
  return cn(
    copyChrome,
    props.revealOnHover && hoverRevealClassName(copied),
    props.className,
  );
}

// Copies a value and shows a check for two seconds.
export function CopyButton(props: CopyButtonProps): React.JSX.Element {
  const [copied, copy] = useCopy();

  return (
    <IconButton
      variant="ghost"
      icon={copied ? 'check' : 'copy'}
      iconClassName="text-muted-foreground"
      accessibilityLabel={copied ? 'Copied' : props.label}
      onPress={() => copy(props.value)}
      className={buttonClassName(props, copied)}
    />
  );
}
