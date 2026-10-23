import { useRouter } from 'expo-router';
import { useEffect, type ComponentType } from 'react';
import { View } from 'react-native';
import { Button } from '#primitives/actions/button';
import { Text } from '#primitives/content/text';
import { registerStack } from './stack-registry';
import type { StackPages } from './stack-story-context';

interface StoryContext {
  id: string;
}

// A story's decorator on a phone: the on-device Storybook has no stack of its own, so the story opens in the App's own dev route, a real native stack whose header the Page fills.
export function withStack(pages: StackPages = {}) {
  return function WithStack(
    Story: ComponentType,
    context: StoryContext,
  ): React.JSX.Element {
    return <Launcher id={context.id} Root={Story} pages={pages} />;
  };
}

interface LauncherProps {
  id: string;
  Root: ComponentType;
  pages: StackPages;
}

function Launcher({ id, Root, pages }: LauncherProps): React.JSX.Element {
  const router = useRouter();

  useEffect(() => registerStack(id, { Root, pages }), [id, Root, pages]);

  return (
    <View className="items-center gap-4 p-6">
      <Text>This story draws a navigation stack with its header.</Text>
      <Button
        label="Open stack"
        onPress={() => router.push(`/story-stack/${id}`)}
      />
    </View>
  );
}
