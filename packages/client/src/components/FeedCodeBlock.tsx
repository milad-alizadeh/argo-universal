import type { ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { cn } from '#lib/utils';
import { Text } from '#primitives/text';
import { CodeBlockHeader } from './CodeBlockHeader';

export interface FeedCodeBlockProps {
  code: string;
  language?: string;
  footer?: ReactNode;
}

// A fenced code block: its language, a Copy icon shown on hover, and code that scrolls sideways.
export function FeedCodeBlock({ code, language, footer }: FeedCodeBlockProps) {
  return (
    <View
      className={cn(
        Platform.select({ web: 'code-block' }),
        'cursor-auto overflow-hidden rounded-xl border border-border bg-sidebar',
      )}
    >
      <CodeBlockHeader title={language ?? ''} code={code} />
      <ScrollView testID="code-scroll" className="max-h-75 wide:max-h-100">
        <ScrollView
          horizontal
          className="grow-0 shrink-0"
          contentContainerClassName="px-3 py-2"
        >
          <Text
            selectable
            className="font-mono text-xs leading-5 text-foreground"
          >
            {code}
          </Text>
        </ScrollView>
      </ScrollView>
      {footer}
    </View>
  );
}
