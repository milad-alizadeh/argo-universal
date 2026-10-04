import { PortalHost } from '@rn-primitives/portal';
import { type ComponentType, useLayoutEffect } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';

interface PreviewContext {
  globals: { mode?: string };
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
};

function ReusablesPreview({
  Story,
  mode,
}: {
  Story: ComponentType;
  mode: 'light' | 'dark';
}) {
  useLayoutEffect(() => {
    Uniwind.setTheme(mode);
  }, [mode]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialMetrics}>
        {Platform.OS === 'web' ? (
          <View className="min-h-full w-full items-center justify-center bg-background p-6">
            <Story />
          </View>
        ) : (
          <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName="grow items-center justify-center p-6"
          >
            <Story />
          </ScrollView>
        )}
        <PortalHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function withReusablesPreview(
  Story: ComponentType,
  context: PreviewContext,
) {
  return (
    <ReusablesPreview
      Story={Story}
      mode={context.globals.mode === 'dark' ? 'dark' : 'light'}
    />
  );
}
