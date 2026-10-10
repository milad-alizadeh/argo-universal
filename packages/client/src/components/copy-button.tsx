import { setStringAsync } from 'expo-clipboard';
import type * as React from 'react';
import { useEffect, useState } from 'react';
import { Platform, Pressable } from 'react-native';
import { cn } from '#lib/utils';
import { Icon } from '../lib/icon';

export interface CopyButtonProps {
  value: string;
  label: string;
  // On web, stay hidden until the surrounding code block is hovered.
  revealOnHover?: boolean;
}

const copiedMilliseconds = 2000;

// Copies a value and shows a check for two seconds.
export function CopyButton({
  value,
  label,
  revealOnHover = false,
}: CopyButtonProps): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), copiedMilliseconds);
    return (): void => clearTimeout(timeout);
  }, [copied]);
  return (
    <Pressable
      role="button"
      aria-label={copied ? 'Copied' : label}
      onPress={() => setStringAsync(value).then(() => setCopied(true))}
      className={cn(
        'size-[22px] shrink-0 items-center justify-center rounded-sm',
        revealOnHover &&
          Platform.select({
            web: cn('code-block-copy', copied && 'is-copied'),
          }),
      )}
    >
      <Icon
        name={copied ? 'check' : 'copy'}
        className="text-muted-foreground"
      />
    </Pressable>
  );
}
