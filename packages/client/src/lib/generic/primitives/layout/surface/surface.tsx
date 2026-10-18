import type { ComponentProps, ReactElement } from 'react';
import { Pressable } from 'react-native';
import { cn } from '#lib/generic/utils';
import { usePressRipple } from '#primitives/native/material-palette';
import { withSurfaceActions } from './surface-actions';
import { SurfaceMaterial } from './surface-material';
import type { SurfaceProps } from './surface-props';
import { paddingClass, cornerClass } from './surface-styles';

export type { SurfaceProps } from './surface-props';

export function Surface(props: SurfaceProps): ReactElement {
  const content = props.onPress ? (
    <PressableSurface {...props} />
  ) : (
    <SurfaceMaterial {...props} />
  );

  return withSurfaceActions(props.actions, content);
}

function usePressProps(props: SurfaceProps): ComponentProps<typeof Pressable> {
  return {
    role: 'button' as const,
    onPress: props.onPress,
    android_ripple: usePressRipple(),
    className: cn(
      'overflow-hidden web:hover:bg-hover web:active:bg-pressed ios:active:bg-pressed',
      cornerClass[props.kind],
      paddingClass[props.padding ?? 0],
    ),
  };
}

function PressableSurface(props: SurfaceProps): ReactElement {
  const press = usePressProps(props);

  return (
    <SurfaceMaterial {...props} padding={0}>
      <Pressable {...press}>{props.children}</Pressable>
    </SurfaceMaterial>
  );
}
