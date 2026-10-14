import type { ComponentType } from 'react';
import { ContentButton } from './button-content';
import { withNarrowLayout } from './button-layout';
import type { ButtonProps } from './button-props';

export const Button = withNarrowLayout(
  ContentButton,
) satisfies ComponentType<ButtonProps>;

export type { ButtonProps } from './button-props';
