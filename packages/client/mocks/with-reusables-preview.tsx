import { type ThemeId, themes } from '@repo/uniwind/themes';
import { PortalHost } from '@rn-primitives/portal';
import type * as React from 'react';
import type { ReactNode } from 'react';
import { type ComponentType, useLayoutEffect } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { applyTheme } from '../src/lib/theme';
import { cn } from '../src/lib/utils';
import { BlobUrlContext } from '../src/trpc/blob-url';
import { recordedImageUrl } from './feed-message-mock';

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
}): React.JSX.Element {
  useLayoutEffect(() => {
    applyTheme(themeId, mode);
  }, [themeId, mode]);
  let preview: ReactNode;
  if (screen) {
    preview = (
      <View className="flex-1 w-full min-h-0 bg-background web:h-screen web:flex-none">
        <Story />
      </View>
    );
  } else if (Platform.OS === 'web') {
    preview = (
      <View
        className={cn(
          'min-h-full w-full items-center justify-center bg-background',
          padding && 'p-6',
        )}
      >
        <Story />
      </View>
    );
  } else {
    preview = (
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName={cn(
          'grow items-center justify-center',
          padding && 'p-6',
        )}
      >
        <Story />
      </ScrollView>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <KeyboardProvider>
          <BlobUrlContext.Provider value={recordedImageUrl}>
            {preview}
            {standalone && <PortalHost />}
          </BlobUrlContext.Provider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export function withReusablesPreview(
  Story: ComponentType,
  context: PreviewContext,
): React.JSX.Element {
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
