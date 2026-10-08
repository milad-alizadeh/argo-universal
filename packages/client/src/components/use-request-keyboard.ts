import { useId } from 'react';

export interface RequestKeyboardOptions {
  inactive: boolean;
  wide: boolean;
  onEnter: () => void;
  onEscape?: () => void;
}

export function useRequestKeyboard(_options: RequestKeyboardOptions): string {
  return useId();
}
