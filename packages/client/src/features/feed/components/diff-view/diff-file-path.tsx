import type * as React from 'react';
import { useRef } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from '#primitives/content/text';
import { ScrollFadeGradient } from '../../../../lib/generic/scroll-fade/scroll-fade-gradient';

function FolderName({ folder }: { folder: string }): React.JSX.Element {
  return (
    <View className="shrink-0">
      <Text selectable={false} role="code" tone="muted">
        {folder}
      </Text>
    </View>
  );
}

function FileBaseName({ name }: { name: string }): React.JSX.Element {
  return (
    <View className="shrink-0">
      <Text selectable={false} numberOfLines={1} role="code">
        {name}
      </Text>
    </View>
  );
}

export function FilePath({ path }: { path: string }): React.JSX.Element {
  return (
    <View className="min-w-0 flex-1 flex-row items-center justify-end overflow-hidden web:[mask-image:linear-gradient(to_right,transparent,black_24px)]">
      <PathScroll path={path} />
      <PathFade />
    </View>
  );
}

function PathFade(): React.JSX.Element {
  return (
    <View className="absolute inset-0 web:hidden" pointerEvents="none">
      <ScrollFadeGradient
        edge="leading"
        height={24}
        className="bg-card medium:bg-content"
      />
    </View>
  );
}

// Start at the file name; sideways scrolling reveals the clipped folder without changing the file's fold.
function PathScroll({ path }: { path: string }): React.JSX.Element {
  const scroll = useRef<ScrollView>(null);

  const showFileName = (): void =>
    scroll.current?.scrollToEnd({ animated: false });

  return (
    <ScrollView
      {...pathScrollProps}
      ref={scroll}
      onContentSizeChange={showFileName}
      onLayout={showFileName}
    >
      <PathText path={path} />
    </ScrollView>
  );
}

const pathScrollProps: React.ComponentProps<typeof ScrollView> = {
  horizontal: true,
  showsHorizontalScrollIndicator: false,
  className: 'min-w-0 grow-0 shrink',
  contentContainerClassName: 'min-w-full',
};

function PathText({ path }: { path: string }): React.JSX.Element {
  const slash = path.lastIndexOf('/');

  return (
    <View className="min-w-full flex-row justify-end">
      <FolderName folder={path.slice(0, slash + 1)} />
      <FileBaseName name={path.slice(slash + 1)} />
    </View>
  );
}
