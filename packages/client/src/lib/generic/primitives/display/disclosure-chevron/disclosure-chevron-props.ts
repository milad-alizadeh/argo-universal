import type { IconRole } from '../../../symbols/icon-role';

export interface DisclosureChevronProps {
  // Turns the chevron down when its section is open; leave it out for a row that opens another page.
  open?: boolean;
  // Where the chevron sits; beside Body text by default.
  role?: IconRole;
  className?: string;
}
