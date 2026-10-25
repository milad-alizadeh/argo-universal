import { MediaUrlContext } from '@repo/kit/primitives/content/media-url';
import { PortalProvider } from '@repo/kit/primitives/overlays/portal';
import { dismissToasts, Toaster } from '@repo/kit/primitives/overlays/toast';
import { ScreenNavigationEnabled } from '@repo/kit/primitives/scaffolds/screen';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import type { PropsWithChildren } from 'react';
import { type ComponentType, useLayoutEffect } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Uniwind } from 'uniwind';
import { BlobUrlContext } from './features/connection/api/trpc/blob-url';
import { recordedImageUrl } from './lib/product/feed-message.mocks';
import { storyMediaUrl } from './lib/product/media-url.mocks';

interface PreviewContext {
  id: string;
  globals: { mode?: string };
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

interface PreviewProps {
  Story: ComponentType;
  storyId: string;
  mode: 'light' | 'dark';
  standalone: boolean;
  padding: boolean;
  screen: boolean;
}

type LayoutProps = Pick<PreviewProps, 'Story' | 'padding'>;

function ArgoPreview(props: PreviewProps): React.JSX.Element {
  usePreviewTheme(props.mode, props.storyId);

  return (
    <PreviewProviders>
      {/* On a phone, Storybook's own UI nests a bottom sheet's portal provider, which has no root host. */}
      <PortalProvider>
        <ScreenNavigationEnabled value={false}>
          <PreviewLayout {...props} />
        </ScreenNavigationEnabled>
      </PortalProvider>
      {props.standalone && <Toaster key={props.storyId} />}
    </PreviewProviders>
  );
}

function usePreviewTheme(mode: PreviewProps['mode'], storyId: string): void {
  useLayoutEffect(() => {
    Uniwind.setTheme(Platform.OS === 'web' ? mode : 'system');
  }, [mode]);
  // No toast outlives the story that showed it.
  useLayoutEffect(() => dismissToasts, [storyId]);
}

function PreviewProviders({ children }: PropsWithChildren): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <KeyboardProvider>
          <BlobUrlContext.Provider value={recordedImageUrl}>
            <MediaUrlContext.Provider value={storyMediaUrl}>
              {children}
            </MediaUrlContext.Provider>
          </BlobUrlContext.Provider>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function PreviewLayout({
  Story,
  padding,
  screen,
}: LayoutProps & Pick<PreviewProps, 'screen'>): React.JSX.Element {
  if (screen) return <ScreenLayout Story={Story} padding={padding} />;

  return <CentredLayout Story={Story} padding={padding} />;
}

function ScreenLayout({ Story }: LayoutProps): React.JSX.Element {
  return (
    <View className="flex-1 w-full min-h-0 bg-content web:h-screen web:flex-none">
      <Story />
    </View>
  );
}

function WebCentredLayout({ Story, padding }: LayoutProps): React.JSX.Element {
  return (
    <View
      className={cn(
        'min-h-full w-full items-center justify-center bg-content',
        padding && 'p-6',
      )}
    >
      <Story />
    </View>
  );
}

function NativeCentredLayout(props: LayoutProps): React.JSX.Element {
  return (
    <ScrollView
      className="flex-1 bg-content"
      contentContainerClassName={cn(
        'grow items-center justify-center',
        props.padding && 'p-6',
      )}
    >
      <props.Story />
    </ScrollView>
  );
}

const CentredLayout =
  Platform.OS === 'web' ? WebCentredLayout : NativeCentredLayout;

export function withArgoPreview(
  Story: ComponentType,
  context: PreviewContext,
): React.JSX.Element {
  return (
    <ArgoPreview
      Story={Story}
      storyId={context.id}
      mode={context.globals.mode === 'dark' ? 'dark' : 'light'}
      standalone={context.parameters.standalonePreview === true}
      padding={context.parameters.previewPadding !== false}
      screen={context.parameters.screenPreview === true}
    />
  );
}
