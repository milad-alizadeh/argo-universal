import { useNativeTheme } from '../native-theme';
import type { ButtonDataProps, ButtonVariant } from './button-props';
import { nativeButtonVariant } from './button-state';
import { usePrimitiveColor } from './primitive-color';

const destructiveClass = 'text-destructive';
const primaryClass = 'text-primary';
const foregroundClass = 'text-foreground';
const transparentClass = 'text-transparent';
const mutedFillClass = 'text-secondary';
const buttonColorClasses: Record<
  ButtonVariant,
  { container: string; content: string }
> = {
  default: { container: primaryClass, content: 'text-primary-foreground' },
  secondary: {
    container: mutedFillClass,
    content: 'text-secondary-foreground',
  },
  outline: { container: transparentClass, content: foregroundClass },
  ghost: { container: transparentClass, content: primaryClass },
  link: { container: transparentClass, content: primaryClass },
};

export interface ButtonTheme {
  primary: string | undefined;
  // The fill an outlined button takes where the system has no outlined style.
  mutedFill: string | undefined;
  contentClass: string;
  colors: {
    containerColor: string | undefined;
    contentColor: string | undefined;
    disabledContainerColor: string | undefined;
    disabledContentColor: string | undefined;
  };
}

type ThemeProps = Pick<ButtonDataProps, 'variant' | 'role'>;

export function useNativeButtonTheme(props: ThemeProps): ButtonTheme {
  const { colors } = useNativeTheme();
  const classes = nativeColorClasses(props);
  return {
    primary: colors.tint,
    mutedFill: usePrimitiveColor(mutedFillClass),
    contentClass: classes.content,
    colors: useNativeButtonColors(classes),
  };
}

function useNativeButtonColors(classes: {
  container: string;
  content: string;
}): ButtonTheme['colors'] {
  const containerColor = usePrimitiveColor(classes.container);
  const contentColor = usePrimitiveColor(classes.content);
  // A disabled button keeps its colours; its Host fades the whole button instead.
  return {
    containerColor,
    contentColor,
    disabledContainerColor: containerColor,
    disabledContentColor: contentColor,
  };
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
