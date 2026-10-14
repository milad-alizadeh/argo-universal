import { Slot } from '@rn-primitives/slot';
import { cva } from 'class-variance-authority';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { cn } from '#lib/generic/utils';
import { TextClassContext } from '#primitives/display/text';
import type { BadgeProps } from './badge-props';

const toneBox = 'h-5 border-transparent py-0';

// A `tone` draws a tinted status chip, such as "Ready" in green beside an Agent's name, over the variant's fill.
const badgeVariants = cva(
  'border-border group shrink-0 flex-row items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 web:focus-visible:border-ring web:focus-visible:ring-ring/50 web:aria-invalid:ring-destructive/20 web:dark:aria-invalid:ring-destructive/40 web:aria-invalid:border-destructive web:w-fit web:whitespace-nowrap web:transition-[color,box-shadow] web:focus-visible:ring-[3px] web:[&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary border-transparent',
        secondary: 'bg-secondary border-transparent',
      },
      tone: {
        muted: `${toneBox} bg-muted`,
        info: `${toneBox} bg-info/10`,
        success: `${toneBox} bg-success/10`,
        warning: `${toneBox} bg-warning/10`,
        danger: `${toneBox} bg-destructive/10`,
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

const badgeTextVariants = cva('type-badge', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
    },
    tone: {
      muted: 'text-muted-foreground',
      info: 'text-info',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-destructive',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Badge(options: BadgeProps): ReactElement {
  const { className, variant, tone, asChild, ...props } = options;
  const Component = asChild ? Slot : View;
  const textClass = cn(badgeTextVariants({ variant, tone }));

  return (
    <TextClassContext.Provider value={textClass}>
      <Component
        className={cn(badgeVariants({ variant, tone }), className)}
        {...props}
      />
    </TextClassContext.Provider>
  );
}

export { Badge };
