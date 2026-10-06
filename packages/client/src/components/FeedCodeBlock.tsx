import { setStringAsync } from 'expo-clipboard';
import { CheckIcon, CopyIcon } from 'phosphor-react-native';
import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { Icon } from './Icon';

export interface FeedCodeBlockProps {
  code: string;
  language?: string;
}

const copiedForMs = 2000;

// A fenced code block: its language, a Copy icon shown on hover, and code that scrolls sideways.
export function FeedCodeBlock({ code, language }: FeedCodeBlockProps) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyVisible = Platform.OS !== 'web' || hovered || focused || copied;
  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), copiedForMs);
    return () => clearTimeout(timeout);
  }, [copied]);
  return (
    <Pressable
      accessible={false}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      className="cursor-auto overflow-hidden rounded-xl border border-border bg-sidebar"
    >
      <View className="h-[30px] shrink-0 flex-row items-center justify-between border-b border-border pr-1.5 pl-3">
        <Text className="font-mono text-xs leading-5 text-muted-foreground">
          {language ?? ''}
        </Text>
        <Pressable
          role="button"
          aria-label={copied ? 'Copied' : 'Copy code'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onPress={() => setStringAsync(code).then(() => setCopied(true))}
          className={cn(
            'size-[22px] items-center justify-center rounded-sm',
            !copyVisible && 'opacity-0',
          )}
        >
          <Icon
            as={copied ? CheckIcon : CopyIcon}
            size={14}
            className="text-muted-foreground"
          />
        </Pressable>
      </View>
      <ScrollView horizontal contentContainerClassName="px-3 py-2">
        <Text className="font-mono text-xs leading-5 text-foreground">
          {code}
        </Text>
      </ScrollView>
    </Pressable>
  );
}
