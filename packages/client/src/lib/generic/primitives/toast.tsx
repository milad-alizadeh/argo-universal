import * as Burnt from 'burnt';
import { Toaster as BurntToaster } from 'burnt/web';
import type * as React from 'react';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export interface ErrorToast {
  title: string;
  message?: string;
}

// Android's toast is a single line of text, so the message follows the title there.
function toastTitle({ title, message }: ErrorToast): string {
  return Platform.OS === 'android' && message ? `${title} ${message}` : title;
}

// iOS and Android draw a native toast; web draws it in the Toaster.
function showErrorToast(toast: ErrorToast): void {
  void Burnt.toast({
    preset: 'error',
    haptic: 'error',
    title: toastTitle(toast),
    ...(toast.message === undefined ? {} : { message: toast.message }),
  });
}

// Clears every toast on screen.
export function dismissToasts(): void {
  void Burnt.dismissAllAlerts();
}

// Shows the toast once each time a failure starts, not on every render.
export function useErrorToast(toast: ErrorToast | undefined): void {
  const key = toast ? `${toast.title}\n${toast.message ?? ''}` : null;
  const shown = useRef<string | null>(null);
  useEffect(() => {
    if (key === shown.current) return;
    shown.current = key;
    if (toast) showErrorToast(toast);
  }, [key, toast]);
}

const toastClassNames = {
  toast:
    'flex w-full flex-row items-start gap-2.5 rounded-2xl bg-popover p-3 font-sans shadow-card dark:border dark:border-border',
  icon: 'flex h-6 w-4 shrink-0 items-center justify-center text-destructive wide:h-5 [&>svg]:size-4',
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
