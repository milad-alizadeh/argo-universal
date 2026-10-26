import type { ReactElement } from 'react';
import { View } from 'react-native';
import {
  IconButton,
  type IconButtonProps,
} from '#primitives/actions/icon-button';
import { hasBadge, ItemBadge } from '../../../row-badge';
import type { DeclaredSubmenu } from './action-declarations';

type HeaderTriggerProps = Omit<IconButtonProps, 'accessibilityLabel'> & {
  label: string;
  badge?: DeclaredSubmenu['badge'];
};

/*
 * The ghost button a header menu opens from. The menu clones it with its handlers, which go on to the button; the badge
 * draws over the button's corner and takes no press.
 */
export function HeaderTrigger({
  label,
  badge,
  ...button
}: HeaderTriggerProps): ReactElement {
  return (
    <View>
      <IconButton {...button} accessibilityLabel={label} variant="ghost" />
      <TriggerBadge badge={badge} />
    </View>
  );
}

function TriggerBadge(
  props: Pick<HeaderTriggerProps, 'badge'>,
): ReactElement | null {
  if (!hasBadge(props.badge)) return null;

  return (
    <View pointerEvents="none">
      <ItemBadge badge={props.badge} />
    </View>
  );
}
