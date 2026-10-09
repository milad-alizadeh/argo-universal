import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

const mergeClasses = extendTailwindMerge<'typography'>({
  extend: {
    classGroups: {
      typography: ['type-title', 'type-heading', 'type-body', 'type-secondary'],
    },
    conflictingClassGroups: {
      typography: [
        'font-family',
        'font-size',
        'leading',
        'font-weight',
        'text-color',
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return mergeClasses(clsx(inputs));
}
