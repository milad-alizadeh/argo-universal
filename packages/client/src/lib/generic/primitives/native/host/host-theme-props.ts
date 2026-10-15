import type { ReactNode } from 'react';
import type { NativeTheme } from '#lib/generic/native-theme';

export type HostThemeProps = {
  children: ReactNode;
  colors: Pick<
    NativeTheme['colors'],
    | 'accent'
    | 'foreground'
    | 'primaryForeground'
    | 'card'
    | 'content'
    | 'muted'
    | 'mutedForeground'
    | 'border'
    | 'danger'
  >;
};
