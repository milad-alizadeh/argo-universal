import { createContext, useContext, useState } from 'react';
import { View, type ViewProps } from 'react-native';
import { useCSSVariable } from 'uniwind';
import { cn } from '#lib/utils';
import { useWide } from '../navigation/use-wide';

const ContentWide = createContext<boolean | undefined>(undefined);

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
}: ViewProps) {
  const breakpoint = Number.parseFloat(
    String(useCSSVariable('--breakpoint-wide')),
  );
  const [wide, setWide] = useState<boolean>();
  return (
    <View
      {...props}
      className={cn('flex-1 min-h-0 min-w-0', className)}
      onLayout={(event) => {
        setWide(event.nativeEvent.layout.width >= breakpoint);
        onLayout?.(event);
      }}
    >
      <ContentWide.Provider value={wide}>{children}</ContentWide.Provider>
    </View>
  );
}
