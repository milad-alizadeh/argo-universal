import * as Burnt from 'burnt';
import { Toaster as BurntToaster } from 'burnt/web';
import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export interface ErrorToast {
  title: string;
  message?: string;
}

// A finished action reads as success; a failed load or action as error.
export type Toast = ErrorToast & {
  tone: 'success' | 'error';
  // Tells a new toast from a repeated one when the text alone cannot.
  key?: string;
};

// Android's toast is a single line of text, so the message follows the title there.
function toastTitle({ title, message }: ErrorToast): string {
  return Platform.OS === 'android' && message ? `${title} ${message}` : title;
}

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

const toastClassNames = {
  toast:
    'flex w-full flex-row items-start gap-2.5 rounded-2xl bg-popover p-3 font-sans shadow-card dark:border dark:border-border',
  icon: 'flex h-6 w-4 shrink-0 items-center justify-center text-destructive wide:h-5 [&>svg]:size-4 [&>svg[data-burnt-icon=check]]:text-success',
  content: 'flex min-w-0 flex-1 flex-col gap-0.5',
  title: 'type-heading',
  description: 'type-secondary',
};

// Web draws toasts here, mounted once at the root; iOS and Android draw their own, so it renders nothing there.
export function Toaster(): React.JSX.Element {
  return (
    <BurntToaster
      position="top-center"
      toastOptions={{ unstyled: true, classNames: toastClassNames }}
    />
  );
}
