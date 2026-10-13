import type * as React from 'react';
import { createContext, useContext, useState } from 'react';
import { type LayoutChangeEvent, View, type ViewProps } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { cn } from '#lib/generic/utils';
import { useWide } from '../generic/use-wide/use-wide';

const ContentWide = createContext<boolean | undefined>(undefined);

/**
 * A content column at least --container-content-wide draws the desktop
 * Composer and cards. It is lower than the window breakpoint because a wide
 * window's column narrows when the sidebar and the Inspector are open (688 at
 * 1440), and Paper keeps the desktop Composer there. A phone-wide column (390)
 * still draws the phone layout.
 */
function useContentWideMin(): number {
  const token = useCSSVariable('--container-content-wide');
  return typeof token === 'number' ? token : Number.parseFloat(token ?? '');
}

export function useContentWide(): boolean {
  const contentWide = useContext(ContentWide);
  const windowWide = useWide();
  return contentWide ?? windowWide;
}

export function ContentLayout(props: ViewProps): React.JSX.Element {
  const [wide, measureWidth] = useContentWidth(props.onLayout);
  return (
    <View
      {...props}
      className={cn('flex-1 min-h-0 min-w-0', props.className)}
      onLayout={measureWidth}
    >
      <ContentWide.Provider value={wide}>{props.children}</ContentWide.Provider>
    </View>
  );
}

function useContentWidth(
  onLayout: ViewProps['onLayout'],
): [boolean | undefined, (event: LayoutChangeEvent) => void] {
  const [wide, setWide] = useState<boolean>();
  const contentWideMin = useContentWideMin();
  const measureWidth = (event: LayoutChangeEvent): void => {
    setWide(event.nativeEvent.layout.width >= contentWideMin);
    onLayout?.(event);
  };
  return [wide, measureWidth];
}

export function ContentWidthProvider(props: {
  wide: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <ContentWide.Provider value={props.wide}>
      {props.children}
    </ContentWide.Provider>
  );
}
