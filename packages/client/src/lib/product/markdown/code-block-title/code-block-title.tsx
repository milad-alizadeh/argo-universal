import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { Text } from '#primitives/display/text/text';

// On web a path keeps left-to-right order inside the right-to-left box that ellipsizes its start.
function isolatedTitle(title: string): string {
  return Platform.OS === 'web' && title.includes('/') ? `⁦${title}⁩` : title;
}

export function CodeBlockTitle({ title }: { title: string }): ReactElement {
  return (
    <Text
      numberOfLines={1}
      ellipsizeMode="head"
      accessibilityLabel={title}
      testID="code-block-title"
      role="code"
      className="min-w-0 flex-1 text-muted-foreground web:[direction:rtl] web:text-left"
    >
      {isolatedTitle(title)}
    </Text>
  );
}
