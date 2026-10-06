import { Platform } from 'react-native';
import { Text } from '#primitives/text';

export function CodeBlockTitle({ title }: { title: string }) {
  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="head"
      accessibilityLabel={title}
      testID="code-block-title"
      className="min-w-0 flex-1 font-mono text-xs font-normal leading-5 text-muted-foreground web:[direction:rtl] web:text-left"
    >
      {Platform.OS === 'web' && title.includes('/')
        ? `\u2066${title}\u2069`
        : title}
    </Text>
  );
}
