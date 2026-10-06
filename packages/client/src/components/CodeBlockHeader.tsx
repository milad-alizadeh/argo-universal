import { setStringAsync } from 'expo-clipboard';
import { CheckIcon, CopyIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { cn } from '#lib/utils';
import { CodeBlockTitle } from './CodeBlockTitle';
import { Icon } from './Icon';

export function CodeBlockHeader({
  title,
  code,
}: {
  title: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);
  return (
    <View className="h-8 shrink-0 flex-row items-center justify-between border-b border-border bg-sidebar pr-1.5 pl-3">
      <CodeBlockTitle title={title} />
      <Pressable
        role="button"
        aria-label={copied ? 'Copied' : 'Copy code'}
        onPress={() => setStringAsync(code).then(() => setCopied(true))}
        className={cn(
          'size-[22px] shrink-0 items-center justify-center rounded-sm',
          Platform.select({
            web: cn('code-block-copy', copied && 'is-copied'),
          }),
        )}
      >
        <Icon
          as={copied ? CheckIcon : CopyIcon}
          className="text-muted-foreground"
        />
      </Pressable>
    </View>
  );
}
