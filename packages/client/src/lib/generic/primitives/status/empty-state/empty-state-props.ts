import type { ReactElement } from 'react';
import type { ButtonProps } from '#primitives/actions/button';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactElement<ButtonProps>;
  testID?: string;
}
