import { useUniwind } from 'uniwind';
import type { ButtonDataProps, ButtonVariant } from './button-props';
import { isButtonDisabled, nativeButtonVariant } from './button-state';
import { usePrimitiveColor } from './primitive-color';

const destructiveClass = 'text-destructive';
const primaryClass = 'text-primary';
const foregroundClass = 'text-foreground';
const transparentClass = 'text-transparent';
const mutedForegroundClass = 'text-muted-foreground';
const buttonColorClasses: Record<
  ButtonVariant,
  { container: string; content: string }
> = {
  default: { container: primaryClass, content: 'text-primary-foreground' },
  secondary: {
    container: 'text-secondary',
    content: 'text-secondary-foreground',
  },
  outline: { container: transparentClass, content: foregroundClass },
  ghost: { container: transparentClass, content: primaryClass },
  link: { container: transparentClass, content: primaryClass },
};

export interface ButtonTheme {
  colorScheme: 'light' | 'dark';
  primary: string | undefined;
  contentClass: string;
  colors: {
    containerColor: string | undefined;
    contentColor: string | undefined;
    disabledContainerColor: string | undefined;
    disabledContentColor: string | undefined;
  };
}

type ThemeProps = Pick<
  ButtonDataProps,
  'variant' | 'role' | 'disabled' | 'loading'
>;

export function useNativeButtonTheme(props: ThemeProps): ButtonTheme {
  const { theme } = useUniwind();
  const classes = nativeColorClasses(props);
  return {
    colorScheme: theme === 'dark' ? 'dark' : 'light',
    primary: usePrimitiveColor(primaryClass),
    contentClass: isButtonDisabled(props)
      ? mutedForegroundClass
      : classes.content,
    colors: useNativeButtonColors(classes),
  };
}

function useNativeButtonColors(classes: {
  container: string;
  content: string;
}): ButtonTheme['colors'] {
  return {
    containerColor: usePrimitiveColor(classes.container),
    contentColor: usePrimitiveColor(classes.content),
    disabledContainerColor: usePrimitiveColor(
      disabledContainerClass(classes.container),
    ),
    disabledContentColor: usePrimitiveColor(mutedForegroundClass),
  };
}

function disabledContainerClass(container: string): string {
  return container === transparentClass ? transparentClass : 'text-muted';
}

function nativeColorClasses(props: Pick<ButtonDataProps, 'variant' | 'role'>): {
  container: string;
  content: string;
} {
  const variant = nativeButtonVariant(props);
  if (props.role === 'destructive') return destructiveColors[variant];
  return buttonColorClasses[variant];
}

const destructiveColors: Record<
  ButtonVariant,
  { container: string; content: string }
> = {
  default: {
    container: destructiveClass,
    content: 'text-destructive-foreground',
  },
  secondary: { container: 'text-destructive/10', content: destructiveClass },
  outline: { container: transparentClass, content: destructiveClass },
  ghost: { container: transparentClass, content: destructiveClass },
  link: { container: transparentClass, content: destructiveClass },
};
