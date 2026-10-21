import * as Burnt from 'burnt';
import { useEffect, useRef } from 'react';
import type { KitProps } from '../../kit-props';
import { showActionToast } from './toast-action';
import { toastTitle } from './toast-title';

// Kit-only: identity for suppressing repeated notifications.
export type Toast = KitProps<'Toast'> & { key?: string };

export type ErrorToast = Pick<Toast, 'title' | 'message' | 'key'>;

export type ToastAction = NonNullable<Toast['action']>;

type ToastOptions = Parameters<typeof Burnt.toast>[0];

const tonePresets = {
  success: { preset: 'done', haptic: 'success' },
  danger: { preset: 'error', haptic: 'error', from: 'top' },
} as const;

// iOS and Android draw a native toast; web draws it in the Toaster.
export function showToast(toast: Toast): void {
  if (toast.action && showActionToast(toast, toast.action)) return;

  showSystemToast(toast);
}

function showSystemToast(toast: Toast): void {
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
  useToast(toast && { ...toast, tone: 'danger' });
}

export { Toaster } from './toaster';
