import type { ReactElement, ReactNode } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { useContentWide } from '#lib/product/content-layout';

type ListProps = { children: ReactNode };

/*
 * The request's rows as grouped sections, sized to their content; the card or the sheet scrolls
 * them. A narrow window insets them as a phone's sheet does.
 */
export function ElicitationList({ children }: ListProps): ReactElement {
  return (
    <View className={cn('gap-3', !useContentWide() && 'px-4')}>{children}</View>
  );
}
