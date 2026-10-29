import { textDefaults } from '@repo/contracts/kit-tokens';
import type { ReactElement } from 'react';
import * as React from 'react';
import { Dimensions, PixelRatio, Platform, Text as RNText } from 'react-native';
import { useResolveClassNames } from 'uniwind';
import { cn } from '#kit/utils';
import { isPerSizeClass } from '../../../use-size-class/size-class-value';
import { useSizeClassValue } from '../../../use-size-class/use-size-class-value';
import type { TextProps, TextRole } from './text-props';
import { toneClass } from './text-tone';

const textRoles = {
  title: 'type-title',
  heading: 'type-heading',
  body: 'type-body',
  'body-code': 'type-body-code',
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

type TextDrawing = Pick<
  RoleTextProps,
  'role' | 'tone' | 'dimmed' | 'className'
>;

function textClassName(
  { role, tone, dimmed, className }: TextDrawing,
  inherited?: string,
): string {
  return cn(
    'text-foreground web:[user-select:inherit]',
    // The default role goes first: `cn` (utils.ts, the type-role / type-face groups) drops it when an inherited class or an explicit role follows.
    textRoles[textDefaults.role],
    inherited,
    role && textRoles[role],
    textToneClass(tone, dimmed),
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
  const { className, role, tone, dimmed, accessibilityRole, ...props } =
    options;

  const key = useNativeTextKey();
  const textClass = React.useContext(TextClassContext);

  return React.createElement(RNText, {
    key,
    className: textClassName({ role, tone, dimmed, className }, textClass),
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

const textToneClass = (
  tone: TextProps['tone'],
  dimmed?: boolean,
): string | undefined => (dimmed ? 'text-tertiary' : toneClass(tone));
