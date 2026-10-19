import { cva } from 'class-variance-authority';

export const iconButtonClasses = cva(
  'shrink-0 items-center justify-center rounded-md web:rounded-control border border-transparent web:outline-none web:focus-visible:outline-solid web:focus-visible:outline-2 web:focus-visible:outline-foreground web:focus-visible:outline-offset-3 min-h-11 min-w-11 web:sm:min-h-0 web:sm:min-w-0 android:min-h-12 android:min-w-12',
  {
    variants: {
      variant: {
        default:
          'bg-tint active:border-focus active:bg-pressed web:hover:bg-hover web:active:bg-pressed',
        ghost: 'bg-transparent active:bg-pressed web:hover:bg-hover',
        outline: 'border-border bg-card active:bg-pressed web:hover:bg-hover',
        // Reacts as the filled Button does, so both halves of a split button match.
        filled:
          'bg-primary active:bg-primary/77 web:hover:bg-primary/67 web:active:bg-primary/77',
      },
      disabled: { true: 'opacity-38' },
      // A toggle that is on, such as Bold in the format bar.
      pressed: { true: 'bg-selected' },
      size: {
        xs: 'size-11 sm:size-7',
        sm: 'size-11 sm:size-8',
        md: 'size-11 sm:size-10',
        lg: 'size-11 sm:size-11',
        xl: 'size-12 sm:size-12',
      },
    },
    defaultVariants: { size: 'sm', variant: 'default' },
  },
);
