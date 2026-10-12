import type * as React from 'react';
import { createContext, useContext, useState } from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useWide } from '../generic/use-wide/use-wide';

const ContentWide = createContext<boolean | undefined>(undefined);

/**
 * A content column this wide or wider draws the desktop Composer and cards.
 * It is lower than the window breakpoint because a wide window's column
 * narrows when the sidebar and the Inspector are open (688 at 1440), and
 * Paper keeps the desktop Composer there. A phone-wide column (390) still
 * draws the phone layout.
 */
const contentWideMin = 480;

export function useContentWide(): boolean {
  const contentWide = useContext(ContentWide);
  const windowWide = useWide();
  return contentWide ?? windowWide;
}

export function ContentLayout({
  children,
  className,
  onLayout,
  ...props
}: ViewProps): React.JSX.Element {
  const [wide, setWide] = useState<boolean>();
  return (
    <View
      {...props}
      className={cn('flex-1 min-h-0 min-w-0', className)}
      onLayout={(event) => {
        setWide(event.nativeEvent.layout.width >= contentWideMin);
        onLayout?.(event);
      }}
    >
      <ContentWide.Provider value={wide}>{children}</ContentWide.Provider>
    </View>
  );
}
