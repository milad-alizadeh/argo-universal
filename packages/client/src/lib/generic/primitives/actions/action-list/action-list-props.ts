import type { ContextMenuProps } from '#primitives/overlays/menu';
import type { KitProps } from '../../kit-props';

export type ActionProps = KitProps<'Action'>;

export type ActionSectionProps = KitProps<'ActionList.Section'>;

export type ActionListProps = Omit<KitProps<'ActionList'>, 'trigger'> & {
  trigger?: ContextMenuProps['children'];
  title?: ContextMenuProps['title'];
  preview?: ContextMenuProps['preview'];
  onDoubleClick?: ContextMenuProps['onDoubleClick'];
  // The Plugin renderer marks declarations so reserved shortcuts cannot be claimed.
  plugin?: boolean;
};
