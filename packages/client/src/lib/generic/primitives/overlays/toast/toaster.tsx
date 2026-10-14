import { Toaster as BurntToaster } from 'burnt/web';
import type * as React from 'react';

const toastClassNames = {
  toast:
    'flex w-full flex-row items-start gap-2.5 rounded-2xl bg-popover p-3 font-sans shadow-card dark:border dark:border-border',
  icon: 'flex h-6 w-4 shrink-0 items-center justify-center text-destructive wide:h-5 [&>svg]:size-4 [&>svg[data-burnt-icon=check]]:text-success',
  content: 'flex min-w-0 flex-1 flex-col gap-0.5',
  title: 'type-heading',
  description: 'type-secondary',
};

// Web draws toasts here, mounted once at the root.
export function Toaster(): React.JSX.Element {
  return (
    <BurntToaster
      position="top-center"
      toastOptions={{ unstyled: true, classNames: toastClassNames }}
    />
  );
}
