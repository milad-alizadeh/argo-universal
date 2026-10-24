import type { ReactElement } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { ContextActions } from '#primitives/actions/action';
import { usePressRipple } from '#primitives/native/material-palette';
import { SurfaceMaterial } from './surface-material';
import type { SurfaceProps } from './surface-props';
import { pressClass } from './surface-treatment';

export type { SurfaceProps } from './surface-props';

export function Surface(props: SurfaceProps): ReactElement {
  return (
    <ContextActions actions={props.actions}>
      {props.onPress ? (
        <PressableSurface {...props} />
      ) : (
        <SurfaceMaterial {...props} />
      )}
    </ContextActions>
  );
}

function PressableSurface(props: SurfaceProps): ReactElement {
  const ripple = usePressRipple();

  return (
    <SurfaceMaterial {...props} padding={0}>
      <Pressable {...pressLayer(props, ripple)}>{props.children}</Pressable>
    </SurfaceMaterial>
  );
}

const pressLayer = (
  props: SurfaceProps,
  ripple: PressableProps['android_ripple'],
): PressableProps & { className: string } => ({
  role: 'button',
  accessibilityLabel: props.accessibilityLabel,
  onPress: props.onPress,
  android_ripple: ripple,
  className: pressClass(props),
});
