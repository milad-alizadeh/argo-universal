import { cva } from 'class-variance-authority';
export const iconButtonClasses = cva(
  'shrink-0 items-center justify-center rounded-md border border-transparent web:outline-none web:focus-visible:outline-solid web:focus-visible:outline-2 web:focus-visible:outline-foreground web:focus-visible:outline-offset-3 min-h-11 min-w-11 web:sm:min-h-0 web:sm:min-w-0 android:min-h-12 android:min-w-12',
  {
    variants: {
      variant: {
        default:
          'bg-muted active:border-ring active:bg-border web:hover:bg-border web:active:bg-border',
        ghost: 'bg-transparent active:bg-accent web:hover:bg-accent',
        outline:
          'border-border bg-background active:bg-accent web:hover:bg-accent',
        filled: 'bg-primary active:bg-primary/90 web:hover:bg-primary/90',
      },
      disabled: { true: 'opacity-[0.38]' },
      size: {
        sm: 'size-11 sm:size-7',
        md: 'size-11 sm:size-8',
        lg: 'size-11 sm:size-10',
      },
    },
    defaultVariants: { size: 'md', variant: 'default' },
  },
);
