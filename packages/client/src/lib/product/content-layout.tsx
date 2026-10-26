import { useWide } from '@repo/kit/use-wide/use-wide';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { createContext, useContext, useState } from 'react';
import { type LayoutChangeEvent, View, type ViewProps } from 'react-native';
import { isContentWide } from './content-rule';
import { useContentRule } from './use-content-rule';

const ContentWide = createContext<boolean | undefined>(undefined);

// Whether the content column draws the desktop Composer and cards. Under a Frame the Scaffold's page provides it from the column the Frame placed; a host with no Frame measures it with ContentLayout; with neither, it follows the window.
export function useContentWide(): boolean {
  const contentWide = useContext(ContentWide);
  const windowWide = useWide();

  return contentWide ?? windowWide;
}

export const contentFill = 'flex-1 min-h-0 min-w-0';

// The measuring host: a View that learns its own width, for Storybook and any host that draws no Frame.
export function ContentLayout(props: ViewProps): React.JSX.Element {
  const [wide, measureWidth] = useContentWidth(props.onLayout);
  const className = cn(contentFill, props.className);

  return (
    <View {...props} className={className} onLayout={measureWidth}>
      <ContentWidthProvider wide={wide}>{props.children}</ContentWidthProvider>
    </View>
  );
}

function useContentWidth(
  onLayout: ViewProps['onLayout'],
): [boolean | undefined, (event: LayoutChangeEvent) => void] {
  const [wide, setWide] = useState<boolean>();
  const rule = useContentRule();

  const measureWidth = (event: LayoutChangeEvent): void => {
    setWide(isContentWide(event.nativeEvent.layout.width, rule));
    onLayout?.(event);
  };

  return [wide, measureWidth];
}

// Undefined leaves the content to the window's width.
export function ContentWidthProvider(props: {
  wide?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ContentWide.Provider value={props.wide}>
      {props.children}
    </ContentWide.Provider>
  );
}
