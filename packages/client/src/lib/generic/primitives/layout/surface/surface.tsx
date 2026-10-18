import {
  cloneElement,
  isValidElement,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from 'react';
import { Pressable } from 'react-native';
import { cn } from '#lib/generic/utils';
import type { ActionListProps } from '#primitives/actions/action-list';
import { usePressRipple } from '#primitives/native/material-palette';
import type { ContextMenuTriggerProps } from '#primitives/overlays/menu';
import { SurfaceMaterial } from './surface-material';
import type { SurfaceProps } from './surface-props';
import { paddingClass } from './surface-styles';

export type { SurfaceProps } from './surface-props';

export function Surface(props: SurfaceProps): ReactElement {
  const content = props.onPress ? (
    <PressableSurface {...props} />
  ) : (
    <SurfaceMaterial {...props} />
  );

  return withActions(props.actions, content);
}

function withActions(
  actions: ReactNode,
  trigger: ReactElement<ContextMenuTriggerProps>,
): ReactElement {
  if (!isValidElement<ActionListProps>(actions)) return trigger;

  return cloneElement(actions, { variant: 'context', trigger });
}

const cornerClass = {
  background: '',
  card: 'rounded-2xl',
  muted: 'rounded-xl',
  glass: 'rounded-2xl',
};

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
