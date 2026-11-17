import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

export type SignInProps = KitProps<'SignIn'> & {
  mark?: ReactNode;
  children?: ReactNode;
};
