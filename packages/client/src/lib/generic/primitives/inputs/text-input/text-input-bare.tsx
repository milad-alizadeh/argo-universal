import type { ReactElement } from 'react';
import { TextInput as NativeTextInput } from 'react-native';
import { cn } from '../../../utils';
import type { BareTextInputProps } from './text-input-props';

type InputProps = Omit<BareTextInputProps, 'variant'>;

const toneClass = {
  neutral:
    'dark:bg-border/30 border-border bg-card h-10 border px-3 py-1 shadow-control sm:h-9',
  muted:
    'h-8 sm:h-8 rounded-lg web:rounded-control border-0 bg-muted dark:bg-muted px-2.5 py-0 shadow-none web:focus-visible:ring-1 web:focus-visible:ring-focus',
};

const disabledInputClass =
  'opacity-50 web:disabled:pointer-events-none web:disabled:cursor-not-allowed';

const platformInputClass = cn(
  'web:rounded-control',
  'web:placeholder:text-muted-foreground web:selection:bg-primary web:selection:text-primary-foreground web:outline-none web:transition-[color,box-shadow]',
  'web:focus-visible:border-focus web:focus-visible:ring-focus/50 web:focus-visible:ring-[3px]',
  'web:aria-invalid:ring-danger/20 web:dark:aria-invalid:ring-danger/40',
  'native:placeholder:text-muted-foreground/50',
);

function inputClassName({
  className,
  tone = 'neutral',
  ...props
}: InputProps): string {
  return cn(
    'text-foreground flex w-full min-w-0 flex-row items-center rounded-md type-body ios:leading-none',
    platformInputClass,
    toneClass[tone],
    stateClass(props),
    className,
  );
}

const stateClass = (props: InputProps): string =>
  cn(
    props.editable === false && disabledInputClass,
    props['aria-invalid'] === true && 'border-danger',
  );

// The bare box: the web field, and the plain React Native field on phones.
export function BareTextInput({
  variant: _variant,
  className,
  tone,
  ...props
}: BareTextInputProps): ReactElement {
  const look = inputClassName({ className, tone, ...props });

  return <NativeTextInput className={look} {...props} />;
}
