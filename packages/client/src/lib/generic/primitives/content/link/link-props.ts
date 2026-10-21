import type { ReactNode } from 'react';
import type { KitProps } from '../../kit-props';

export type LinkProps = KitProps<'Link'> & { children?: ReactNode };
