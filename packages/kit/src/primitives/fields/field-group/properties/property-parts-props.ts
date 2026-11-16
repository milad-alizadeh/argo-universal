import type { AvatarProps } from '#primitives/content/avatar';
import type { IconProps } from '#primitives/content/icon';
import type { LinkProps } from '#primitives/content/link';
import type { PillProps } from '#primitives/status/pill';
import type { StatusDotProps } from '#primitives/status/status-dot';

// What every property field takes from its row: the row's title names it, and a Value's own label can say it instead.
export interface PropertyOwnProps {
  title: string;
  accessibilityLabel?: string;
}

type Glyph = IconProps['name'];

// Text, as a Label or a Value's own words say it, after an Icon or the Label's own icon.
export interface PropertyLabelProps extends PropertyOwnProps {
  text: string;
  icon?: Glyph;
}

// A Link, after an Icon.
export interface PropertyLinkProps extends PropertyOwnProps {
  link: Pick<LinkProps, 'label' | 'href' | 'route'>;
  icon?: Glyph;
}

// A StatusDot, and the words after it.
export interface PropertyStatusProps extends PropertyOwnProps {
  text: string;
  tone: StatusDotProps['tone'];
}

// An Avatar, and the name it says.
export interface PropertyAvatarProps extends PropertyOwnProps {
  avatar: AvatarProps;
}

// The Pills of a row, after an Icon.
export interface PropertyPillsProps extends PropertyOwnProps {
  pills: PillProps[];
  icon?: Glyph;
}
