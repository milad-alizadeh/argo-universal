import * as Burnt from 'burnt';
import { useEffect, useRef } from 'react';
import { toastTitle } from './toast-title';

export interface ErrorToast {
  title: string;
  message?: string;
  // Tells a new toast from a repeated one when the text alone cannot.
  key?: string;
}

// A finished action reads as success; a failed load or action as error.
export type Toast = ErrorToast & {
  tone: 'success' | 'error';
};

type ToastOptions = Parameters<typeof Burnt.toast>[0];

const tonePresets = {
  success: { preset: 'done', haptic: 'success' },
  error: { preset: 'error', haptic: 'error', from: 'top' },
} as const;

// iOS and Android draw a native toast; web draws it in the Toaster.
function showToast(toast: Toast): void {
  const options: ToastOptions = {
    ...tonePresets[toast.tone],
    title: toastTitle(toast),
  };

  if (toast.message !== undefined) options.message = toast.message;
  void Burnt.toast(options);
}

// Clears every toast on screen.
export function dismissToasts(): void {
  void Burnt.dismissAllAlerts();
}

const textKey = (toast: Toast): string =>
  `${toast.title}\n${toast.message ?? ''}`;

const toastKey = (toast: Toast | undefined): string | null =>
  toast ? (toast.key ?? textKey(toast)) : null;

// Shows the toast once each time it starts, not on every render.
export function useToast(toast: Toast | undefined): void {
  const key = toastKey(toast);
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (key === shown.current) return;
    shown.current = key;

    if (toast) showToast(toast);
  }, [key, toast]);
}

// Shows the toast once each time a failure starts, not on every render.
export function useErrorToast(toast: ErrorToast | undefined): void {
  useToast(toast && { ...toast, tone: 'error' });
}

export { Toaster } from './toaster';
