import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Icon } from '#primitives/content/icon';
import type { HeaderProps } from './list-section-parts';

const disclosureIcon = (
  isExpanded?: boolean,
): 'chevron-right' | 'chevron-down' =>
  isExpanded === false ? 'chevron-right' : 'chevron-down';

function disclosure(props: HeaderProps): ReactNode {
  if (!props.onExpandedChange) return null;

  return <Icon name={disclosureIcon(props.isExpanded)} />;
}

function leadingIcon(props: HeaderProps): ReactNode {
  return props.leading === undefined ? disclosure(props) : props.leading;
}

// The leading icon sits 8 before the title, in the label's colour, the actions' size; a sidebar's 16 glyph sits 6 before it.
const leadingSlot = (sidebar?: boolean): string =>
  sidebar
    ? 'mr-1.5 h-6 w-4 shrink-0 items-center justify-center'
    : 'h-6 wide-type:h-5 shrink-0 flex-row items-center pr-1';

export function HeaderLeading(props: HeaderProps): ReactNode {
  const icon = leadingIcon(props);

  return icon ? (
    <View className={leadingSlot(props.sidebar)}>{icon}</View>
  ) : null;
}
