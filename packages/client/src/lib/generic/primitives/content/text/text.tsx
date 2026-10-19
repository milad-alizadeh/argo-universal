import type { ReactElement } from 'react';
import * as React from 'react';
import { Dimensions, PixelRatio, Platform, Text as RNText } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#lib/generic/utils';
import { isPerSizeClass } from '../../../use-size-class/size-class-value';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import type { TextProps, TextRole } from './text-props';
import { toneClass } from './text-tone';

const textRoles = {
  title: 'type-title',
  heading: 'type-heading',
  body: 'type-body',
  secondary: 'type-secondary',
  'secondary-code': 'type-secondary-code',
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

type RoleTextProps = Omit<TextProps, 'role'> & { role?: TextRole };

function textClassName(
  { role, tone, className }: Pick<RoleTextProps, 'role' | 'tone' | 'className'>,
  inherited?: string,
): string {
  return cn(
    'text-foreground web:[user-select:inherit]',
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

function useNativeTextKey(): number | undefined {
  const fontScale = React.useSyncExternalStore(
    subscribeFontScale,
    () => PixelRatio.getFontScale(),
    () => 1,
  );

  return Platform.OS === 'web' ? undefined : fontScale;
}

function RoleText(options: RoleTextProps): ReactElement {
  const { className, role, tone, accessibilityRole, ...props } = options;

  const key = useNativeTextKey();
  const textClass = React.useContext(TextClassContext);

  return React.createElement(RNText, {
    key,
    className: textClassName({ role, tone, className }, textClass),
    role: accessibilityRole,
    ...props,
  });
}

function SizeClassText(options: TextProps): ReactElement {
  return <RoleText {...options} role={useSizeClassValue(options.role)} />;
}

// Only text with a role per size class reads the size class.
function Text(options: TextProps): ReactElement {
  return isPerSizeClass(options.role) ? (
    <SizeClassText {...options} />
  ) : (
    <RoleText {...options} role={options.role} />
  );
}

export { Text, TextClassContext };
