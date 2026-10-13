import { setStringAsync } from 'expo-clipboard';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { cn } from '#lib/generic/utils';
import { Icon } from '../../generic/symbols/icon';

export interface CopyButtonProps {
  value: string;
  label: string;
  // On web, stay hidden until the surrounding code block is hovered.
  revealOnHover?: boolean;
  className?: string;
}

const copiedMilliseconds = 2000;

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

function buttonClassName(props: CopyButtonProps, copied: boolean): string {
  return cn(
    'size-[22px] shrink-0 items-center justify-center rounded-sm',
    props.revealOnHover &&
      Platform.select({ web: cn('code-block-copy', copied && 'is-copied') }),
    props.className,
  );
}

function CopyIcon({ copied }: { copied: boolean }): React.JSX.Element {
  return (
    <Icon
      role="control"
      name={copied ? 'check' : 'copy'}
      className="text-muted-foreground"
    />
  );
}

// Copies a value and shows a check for two seconds.
export function CopyButton(props: CopyButtonProps): React.JSX.Element {
  const [copied, copy] = useCopy();

  return (
    <Pressable
      role="button"
      aria-label={copied ? 'Copied' : props.label}
      onPress={() => copy(props.value)}
      className={buttonClassName(props, copied)}
    >
      <CopyIcon copied={copied} />
    </Pressable>
  );
}
