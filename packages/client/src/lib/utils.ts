import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * A text role (`type-body`) sets size, leading, weight and colour, so it
 * replaces those classes before it, such as the Text primitive's
 * `text-base text-foreground`. A single class after it still overrides one
 * property, because the CSS puts the roles first.
 */
const twMerge = extendTailwindMerge<'type-role'>({
  extend: {
    classGroups: {
      'type-role': [{ type: ['title', 'heading', 'body', 'secondary', 'feed'] }],
    },
    conflictingClassGroups: {
      'type-role': ['font-size', 'leading', 'font-weight', 'text-color'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
