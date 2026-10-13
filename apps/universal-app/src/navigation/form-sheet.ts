import type { FormSheetRoutes } from '@repo/client';
import { router } from 'expo-router';
import { Platform } from 'react-native';

let dismiss: (() => void) | undefined;
export const formSheetRoutes: FormSheetRoutes | undefined =
  Platform.OS === 'ios'
    ? {
        present: (): void => router.push('/form-sheet'),
        push: (): void => router.push('/form-sheet/choice'),
        back: (): void => router.back(),
        dismiss: (): void => dismiss?.(),
      }
    : undefined;

export function bindFormSheet(goBack: () => void): () => void {
  dismiss = goBack;
  return (): void => {
    if (dismiss === goBack) dismiss = undefined;
  };
}
