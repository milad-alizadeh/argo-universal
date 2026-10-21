import { useWide } from '@repo/kit/use-wide/use-wide';
import { cn } from '@repo/kit/utils';
import type * as React from 'react';
import { createContext, useContext, useState } from 'react';
import { type LayoutChangeEvent, View, type ViewProps } from 'react-native';
import { useCSSVariable } from 'uniwind';

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

export interface ContentLayoutProps extends ViewProps {
  // False leaves the content to the window's width, as on a narrow window; the tree stays the same either way.
  measured?: boolean;
}

export function ContentLayout({
  measured = true,
  ...props
}: ContentLayoutProps): React.JSX.Element {
  const [wide, measureWidth] = useContentWidth(props.onLayout);
  const className = cn('flex-1 min-h-0 min-w-0', props.className);

  return (
    <View {...props} className={className} onLayout={measureWidth}>
      <ContentWide value={measured ? wide : undefined}>
        {props.children}
      </ContentWide>
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
