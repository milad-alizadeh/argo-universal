import type { ReactElement } from 'react';
import { Pressable } from 'react-native';
import { ContextActions } from '#primitives/actions/action-list';
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
      <Pressable
        role="button"
        onPress={props.onPress}
        android_ripple={ripple}
        className={pressClass(props)}
      >
        {props.children}
      </Pressable>
    </SurfaceMaterial>
  );
}
