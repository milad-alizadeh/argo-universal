import * as CheckboxPrimitive from '@rn-primitives/checkbox';
import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import { cn } from '#lib/utils';
import { Icon } from '#primitives/icon';

const DEFAULT_HIT_SLOP = 24;

function checkboxClassName(props: CheckboxProps): string {
  const { className, checkedClassName, checked, disabled } = props;
  return cn(
    'border-input dark:bg-input/30 size-4 shrink-0 rounded-[4px] border shadow-sm shadow-black/5',
    Platform.select({
      web: 'focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive peer cursor-default outline-none transition-shadow focus-visible:ring-[3px] disabled:cursor-not-allowed',
      native: 'overflow-hidden',
    }),
    checked && cn('border-primary', checkedClassName),
    disabled && 'opacity-50',
    className,
  );
}

type CheckboxProps = React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  checkedClassName?: string;
  indicatorClassName?: string;
  iconClassName?: string;
};

function checkboxRootProps({
  className: _className,
  checkedClassName: _checkedClassName,
  indicatorClassName: _indicatorClassName,
  iconClassName: _iconClassName,
  ...props
}: CheckboxProps): React.ComponentProps<typeof CheckboxPrimitive.Root> {
  return props;
}

function Checkbox(options: CheckboxProps): ReactElement {
  const props = checkboxRootProps(options);
  return (
    <CheckboxPrimitive.Root
      className={checkboxClassName(options)}
      hitSlop={DEFAULT_HIT_SLOP}
      {...props}
    >
      <CheckboxIndicator {...options} />
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };

function CheckboxIndicator(props: CheckboxProps): ReactElement {
  const indicatorClass = cn(
    'bg-primary h-full w-full items-center justify-center',
    props.indicatorClassName,
  );
  return (
    <CheckboxPrimitive.Indicator className={indicatorClass}>
      <Icon
        size="sm"
        name="check"
        className={cn('text-primary-foreground', props.iconClassName)}
      />
    </CheckboxPrimitive.Indicator>
  );
}
