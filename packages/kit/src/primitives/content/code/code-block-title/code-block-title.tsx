import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { Pressable } from '#primitives/actions/pressable';
import { Text } from '#primitives/content/text';
import { Tooltip } from '#primitives/overlays/tooltip';

// On web a path keeps left-to-right order inside the right-to-left box that ellipsizes its start.
function isolatedTitle(title: string): string {
  return Platform.OS === 'web' && title.includes('/') ? `⁦${title}⁩` : title;
}

function TitleText({ title }: { title: string }): ReactElement {
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

export function CodeBlockTitle({ title }: { title: string }): ReactElement {
  if (Platform.OS !== 'web') return <TitleText title={title} />;

  return (
    <View className="min-w-0 flex-1">
      <Tooltip label={title}>
        <TitleTrigger title={title} />
      </Tooltip>
    </View>
  );
}

function TitleTrigger({
  title,
  ...props
}: { title: string } & React.ComponentProps<typeof Pressable>): ReactElement {
  return (
    <Pressable {...props} {...unfocusable} className="min-w-0">
      <TitleText title={title} />
    </Pressable>
  );
}

const unfocusable = {
  accessible: false,
  focusable: false,
  tabIndex: -1,
} as const;
