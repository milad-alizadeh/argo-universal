import type { ModalBottomSheet } from '@expo/ui/jetpack-compose';
import type { ComponentProps } from 'react';
import { useResolveClassNames } from 'uniwind';
import { useNativeTheme } from '#lib/generic/native-theme';
import type { BottomSheetProps } from './bottom-sheet.types';

export function useSheetColors(
  surface: BottomSheetProps['surface'],
): Pick<
  ComponentProps<typeof ModalBottomSheet>,
  'containerColor' | 'contentColor' | 'scrimColor'
> {
  const { popover, popoverForeground, sidebar } = useNativeTheme().colors;
  const scrim = useResolveClassNames('bg-black/20');
  return {
    containerColor: surface === 'sidebar' ? sidebar : popover,
    contentColor: popoverForeground,
    scrimColor: scrim.backgroundColor,
  };
}
