import type { ReactElement } from 'react';
import { TextInput as NativeTextInput } from 'react-native';
import { cn } from '../../../utils';
import type { BareTextInputProps } from './text-input-props';

type InputProps = Omit<BareTextInputProps, 'variant'>;

const toneClass = {
  neutral:
    'dark:bg-input/30 border-input bg-background h-10 border px-3 py-1 shadow-sm shadow-black/5 sm:h-9',
  muted:
    'h-8 sm:h-8 rounded-lg border-0 bg-muted dark:bg-muted px-2.5 py-0 shadow-none web:focus-visible:ring-1 web:focus-visible:ring-ring',
};

const disabledInputClass =
  'opacity-50 web:disabled:pointer-events-none web:disabled:cursor-not-allowed';

const platformInputClass = cn(
  'web:rounded-lg',
  'web:placeholder:text-muted-foreground web:selection:bg-primary web:selection:text-primary-foreground web:outline-none web:transition-[color,box-shadow]',
  'web:focus-visible:border-ring web:focus-visible:ring-ring/50 web:focus-visible:ring-[3px]',
  'web:aria-invalid:ring-destructive/20 web:dark:aria-invalid:ring-destructive/40 web:aria-invalid:border-destructive',
  'native:placeholder:text-muted-foreground/50',
);

function inputClassName({
  className,
  editable,
  tone = 'neutral',
}: InputProps): string {
  return cn(
    'text-foreground flex w-full min-w-0 flex-row items-center rounded-md type-body',
    editable === false && disabledInputClass,
    platformInputClass,
    toneClass[tone],
    className,
  );
}

// The bare box: the web field, and the plain React Native field on phones.
export function BareTextInput({
  variant: _variant,
  className,
  tone,
  placeholderClassName: _placeholderClassName,
  ...props
}: BareTextInputProps): ReactElement {
  const { editable } = props;
  const look = inputClassName({ className, tone, editable });

  return <NativeTextInput className={look} {...props} />;
}
