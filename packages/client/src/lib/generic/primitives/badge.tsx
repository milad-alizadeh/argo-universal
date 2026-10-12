import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactElement } from 'react';
import { Platform, View } from 'react-native';
import { TextClassContext } from '#lib/generic/primitives/text';
import { cn } from '#lib/generic/utils';

const badgeVariants = cva(
  cn(
    'border-border group shrink-0 flex-row items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5',
    Platform.select({
      web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive w-fit whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] [&>svg]:pointer-events-none',
    }),
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary border-transparent',
          Platform.select({ web: '[a&]:hover:bg-primary/90' }),
        ),
        secondary: cn(
          'bg-secondary border-transparent',
          Platform.select({ web: '[a&]:hover:bg-secondary/90' }),
        ),
        destructive: cn(
          'bg-destructive border-transparent',
          Platform.select({ web: '[a&]:hover:bg-destructive/90' }),
        ),
        outline: Platform.select({
          web: '[a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
        }),
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const badgeTextVariants = cva('text-xs font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

// A tinted status chip, such as "Ready" in green beside an Agent's name.
export type BadgeTone = 'muted' | 'success' | 'warning' | 'destructive';

const badgeTones: Record<BadgeTone, { fill: string; text: string }> = {
  muted: { fill: 'bg-muted', text: 'text-muted-foreground' },
  success: { fill: 'bg-success/10', text: 'text-success' },
  warning: { fill: 'bg-warning/10', text: 'text-warning' },
  destructive: { fill: 'bg-destructive/10', text: 'text-destructive' },
};

type BadgeProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    asChild?: boolean;
    tone?: BadgeTone;
  } & VariantProps<typeof badgeVariants>;

function badgeClasses({ variant, tone, className }: BadgeProps): {
  box: string;
  text: string;
} {
  if (!tone)
    return {
      box: cn(badgeVariants({ variant }), className),
      text: badgeTextVariants({ variant }),
    };
  return {
    box: cn(
      badgeVariants(),
      'h-5 border-transparent py-0',
      badgeTones[tone].fill,
      className,
    ),
    text: cn('type-badge', badgeTones[tone].text),
  };
}

function Badge(options: BadgeProps): ReactElement {
  const { className, variant, tone, asChild, ...props } = options;
  const Component = asChild ? Slot : View;
  const classes = badgeClasses({ variant, tone, className });
  return (
    <TextClassContext.Provider value={classes.text}>
      <Component className={classes.box} {...props} />
    </TextClassContext.Provider>
  );
}

export { Badge };
