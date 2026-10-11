import type { ReactElement } from 'react';
import { ContentButton } from './button-content';
import type { ButtonProps } from './button-props';

export function Button(props: ButtonProps): ReactElement {
  return <ContentButton {...props} />;
}

export type { ButtonProps } from './button-props';
