import * as SwitchPrimitives from '@rn-primitives/switch';
import { Platform } from 'react-native';
import { cn } from '#lib/utils';

function Switch({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SwitchPrimitives.Root> & {
  size?: 'default' | 'small';
}) {
  return (
    <SwitchPrimitives.Root
      className={cn(
        'flex shrink-0 flex-row items-center rounded-full border border-transparent shadow-sm shadow-black/5',
        size === 'small' ? 'h-3.5 w-6' : 'h-[1.15rem] w-8',
        Platform.select({
          web: 'focus-visible:border-ring focus-visible:ring-ring/50 peer inline-flex outline-none transition-all focus-visible:ring-[3px] disabled:cursor-not-allowed',
        }),
        props.checked ? 'bg-primary' : 'bg-input dark:bg-input/80',
        props.disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          'bg-background rounded-full transition-transform',
          size === 'small' ? 'size-3' : 'size-4',
          Platform.select({
            web: 'pointer-events-none block ring-0',
          }),
          props.checked
            ? cn(
                'dark:bg-primary-foreground',
                size === 'small' ? 'translate-x-2.5' : 'translate-x-3.5',
              )
            : 'dark:bg-foreground translate-x-0',
        )}
      />
    </SwitchPrimitives.Root>
  );
}

export { Switch };
