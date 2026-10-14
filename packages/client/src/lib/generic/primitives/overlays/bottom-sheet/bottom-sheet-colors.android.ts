import type { ModalBottomSheet } from '@expo/ui/jetpack-compose';
import type { ComponentProps } from 'react';
import { useResolveClassNames } from 'uniwind';
import { useNativeTheme } from '#lib/generic/native-theme';
import type { BottomSheetProps } from './bottom-sheet-props';

export function useSheetColors(
  surface: BottomSheetProps['surface'],
): Pick<
  ComponentProps<typeof ModalBottomSheet>,
  'containerColor' | 'contentColor' | 'scrimColor'
> {
  const { card, cardForeground, content } = useNativeTheme().colors;
  const scrim = useResolveClassNames('bg-black/32');

  return {
    containerColor: surface === 'sidebar' ? content : card,
    contentColor: cardForeground,
    scrimColor: scrim.backgroundColor,
  };
}
