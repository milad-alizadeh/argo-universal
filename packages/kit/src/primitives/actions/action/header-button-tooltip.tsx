import type { ReactElement } from 'react';
import { Platform } from 'react-native';
import type { TriggerElement } from '#primitives/overlays/open-state';
import { Tooltip } from '#primitives/overlays/tooltip';

/*
 * An icon-only header button says nothing until it is pointed at. On the web, and the desktop drawn with it, each one
 * carries its own label as a Tooltip; a touch platform has no hover, so it draws the button alone.
 */
export function HeaderButtonTooltip(props: {
  label: string;
  children: NonNullable<TriggerElement>;
}): ReactElement {
  if (Platform.OS !== 'web') return props.children;

  return <Tooltip label={props.label}>{props.children}</Tooltip>;
}
