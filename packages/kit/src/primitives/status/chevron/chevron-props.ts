import type { IconSize } from '../../../symbols/icon-size';

export interface ChevronProps {
  direction: 'up' | 'down' | 'right';
  // Turns the chevron a quarter when its section opens; leave it out for a chevron that stays put.
  open?: boolean;
  // The size of the icon beside the chevron, sm unless it stands beside a row's md icon.
  beside?: IconSize;
  className?: string;
}
