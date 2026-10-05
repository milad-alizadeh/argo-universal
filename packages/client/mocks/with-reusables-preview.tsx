import { type ThemeId, themes } from '@repo/uniwind/themes';
import { PortalHost } from '@rn-primitives/portal';
import { type ComponentType, useLayoutEffect } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { applyTheme } from '../src/lib/theme';
import { cn } from '../src/lib/utils';

interface PreviewContext {
  globals: { themeId?: string; mode?: string };
  parameters: {
    standalonePreview?: boolean;
    previewPadding?: boolean;
    screenPreview?: boolean;
  };
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, bottom: 0, left: 0, right: 0 },
};

function ReusablesPreview({
  Story,
  themeId,
  mode,
  standalone,
  padding,
  screen,
}: {
  Story: ComponentType;
  themeId: ThemeId;
  mode: 'light' | 'dark';
  standalone: boolean;
  padding: boolean;
  screen: boolean;
}) {
  useLayoutEffect(() => {
    applyTheme(themeId, mode);
  }, [themeId, mode]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialMetrics}>
        {screen ? (
          <View className="flex-1 w-full min-h-0 bg-background web:h-screen web:flex-none">
            <Story />
          </View>
        ) : Platform.OS === 'web' ? (
          <View
            className={cn(
              'min-h-full w-full items-center justify-center bg-background',
              padding && 'p-6',
            )}
          >
            <Story />
          </View>
        ) : (
          <ScrollView
            className="flex-1 bg-background"
            contentContainerClassName={cn(
              'grow items-center justify-center',
              padding && 'p-6',
            )}
          >
            <Story />
          </ScrollView>
        )}
        {standalone && <PortalHost />}
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
      themeId={
        themes.find((theme) => theme.id === context.globals.themeId)?.id ??
        'default'
      }
      mode={context.globals.mode === 'dark' ? 'dark' : 'light'}
      standalone={context.parameters.standalonePreview === true}
      padding={context.parameters.previewPadding !== false}
      screen={context.parameters.screenPreview === true}
    />
  );
}
