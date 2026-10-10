import { Slot } from '@rn-primitives/slot';
import type { ReactElement } from 'react';
import * as React from 'react';
import { Text as RNText } from 'react-native';
import { cn } from '#lib/generic/utils';

const textRoles = {
  title: 'type-title',
  heading: 'type-heading',
  body: 'type-body',
  secondary: 'type-secondary',
  control: 'type-control',
  badge: 'type-badge',
  code: 'type-code',
  'code-block': 'type-code-block',
  'nav-title': 'type-nav-title',
  'nav-action': 'type-nav-action',
} as const;

const TextClassContext = React.createContext<string | undefined>(undefined);

type TextProps = Omit<React.ComponentProps<typeof RNText>, 'role'> &
  React.RefAttributes<RNText> & {
    role?: keyof typeof textRoles;
    semanticRole?: React.ComponentProps<typeof RNText>['role'];
    'aria-level'?: number;
    asChild?: boolean;
  };

function textClassName(
  { role, className }: Pick<TextProps, 'role' | 'className'>,
  inherited?: string,
): string {
  return cn(
    'text-foreground web:select-text',
    role === undefined && 'type-body',
    inherited,
    role && textRoles[role],
    className,
  );
}

function Text(options: TextProps): ReactElement {
  const { className, asChild, role, semanticRole, ...props } = options;
  const textClass = React.useContext(TextClassContext);
  const Component = asChild ? Slot : RNText;
  return React.createElement(Component, {
    className: textClassName({ role, className }, textClass),
    role: semanticRole,
    ...props,
  });
}

export { Text, TextClassContext };
