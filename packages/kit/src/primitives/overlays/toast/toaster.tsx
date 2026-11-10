import { Toaster as BurntToaster } from 'burnt/web';
import type * as React from 'react';
import { useWide } from '../../../use-wide/use-wide';

const toastClassNames = {
  toast:
    'flex w-full flex-row items-start gap-2.5 rounded-2xl bg-card p-3 font-sans shadow-card dark:border dark:border-border',
  icon: 'flex h-6 w-4 shrink-0 items-center justify-center text-danger wide-type:h-5 *:size-4',
  content: 'flex min-w-0 flex-1 flex-col gap-0.5',
  title: 'type-heading',
  description: 'type-secondary',
  actionButton:
    'flex h-5 shrink-0 cursor-pointer items-center type-body font-control text-foreground',
};

/*
 * Web draws toasts here, mounted once at the root. A wide window puts them in the bottom-right corner; the phone
 * shell keeps them at the top, clear of the Composer at the bottom.
 */
export function Toaster(): React.JSX.Element {
  const wide = useWide();

  return (
    <BurntToaster
      position={wide ? 'bottom-right' : 'top-center'}
      toastOptions={{ unstyled: true, classNames: toastClassNames }}
    />
  );
}
