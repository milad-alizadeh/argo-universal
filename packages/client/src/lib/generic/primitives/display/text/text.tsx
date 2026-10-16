import { Slot } from '@rn-primitives/slot';
import type { ReactElement } from 'react';
import * as React from 'react';
import { Dimensions, PixelRatio, Platform, Text as RNText } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/generic/utils';
import type { TextProps, TextRole } from './text-props';
import { toneClass } from './text-tone';

const textRoles = {
  title: 'type-title',
  heading: 'type-heading',
  body: 'type-body',
  secondary: 'type-secondary',
  control: 'type-control',
  badge: 'type-badge',
  code: 'type-code',
  'nav-title': 'type-nav-title',
  'nav-action': 'type-nav-action',
  row: 'type-row',
  'row-detail': 'type-row-detail',
} as const satisfies Record<TextRole, string>;

export function useTextStyle(
  role: TextRole,
): ReturnType<typeof useResolveClassNames> {
  return useResolveClassNames(cn('font-sans', textRoles[role]));
}

const TextClassContext = React.createContext<string | undefined>(undefined);

function textClassName(
  { role, tone, className }: Pick<TextProps, 'role' | 'tone' | 'className'>,
  inherited?: string,
): string {
  return cn(
    'text-foreground web:select-text',
    role === undefined && 'type-body',
    inherited,
    role && textRoles[role],
    toneClass(tone),
    className,
  );
}

function subscribeFontScale(onChange: () => void): () => void {
  const subscription = Dimensions.addEventListener('change', onChange);

  return () => subscription.remove();
}

function useNativeTextKey(asChild?: boolean): number | undefined {
  const fontScale = React.useSyncExternalStore(
    subscribeFontScale,
    () => PixelRatio.getFontScale(),
    () => 1,
  );

  return asChild || Platform.OS === 'web' ? undefined : fontScale;
}

function Text(options: TextProps): ReactElement {
  const { className, asChild, role, tone, accessibilityRole, ...props } =
    options;

  const key = useNativeTextKey(asChild);
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;

  return React.createElement(Component, {
    key,
    className: textClassName({ role, tone, className }, textClass),
    role: accessibilityRole,
    ...props,
  });
}

export { Text, TextClassContext };
