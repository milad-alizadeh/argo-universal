import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { TextClassContext } from '#lib/generic/primitives/display/text/text';
import { cn } from '#lib/generic/utils';

const badgeVariants = cva(
  'border-border group shrink-0 flex-row items-center justify-center gap-1 overflow-hidden rounded-full border px-2 py-0.5 web:focus-visible:border-ring web:focus-visible:ring-ring/50 web:aria-invalid:ring-destructive/20 web:dark:aria-invalid:ring-destructive/40 web:aria-invalid:border-destructive web:w-fit web:whitespace-nowrap web:transition-[color,box-shadow] web:focus-visible:ring-[3px] web:[&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-primary border-transparent web:[a&]:hover:bg-primary/90',
        secondary:
          'bg-secondary border-transparent web:[a&]:hover:bg-secondary/90',
        destructive:
          'bg-destructive border-transparent web:[a&]:hover:bg-destructive/90',
        outline:
          'web:[a&]:hover:bg-accent web:[a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const badgeTextVariants = cva('type-badge', {
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
export type BadgeTone =
  | 'muted'
  | 'info'
  | 'success'
  | 'warning'
  | 'destructive';

const badgeTones: Record<BadgeTone, { fill: string; text: string }> = {
  muted: { fill: 'bg-muted', text: 'text-muted-foreground' },
  info: { fill: 'bg-info/10', text: 'text-info' },
  success: { fill: 'bg-success/10', text: 'text-success' },
  warning: { fill: 'bg-warning/10', text: 'text-warning' },
  destructive: { fill: 'bg-destructive/10', text: 'text-destructive' },
};

type BadgeProps = React.ComponentProps<typeof View> &
  React.RefAttributes<View> & {
    asChild?: boolean;
    tone?: BadgeTone;
  } & VariantProps<typeof badgeVariants>;

// The classes for the badge's box and for the text inside it.
interface BadgeClasses {
  box: string;
  text: string;
}

function toneClasses(
  tone: BadgeTone,
  className: BadgeProps['className'],
): BadgeClasses {
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

function badgeClasses({ variant, tone, className }: BadgeProps): BadgeClasses {
  if (tone) return toneClasses(tone, className);

  return {
    box: cn(badgeVariants({ variant }), className),
    text: badgeTextVariants({ variant }),
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
