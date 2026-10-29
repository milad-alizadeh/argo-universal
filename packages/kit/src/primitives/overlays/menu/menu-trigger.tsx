import type { ComponentProps, ReactElement } from 'react';
import type { Pressable } from 'react-native';
import { Pill } from '#primitives/status/pill';
import type { MenuTriggerProps } from './menu-props';
import { IconOnlyMenuTrigger } from './menu-trigger-icon-only';

type OverlayHandlers = Omit<
  ComponentProps<typeof Pressable>,
  'children' | 'className' | 'style' | keyof MenuTriggerProps
>;

export type TriggerProps = MenuTriggerProps & OverlayHandlers;

export function MenuTrigger(props: TriggerProps): ReactElement {
  if (props.iconOnly) return <IconOnlyMenuTrigger {...props} />;

  return (
    <Pill
      {...pillProps(props)}
      variant="control"
      text={props.label}
      disclosure="down"
    />
  );
}

const pillProps = ({
  label: _label,
  ...props
}: TriggerProps): Omit<TriggerProps, 'label'> => props;
